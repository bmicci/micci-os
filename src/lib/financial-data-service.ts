// Financial Data Service
// Fetches from Supabase with graceful per-table fallback to hardcoded data.
// All Supabase row shapes are mapped to component-facing types here —
// zero changes needed in any component or chart file.

import { createServiceClient } from './supabase/service'
import type { DbDebtAccount, DbFinancialModule, DbSubscription, DbBudgetCategory, DbDeadline, DbPromoDeadline } from './supabase/types'
import {
  type FinancialData,
  type DebtAccount,
  type FinancialModule,
  type Subscription,
  type EssentialBill,
  type SpendingCategory,
  type Deadline,
  type PromoDeadline,
  getAllData,
  MODULES,
  DEADLINES,
  ACTION_ITEMS,
  PROMOS,
  BILLS,
  BURN_RATE,
  HELOC_ACCOUNTS,
  WEALTH_SCENARIOS,
  TOP_ACTIONS,
  TAX_SNAPSHOT,
  SPENDING_CATEGORIES,
} from './financial-data'

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapAccountType(dbType: string): DebtAccount['category'] {
  const map: Record<string, DebtAccount['category']> = {
    credit_card: 'Credit Card',
    loan: 'Personal Loan',
    mortgage: 'Mortgage',
    heloc: 'Personal Loan',
    line_of_credit: 'Personal Loan',
    other: 'Personal Loan',
  }
  return map[dbType] ?? 'Personal Loan'
}

function mapDecision(notes: string | null, rate: number): DebtAccount['decision'] {
  if (notes) {
    const lower = notes.toLowerCase()
    if (lower.includes('roll') || lower.includes('heloc')) return 'roll'
    if (lower.includes('promo') || lower.includes('0%') || lower.includes('hold')) return 'promo'
  }
  // Fallback: rate-based logic
  if (rate === 0) return 'promo'
  if (rate > 6.85) return 'roll'
  return 'keep'
}

function mapDebtAccount(row: DbDebtAccount): DebtAccount {
  const rate = Number(row.interest_rate ?? 0)
  return {
    name: row.name,
    balance: Number(row.balance),
    rate,
    min: row.minimum_payment != null ? Number(row.minimum_payment) : null,
    decision: mapDecision(row.notes, rate),
    category: mapAccountType(row.account_type),
  }
}

function mapModuleStatus(dbStatus: string): FinancialModule['status'] {
  const map: Record<string, FinancialModule['status']> = {
    complete: 'done',
    in_progress: 'progress',
    not_started: 'pending',
    active: 'progress',
  }
  return map[dbStatus] ?? 'pending'
}

function mapFinancialModule(row: DbFinancialModule, index: number): FinancialModule {
  // Use hardcoded module details as fallback when Supabase details column is null/empty
  const fallback = MODULES.find(m => m.name === row.name) ?? MODULES[index]
  return {
    id: index + 1,
    supabaseId: row.id,
    name: row.name,
    status: mapModuleStatus(row.status),
    pct: row.progress,
    desc: row.description ?? fallback?.desc ?? '',
    docsHave: row.details?.docsHave?.length ? row.details.docsHave : (fallback?.docsHave ?? []),
    docsMissing: row.details?.docsMissing?.length ? row.details.docsMissing : (fallback?.docsMissing ?? []),
    actions: row.details?.actions?.length ? row.details.actions : (fallback?.actions ?? []),
  }
}

function mapToSubscription(row: DbSubscription): Subscription {
  return {
    name: row.name,
    mo: Number(row.amount),
    reason: row.notes ?? '',
  }
}

function mapToEssentialBill(row: DbSubscription): EssentialBill {
  const mo = Number(row.amount)
  return {
    name: row.name,
    mo,
    yr: Math.round(mo * 12 * 100) / 100,
    note: row.notes ?? '',
  }
}

function mapSpendingCategory(row: DbBudgetCategory): SpendingCategory {
  // Derive a stable color from the category name when not stored
  const COLOR_MAP: Record<string, string> = {
    'Food & Dining': '#ef4444',
    'Shopping/Retail': '#f59e0b',
    Housing: '#3b82f6',
    Health: '#22c55e',
    Insurance: '#8b5cf6',
    Transportation: '#06b6d4',
    Other: '#64748b',
    Travel: '#ec4899',
    Subscriptions: '#eab308',
    'Debt Service': '#be123c',
    Entertainment: '#6366f1',
  }
  const annual = Number(row.annual_actual ?? 0)
  const monthly = Number(row.monthly_actual ?? Math.round((annual / 12) * 100) / 100)
  const survival = Number(row.survival_budget ?? 0)
  const pct = Number(row.pct_of_total ?? 0)
  const color = row.color ?? COLOR_MAP[row.name] ?? '#64748b'
  return { cat: row.name, annual, monthly, survival, pct, color }
}

