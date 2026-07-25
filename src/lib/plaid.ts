// ───────────────────────────────────────────────────────────────────────────
// Plaid bank auto-sync (Phase 4) — server-only.
//
// Replaces the monthly CSV export ritual: connected accounts sync their
// transactions into the SAME `transactions` table the CSV importer feeds,
// with the same sign convention (+ = spend, − = money in — Plaid's own
// convention, so amounts map 1:1) and the same canonical categories, so
// burn, runway, spend charts, and recurring detection all update with
// zero changes downstream.
//
// Requires env vars (see .env.example): PLAID_CLIENT_ID, PLAID_SECRET,
// PLAID_ENV (sandbox | production). All routes degrade to a clear
// "not configured" message when absent.
//
// Dedup strategy: rows carry Plaid's stable transaction id
// (transactions.plaid_txn_id, unique) so modified/removed events apply
// cleanly. NOTE: Plaid rows and CSV rows use different account_name
// strings, so the cross-source dedup key won't match — once an account
// is connected via Plaid, stop CSV-importing that same account.
// ───────────────────────────────────────────────────────────────────────────

import { Configuration, PlaidApi, PlaidEnvironments, type Transaction as PlaidTransaction } from 'plaid'

export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET)
}

export function getPlaidClient(): PlaidApi {
  const env = process.env.PLAID_ENV === 'production' ? 'production' : 'sandbox'
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
          'PLAID-SECRET': process.env.PLAID_SECRET!,
        },
      },
    }),
  )
}

// Plaid personal_finance_category.primary → the app's canonical categories
// (must stay aligned with canonCategory() in lib/finance/txnAggregate.ts).
const PLAID_CATEGORY_MAP: Record<string, string> = {
  INCOME: 'Income',
  TRANSFER_IN: 'Transfer',
  TRANSFER_OUT: 'Transfer',
  LOAN_PAYMENTS: 'Debt Service',
  BANK_FEES: 'Fees & Adjustments',
  ENTERTAINMENT: 'Entertainment',
  FOOD_AND_DRINK: 'Food & Dining',
  GENERAL_MERCHANDISE: 'Shopping',
  HOME_IMPROVEMENT: 'Shopping',
  MEDICAL: 'Health & Wellness',
  PERSONAL_CARE: 'Personal',
  GENERAL_SERVICES: 'Business Services',
  GOVERNMENT_AND_NON_PROFIT: 'Other',
  TRANSPORTATION: 'Transportation',
  TRAVEL: 'Travel',
  RENT_AND_UTILITIES: 'Bills & Utilities',
}

function mapCategory(txn: PlaidTransaction): string {
  const pfc = txn.personal_finance_category
  if (pfc?.detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT') return 'Card Payment'
  return (pfc?.primary && PLAID_CATEGORY_MAP[pfc.primary]) || 'Other'
}

export interface DbPlaidItem {
  id: string
  user_id: string
  item_id: string
  access_token: string
  institution_name: string | null
  sync_cursor: string | null
  account_map: Record<string, string>
  status: string
  last_synced_at: string | null
  last_error: string | null
}

export interface SyncResult {
  institution: string
  added: number
  modified: number
  removed: number
  error?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toRow(userId: string, txn: PlaidTransaction, accountMap: Record<string, string>) {
  const merchant = txn.merchant_name || txn.name || 'Unknown'
  const category = mapCategory(txn)
  return {
    user_id: userId,
    transaction_date: txn.date,
    date: txn.date, // legacy NOT NULL column — mirror transaction_date
    merchant,
    amount: txn.amount, // Plaid: + = money out, − = money in — same as ours
    category,
    account_name: accountMap[txn.account_id] ?? 'Plaid Account',
    is_income: category === 'Income',
    raw_description: txn.name ?? merchant,
    plaid_txn_id: txn.transaction_id,
  }
}

/**
 * Incrementally sync one connected institution via /transactions/sync.
 * Pending transactions are skipped — they'd churn (amount/name changes)
 * and the dashboard only needs settled reality.
 */
export async function syncPlaidItem(service: any, item: DbPlaidItem): Promise<SyncResult> {
  const client = getPlaidClient()
  const institution = item.institution_name ?? 'Bank'
  let added = 0, modified = 0, removed = 0
  let cursor = item.sync_cursor ?? undefined

  try {
    for (;;) {
      const { data } = await client.transactionsSync({
        access_token: item.access_token,
        cursor,
        count: 500,
      })

      const addedRows = data.added.filter(t => !t.pending).map(t => toRow(item.user_id, t, item.account_map))
      if (addedRows.length > 0) {
        const { error } = await service.from('transactions').upsert(addedRows, { onConflict: 'plaid_txn_id' })
        if (error) throw new Error(`insert: ${error.message}`)
        added += addedRows.length
      }

      for (const t of data.modified.filter(t => !t.pending)) {
        const row = toRow(item.user_id, t, item.account_map)
        const { error } = await service.from('transactions').upsert(row, { onConflict: 'plaid_txn_id' })
        if (error) throw new Error(`modify: ${error.message}`)
        modified++
      }

      const removedIds = data.removed.map(r => r.transaction_id).filter(Boolean)
      if (removedIds.length > 0) {
        const { error } = await service.from('transactions').delete().in('plaid_txn_id', removedIds)
        if (error) throw new Error(`remove: ${error.message}`)
        removed += removedIds.length
      }

      cursor = data.next_cursor
      if (!data.has_more) break
    }

    await service.from('plaid_items').update({
      sync_cursor: cursor,
      last_synced_at: new Date().toISOString(),
      last_error: null,
      status: 'active',
    }).eq('id', item.id)

    // Auto-update liquid cash: assets.cash previously had to be told to
    // Claude by hand. If this item carries checking accounts, write their
    // combined live balance into the assets setting — the runway
    // projection reads it directly. (Best-effort: a balance hiccup must
    // not fail a successful transaction sync.)
    try {
      const { data: bal } = await client.accountsBalanceGet({ access_token: item.access_token })
      const checking = bal.accounts.filter(a => a.type === 'depository' && a.subtype === 'checking')
      if (checking.length > 0) {
        const cash = checking.reduce((s, a) => s + (a.balances.available ?? a.balances.current ?? 0), 0)
        const { data: row } = await service.from('financial_settings').select('id, value').eq('key', 'assets').single()
        if (row) {
          await service.from('financial_settings').update({
            value: { ...row.value, cash: Math.round(cash * 100) / 100 },
            updated_at: new Date().toISOString(),
          }).eq('id', row.id)
        }
      }
    } catch (err) {
      console.warn('[plaid] balance refresh failed (sync still ok):', err)
    }

    return { institution, added, modified, removed }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // ITEM_LOGIN_REQUIRED etc. — mark so the UI can prompt a re-link
    await service.from('plaid_items').update({
      last_error: msg,
      status: msg.includes('ITEM_LOGIN_REQUIRED') ? 'login_required' : 'error',
    }).eq('id', item.id)
    return { institution, added, modified, removed, error: msg }
  }
}

/** Sync every active item (optionally scoped to one user). */
export async function syncAllPlaidItems(service: any, userId?: string): Promise<SyncResult[]> {
  let query = service.from('plaid_items').select('*').neq('status', 'disabled')
  if (userId) query = query.eq('user_id', userId)
  const { data: items, error } = await query
  if (error) throw new Error(error.message)

  const results: SyncResult[] = []
  for (const item of (items ?? []) as DbPlaidItem[]) {
    results.push(await syncPlaidItem(service, item))
  }
  return results
}
/* eslint-enable @typescript-eslint/no-explicit-any */
