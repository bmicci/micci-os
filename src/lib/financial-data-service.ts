// Financial Data Service
// Fetches from Supabase with graceful per-table fallback to hardcoded data.
// All Supabase row shapes are mapped to component-facing types here —
// zero changes needed in any component or chart file.

import { createServiceClient } from './supabase/service'
import type { DbDebtAccount, DbFinancialModule, DbSubscription, DbBudgetCategory } from './supabase/types'
import {
  type FinancialData,
  type DebtAccount,
  type FinancialModule,
  type Subscription,
  type EssentialBill,
  type SpendingCategory,
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
} from './financial-data'

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapAccountType(dbType: string): DebtAccount['category'] {
  const map: Record<string, DebtAccount['category']> = {
    credit_card: 'Credit Card',
    loan: 'Personal Loan',
    mortgage: 'Mortgage',
    heloc: 'Personal Loan',
    other: 'Personal Loan',
  }
  return map[dbType] ?? 'Personal Loan'
}

function mapDecision(recommendation: string | null): DebtAccount['decision'] {
  if (!recommendation) return 'keep'
  const lower = recommendation.toLowerCase()
  if (lower.includes('roll') || lower.includes('heloc')) return 'roll'
  if (lower.includes('promo') || lower.includes('0%')) return 'promo'
  return 'keep'
}

function mapDebtAccount(row: DbDebtAccount): DebtAccount {
  return {
    name: row.name,
    balance: Number(row.balance),
    rate: Number(row.interest_rate),
    min: row.minimum_payment != null ? Number(row.minimum_payment) : null,
    decision: mapDecision(row.recommendation),
    category: mapAccountType(row.account_type),
  }
}

function mapModuleStatus(dbStatus: string): FinancialModule['status'] {
  const map: Record<string, FinancialModule['status']> = {
    complete: 'done',
    in_progress: 'progress',
    not_started: 'pending',
  }
  return map[dbStatus] ?? 'pending'
}

function mapFinancialModule(row: DbFinancialModule): FinancialModule {
  return {
    id: row.module_number,
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

function mapBudgetCategory(row: DbBudgetCategory): SpendingCategory {
  return {
    cat: row.name,
    annual: Number(row.annual_actual ?? 0),
    monthly: Number(row.monthly_actual ?? 0),
    survival: Number(row.survival_budget ?? 0),
    pct: Number(row.pct_of_total ?? 0),
    color: row.color ?? '#64748b',
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
    const [debtsRes, modulesRes, subsRes, budgetRes] = await Promise.all([
      supabase.from('debt_accounts').select('*').order('balance', { ascending: false }),
      supabase.from('financial_modules').select('*').order('module_number'),
      supabase.from('subscriptions').select('*').eq('is_active', true),
      supabase.from('budget_categories').select('*'),
    ])

    const fallback = getAllData()

    // NOTE: All Supabase tables were seeded with demo data and need to be re-seeded.
    // Run supabase/seed.sql against your project to populate correct data.
    // Until then, hardcoded data is used for all tables.
    // TODO: Re-enable Supabase reads after running seed.sql:
    //   const debts = debtsRes.data ? debtsRes.data.map(mapDebtAccount) : fallback.debts
    //   const modules = modulesRes.data ? modulesRes.data.map(mapFinancialModule) : fallback.modules
    //   const allSubs = subsRes.data as DbSubscription[] | null
    //   const cancelSubs = allSubs ? allSubs.filter(s => s.action === 'cancel').map(mapToSubscription) : fallback.cancelSubs
    //   const reviewSubs = allSubs ? allSubs.filter(s => s.action === 'review').map(mapToSubscription) : fallback.reviewSubs
    //   const essentialBills = allSubs ? allSubs.filter(s => s.action === 'essential').map(mapToEssentialBill) : fallback.essentialBills

    const debts: DebtAccount[] = fallback.debts
    const modules: FinancialModule[] = fallback.modules
    const cancelSubs: Subscription[] = fallback.cancelSubs
    const reviewSubs: Subscription[] = fallback.reviewSubs
    const essentialBills: EssentialBill[] = fallback.essentialBills
    // budget_categories holds survival budget planning, not 2025 actual CC spend
    const spendingCategories: SpendingCategory[] = fallback.spendingCategories

    if (debtsRes.error) console.warn('[financial-data-service] debt_accounts:', debtsRes.error.message)
    if (modulesRes.error) console.warn('[financial-data-service] financial_modules:', modulesRes.error.message)
    if (subsRes.error) console.warn('[financial-data-service] subscriptions:', subsRes.error.message)
    if (budgetRes.error) console.warn('[financial-data-service] budget_categories:', budgetRes.error.message)

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