function mapDeadline(row: DbDeadline): Deadline {
  // Format date as "Mon D, YYYY" to match the hardcoded style
  const d = new Date(row.deadline_date + 'T00:00:00')
  const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  // Derive a risk label from urgency + impact_if_missed
  const riskLabel = row.impact_if_missed ?? (
    row.urgency === 'critical' ? '🚨 Critical' :
    row.urgency === 'high'     ? '⚠️ Hard deadline' :
    row.urgency === 'medium'   ? '⚠️ Deadline' :
                                 '✅ Low urgency'
  )
  return {
    date: formatted,
    event: row.title,
    amount: (row as DbDeadline & { amount?: number | null }).amount ?? null,
    risk: riskLabel,
  }
}

function mapPromoDeadline(row: DbPromoDeadline): PromoDeadline {
  return {
    name: row.name,
    acct: row.account_name,
    balance: Number(row.balance),
    expires: row.expires_date,
    risk: row.deferred_interest_risk != null ? Number(row.deferred_interest_risk) : null,
    note: row.notes ?? '',
  }
}

// Canonical module order — matches M1–M9 numbering
const MODULE_ORDER: Record<string, number> = {
  'Spending Analysis': 1,
  'Subscription Audit': 2,
  'Tax Prep': 3,
  'Debt Inventory & HELOC': 4,
  '401(k) Review': 5,
  'Property Tax Protest (DCAD)': 6,
  'IRS Balance Resolution': 7,
  'Savings & Wealth Plan': 8,
  'Estate Planning': 9,
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function getFinancialData(): Promise<FinancialData> {
  const supabase = createServiceClient()

  if (!supabase) {
    console.warn('[financial-data-service] No Supabase client — using hardcoded data')
    return getAllData()
  }

  try {
    const [
      debtsRes,
      modulesRes,
      cancelSubsRes,
      reviewSubsRes,
      essentialSubsRes,
      spendingCatsRes,
      deadlinesRes,
      promosRes,
    ] = await Promise.all([
      supabase
        .from('debt_accounts')
        .select('*')
        .order('balance', { ascending: false }),
      supabase
        .from('financial_modules')
        .select('*')
        .order('module_number'),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('action', 'cancel')
        .eq('is_active', true)
        .order('amount', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('action', 'review')
        .eq('is_active', true)
        .order('amount', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('action', 'essential')
        .eq('is_active', true)
        .order('amount', { ascending: false }),
      supabase
        .from('budget_categories')
        .select('*')
        .order('annual_actual', { ascending: false, nullsFirst: false }),
      supabase
        .from('deadlines')
        .select('*')
        .order('deadline_date', { ascending: true }),
      supabase
        .from('promo_deadlines')
        .select('*')
        .neq('status', 'paid')
        .order('expires_date', { ascending: true }),
    ])

    const fallback = getAllData()

    // ── Debt accounts ──────────────────────────────────────────────
    const debts: DebtAccount[] =
      debtsRes.data && debtsRes.data.length > 0
        ? (debtsRes.data as DbDebtAccount[]).map(mapDebtAccount)
        : fallback.debts

    // ── Modules — sort by canonical M1–M9 order ────────────────────
    const modules: FinancialModule[] =
      modulesRes.data && modulesRes.data.length > 0
        ? [...(modulesRes.data as DbFinancialModule[])]
            .sort((a, b) => (MODULE_ORDER[a.name] ?? 99) - (MODULE_ORDER[b.name] ?? 99))
            .map(mapFinancialModule)
        : fallback.modules

    // ── Subscriptions — each bucket has its own per-property fallback ──
    const cancelSubs: Subscription[] =
      cancelSubsRes.data && cancelSubsRes.data.length > 0
        ? (cancelSubsRes.data as DbSubscription[]).map(mapToSubscription)
        : fallback.cancelSubs

    const reviewSubs: Subscription[] =
      reviewSubsRes.data && reviewSubsRes.data.length > 0
        ? (reviewSubsRes.data as DbSubscription[]).map(mapToSubscription)
        : fallback.reviewSubs

    const essentialBills: EssentialBill[] =
      essentialSubsRes.data && essentialSubsRes.data.length > 0
        ? (essentialSubsRes.data as DbSubscription[]).map(mapToEssentialBill)
        : fallback.essentialBills

    // ── Spending categories ────────────────────────────────────────
    const spendingCategories: SpendingCategory[] =
      spendingCatsRes.data && spendingCatsRes.data.length > 0
        ? (spendingCatsRes.data as DbBudgetCategory[]).map(mapSpendingCategory)
        : SPENDING_CATEGORIES

    // ── Deadlines ──────────────────────────────────────────────────
    const deadlines: Deadline[] =
      deadlinesRes.data && deadlinesRes.data.length > 0
        ? (deadlinesRes.data as DbDeadline[]).map(mapDeadline)
        : DEADLINES

    // ── Promo deadlines ────────────────────────────────────────────
    const promos: PromoDeadline[] =
      promosRes.data && promosRes.data.length > 0
        ? (promosRes.data as DbPromoDeadline[]).map(mapPromoDeadline)
        : PROMOS

    // Log any fetch errors at warning level (don't throw — fallbacks handle it)
    if (debtsRes.error)        console.warn('[financial-data-service] debt_accounts:', debtsRes.error.message)
    if (modulesRes.error)      console.warn('[financial-data-service] financial_modules:', modulesRes.error.message)
    if (cancelSubsRes.error)   console.warn('[financial-data-service] subscriptions (cancel):', cancelSubsRes.error.message)
    if (reviewSubsRes.error)   console.warn('[financial-data-service] subscriptions (review):', reviewSubsRes.error.message)
    if (essentialSubsRes.error) console.warn('[financial-data-service] subscriptions (essential):', essentialSubsRes.error.message)
    if (spendingCatsRes.error) console.warn('[financial-data-service] budget_categories:', spendingCatsRes.error.message)
    if (deadlinesRes.error)    console.warn('[financial-data-service] deadlines:', deadlinesRes.error.message)
    if (promosRes.error)       console.warn('[financial-data-service] promo_deadlines:', promosRes.error.message)

    return {
      debts,
      modules,
      cancelSubs,
      reviewSubs,
      essentialBills,
      spendingCategories,
      deadlines,
      promos,
      // Hardcoded — editorial/config data, rarely changes
      actionItems: ACTION_ITEMS,
      bills: BILLS,
      burnRate: BURN_RATE,
      helocAccounts: HELOC_ACCOUNTS,
      wealthScenarios: WEALTH_SCENARIOS,
      topActions: TOP_ACTIONS,
      taxSnapshot: TAX_SNAPSHOT,
    }
  } catch (err) {
    console.error('[financial-data-service] Unexpected error, falling back:', err)
    return getAllData()
  }
}

// ── Snapshot balances ─────────────────────────────────────────────────────────
// Reads all debt_accounts and upserts one row per account into balance_snapshots
// with today's date. Called by the import API after updating balances.

export async function snapshotCurrentBalances(): Promise<void> {
  const supabase = createServiceClient()

  if (!supabase) {
    console.warn('[financial-data-service] snapshotCurrentBalances: no Supabase client')
    return
  }

  const { data: accounts, error: fetchErr } = await supabase
    .from('debt_accounts')
    .select('name, balance')

  if (fetchErr) {
    console.error('[financial-data-service] snapshotCurrentBalances fetch error:', fetchErr.message)
    return
  }

  if (!accounts || accounts.length === 0) return

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const rows = (accounts as { name: string; balance: number }[]).map(a => ({
    account_name: a.name,
    balance: Number(a.balance),
    snapshot_date: today,
    source: 'import',
  }))

  const { error: upsertErr } = await supabase
    .from('balance_snapshots')
    .upsert(rows, { onConflict: 'account_name,snapshot_date' })

  if (upsertErr) {
    console.error('[financial-data-service] snapshotCurrentBalances upsert error:', upsertErr.message)
  } else {
    console.log(`[financial-data-service] snapshotCurrentBalances: wrote ${rows.length} rows for ${today}`)
  }
}
