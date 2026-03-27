// Financial Data Service
// Fetches from Supabase with graceful per-table fallback to hardcoded data.
// All Supabase row shapes are mapped to component-facing types here —
// zero changes needed in any component or chart file.

import { createServiceClient } from './supabase/service'
import type { DbDebtAccount, DbFinancialModule, DbSubscription } from './supabase/types'
import {
  type FinancialData,
  type DebtAccount,
  type FinancialModule,
  type Subscription,
  type EssentialBill,
  type TransactionSummary,
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
    const [debtsRes, modulesRes, subsRes, txnRes] = await Promise.all([
      supabase.from('debt_accounts').select('*').order('balance', { ascending: true }),
      supabase.from('financial_modules').select('*'),
      supabase.from('subscriptions').select('*').eq('is_active', true),
      supabase.from('transactions').select('transaction_date, amount, category, is_credit').eq('is_credit', false),
    ])

    const fallback = getAllData()

    // Debt accounts — use Supabase if available and non-empty, otherwise fallback
    const debts: DebtAccount[] =
      debtsRes.data && debtsRes.data.length > 0
        ? debtsRes.data.map(mapDebtAccount)
        : fallback.debts

    // Modules — use Supabase if available and non-empty, otherwise fallback
    // Sort by canonical M1–M9 order (not alphabetical)
    const modules: FinancialModule[] =
      modulesRes.data && modulesRes.data.length > 0
        ? [...modulesRes.data]
            .sort((a, b) => (MODULE_ORDER[a.name] ?? 99) - (MODULE_ORDER[b.name] ?? 99))
            .map(mapFinancialModule)
        : fallback.modules

    // Subscriptions — split by action
    const allSubs = subsRes.data as DbSubscription[] | null
    const cancelSubs: Subscription[] =
      allSubs && allSubs.length > 0
        ? allSubs.filter(s => s.action === 'cancel').map(mapToSubscription)
        : fallback.cancelSubs
    const reviewSubs: Subscription[] =
      allSubs && allSubs.length > 0
        ? allSubs.filter(s => s.action === 'review').map(mapToSubscription)
        : fallback.reviewSubs
    const essentialBills: EssentialBill[] =
      allSubs && allSubs.length > 0
        ? allSubs.filter(s => s.action === 'essential').map(mapToEssentialBill)
        : fallback.essentialBills

    // Keep subs
    const keepSubs: Subscription[] =
      allSubs && allSubs.length > 0
        ? allSubs.filter(s => s.action === 'keep').map(mapToSubscription)
        : fallback.keepSubs

    // Spending categories — always hardcoded (Supabase has survival budgets only, not actuals)
    const spendingCategories = SPENDING_CATEGORIES

    // Transaction summary — compute from Supabase if data exists
    let transactionSummary: TransactionSummary = fallback.transactionSummary
    const txnData = txnRes.data
    if (txnData && txnData.length > 0) {
      const totalSpend = txnData.reduce((s, t) => s + Number(t.amount), 0)
      const months = new Set(txnData.map(t => String(t.transaction_date).slice(0, 7)))
      const monthCount = months.size || 1
      const monthlyAvg = totalSpend / monthCount

      // Category totals
      const catMap = new Map<string, number>()
      for (const t of txnData) {
        const cat = t.category || 'Other'
        catMap.set(cat, (catMap.get(cat) || 0) + Number(t.amount))
      }
      const byCategory = Array.from(catMap.entries())
        .map(([category, total]) => ({
          category,
          total: Math.round(total * 100) / 100,
          pct: Math.round((total / totalSpend) * 100),
        }))
        .sort((a, b) => b.total - a.total)

      const top = byCategory[0]

      transactionSummary = {
        totalSpend: Math.round(totalSpend * 100) / 100,
        monthlyAvg: Math.round(monthlyAvg * 100) / 100,
        txnCount: txnData.length,
        monthCount,
        topCategory: top?.category || 'Other',
        topCategoryAmount: top?.total || 0,
        topCategoryPct: top?.pct || 0,
        byCategory,
        hasData: true,
      }
    }

    if (debtsRes.error) console.warn('[financial-data-service] debt_accounts:', debtsRes.error.message)
    if (modulesRes.error) console.warn('[financial-data-service] financial_modules:', modulesRes.error.message)
    if (subsRes.error) console.warn('[financial-data-service] subscriptions:', subsRes.error.message)
    if (txnRes.error) console.warn('[financial-data-service] transactions:', txnRes.error.message)

    return {
      debts,
      modules,
      cancelSubs,
      reviewSubs,
      keepSubs,
      essentialBills,
      spendingCategories,
      transactionSummary,
      // Hardcoded — no Supabase tables for these
      deadlines: DEADLINES,
      actionItems: ACTION_ITEMS,
      promos: PROMOS,
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
