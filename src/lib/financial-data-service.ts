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
  getAllData,
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
  return {
    id: index + 1,
    name: row.name,
    status: mapModuleStatus(row.status),
    pct: row.progress,
    desc: row.description ?? '',
    docsHave: row.details?.docsHave ?? [],
    docsMissing: row.details?.docsMissing ?? [],
    actions: row.details?.actions ?? [],
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

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function getFinancialData(): Promise<FinancialData> {
  const supabase = createServiceClient()

  if (!supabase) {
    console.warn('[financial-data-service] No Supabase client — using hardcoded data')
    return getAllData()
  }

  try {
    const [debtsRes, modulesRes, subsRes] = await Promise.all([
      supabase.from('debt_accounts').select('*').order('balance', { ascending: true }),
      supabase.from('financial_modules').select('*').order('name'),
      supabase.from('subscriptions').select('*').eq('is_active', true),
    ])

    const fallback = getAllData()

    // Debt accounts — use Supabase if available and non-empty, otherwise fallback
    const debts: DebtAccount[] =
      debtsRes.data && debtsRes.data.length > 0
        ? debtsRes.data.map(mapDebtAccount)
        : fallback.debts

    // Modules — use Supabase if available and non-empty, otherwise fallback
    const modules: FinancialModule[] =
      modulesRes.data && modulesRes.data.length > 0
        ? modulesRes.data.map(mapFinancialModule)
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

    // Spending categories — always hardcoded (Supabase has survival budgets only, not actuals)
    const spendingCategories = SPENDING_CATEGORIES

    if (debtsRes.error) console.warn('[financial-data-service] debt_accounts:', debtsRes.error.message)
    if (modulesRes.error) console.warn('[financial-data-service] financial_modules:', modulesRes.error.message)
    if (subsRes.error) console.warn('[financial-data-service] subscriptions:', subsRes.error.message)

    return {
      debts,
      modules,
      cancelSubs,
      reviewSubs,
      essentialBills,
      spendingCategories,
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
