// Financial Data Service
// Fetches from Supabase with graceful per-table fallback to hardcoded data.
// All Supabase row shapes are mapped to component-facing types here —
// zero changes needed in any component or chart file.

import { createServiceClient } from './supabase/service'
import { liveSpendCategories, type TxnRow } from './finance/txnAggregate'
import type {
  DbDebtAccount,
  DbFinancialModule,
  DbSubscription,
  DbBudgetCategory,
  DbBill,
  DbBurnRateItem,
  DbPromoDeadline,
  DbTaxSnapshot,
  DbWealthScenario,
  DbFinancialSetting,
} from './supabase/types'
import {
  type FinancialData,
  type DebtAccount,
  type FinancialModule,
  type Subscription,
  type EssentialBill,
  type SpendingCategory,
  type Bill,
  type BurnRateItem,
  type PromoDeadline,
  type TaxSnapshot,
  type WealthScenario,
  type ActionItem,
  type TopAction,
  type IncomeBridge,
  type SpendingSummary,
  type SubscriptionSummary,
  type PropertyTaxConfig,
  type Assets,
  type InvestmentData,
  type InvestmentAccount,
  type TaxLot,
  type InvestmentTransaction,
  EMPTY_INVESTMENT_DATA,
  getAllData,
  deriveHelocAccounts,
  computeHelocKPIs,
  computeWaterfall,
  HELOC_RATE,
  MODULES,
  DEADLINES,
  ACTION_ITEMS,
  PROMOS,
  BILLS,
  BURN_RATE,
  WEALTH_SCENARIOS,
  TOP_ACTIONS,
  TAX_SNAPSHOT,
  SPENDING_CATEGORIES,
  INCOME_BRIDGE,
  SPENDING_SUMMARY,
  SUBSCRIPTION_SUMMARY,
  PROPERTY_TAX,
  ASSETS as ASSETS_FALLBACK,
} from './financial-data'

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapAccountType(dbType: string): DebtAccount['category'] {
  const map: Record<string, DebtAccount['category']> = {
    credit_card: 'Credit Card',
    loan: 'Personal Loan',
    mortgage: 'Mortgage',
    heloc: 'HELOC',
    line_of_credit: 'Personal Loan',
    other: 'Personal Loan',
  }
  return map[dbType] ?? 'Personal Loan'
}

// Keyword order matters: promo notes often say "pay from HELOC", so keep/promo
// checks must win before the bare 'roll' check.
function mapDecision(notes: string | null, rate: number): DebtAccount['decision'] {
  if (notes) {
    const lower = notes.toLowerCase()
    if (lower.includes('keep') || lower.includes('do not roll')) return 'keep'
    if (lower.includes('promo') || lower.includes('0%') || lower.includes('hold') || lower.includes('pay by') || lower.includes('pay from heloc')) return 'promo'
    if (lower.includes('roll')) return 'roll'
  }
  if (rate === 0) return 'promo'
  if (rate > HELOC_RATE) return 'roll'
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

function mapBudgetCategory(row: DbBudgetCategory): SpendingCategory {
  return {
    cat: row.name,
    monthly: Number(row.monthly_actual ?? 0),
    annual: Number(row.annual_actual ?? 0),
    survival: Number(row.survival_budget ?? 0),
    pct: Number(row.pct_of_total ?? 0),
    color: row.color ?? '#64748b',
  }
}

function mapBill(row: DbBill): Bill {
  return {
    date: row.due_date,
    payee: row.payee,
    amount: Number(row.amount),
    type: row.bill_type,
    status: row.status,
    note: row.note ?? '',
  }
}

function mapBurnRateItem(row: DbBurnRateItem): BurnRateItem {
  return {
    label: row.label,
    current: Number(row.current_amount),
    survival: Number(row.survival_amount),
    note: row.note ?? '',
  }
}

function mapPromoDeadline(row: DbPromoDeadline): PromoDeadline {
  return {
    name: row.name,
    balance: Number(row.balance),
    expires: row.expires,
    risk: row.deferred_interest != null ? Number(row.deferred_interest) : null,
    acct: row.account_name,
    note: row.note ?? '',
  }
}

function mapTaxSnapshot(row: DbTaxSnapshot): TaxSnapshot {
  return {
    w2Income: Number(row.w2_income),
    federalWithheld: Number(row.federal_withheld),
    scenarioA: {
      label: row.scenario_a_label,
      owed: Number(row.scenario_a_owed),
      note: row.scenario_a_note ?? '',
    },
    scenarioB: {
      label: row.scenario_b_label,
      owed: Number(row.scenario_b_owed),
      note: row.scenario_b_note ?? '',
    },
    keyItems: Array.isArray(row.key_items) ? row.key_items : [],
    filingDeadline: row.filing_deadline,
    caveat: row.caveat ?? '',
    propertyTaxDetails: Array.isArray(row.property_tax_details) ? row.property_tax_details : [],
  }
}

function mapWealthScenario(row: DbWealthScenario): WealthScenario {
  return {
    name: row.name,
    pmt: Number(row.annual_savings),
    r: Number(row.return_rate),
    color: row.color,
    label: row.label ?? '',
  }
}

function mapIncomeBridge(val: Record<string, unknown>): IncomeBridge {
  return {
    liquidCash: Number(val.liquid_cash ?? 0),
    marchPaychecks: Number(val.march_paychecks ?? 0),
    severanceEstimate: Number(val.severance_estimate ?? 0),
    familyBridge: Number(val.family_bridge ?? 0),
    consultingMonthlyNet: Number(val.consulting_monthly_net ?? 0),
    targetSalary: Number(val.target_salary ?? 0),
    targetTotalComp: Number(val.target_total_comp ?? 0),
    monthlyOutflow: Number(val.monthly_outflow ?? 0),
    newJobMonthlyNet: Number(val.new_job_monthly_net ?? 0),
  }
}

function mapSpendingSummary(val: Record<string, unknown>): SpendingSummary {
  return {
    totalAnnualCC: Number(val.total_annual_cc ?? 0),
    totalMonthlyAvg: Number(val.total_monthly_avg ?? 0),
    totalTransactions: Number(val.total_transactions ?? 0),
    topCategory: String(val.top_category ?? ''),
    topCategoryAmount: Number(val.top_category_amount ?? 0),
    topCategoryPct: Number(val.top_category_pct ?? 0),
    survivalMonthly: Number(val.survival_monthly ?? 0),
    cardsAnalyzed: String(val.cards_analyzed ?? ''),
  }
}

function mapSubscriptionSummary(val: Record<string, unknown>): SubscriptionSummary {
  return {
    totalRecurringMerchants: Number(val.total_recurring_merchants ?? 0),
    keepTotalMonthly: Number(val.keep_total_monthly ?? 0),
    keepCount: Number(val.keep_count ?? 0),
  }
}

function mapPropertyTax(val: Record<string, unknown>): PropertyTaxConfig {
  return {
    address: String(val.address ?? ''),
    assessedValue: Number(val.assessed_value ?? 850000),
    protestTarget: Number(val.protest_target ?? 750000),
    annualTotal: Number(val.annual_total ?? 0),
    monthlyBudget: Number(val.monthly_budget ?? 0),
    protestSavingsEstimate: Number(val.protest_savings_estimate ?? 0),
    protestDeadline: String(val.protest_deadline ?? ''),
    taxesPaid: Boolean(val.taxes_paid ?? false),
  }
}

function mapAssets(val: Record<string, unknown>): Assets {
  return {
    home: Number(val.home ?? 850000),
    retirement: Number(val.retirement ?? 0),
    brokerage: Number(val.brokerage ?? 0),
    cash: Number(val.cash ?? 0),
    savings: Number(val.savings ?? 0),
    vehicles: Number(val.vehicles ?? 0),
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

// Helper to get a setting by key from the settings array
function getSetting(settings: DbFinancialSetting[] | null, key: string): unknown | null {
  if (!settings) return null
  const row = settings.find(s => s.key === key)
  return row?.value ?? null
}

// ── Investment mappers ────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapInvestmentAccount(row: any): InvestmentAccount {
  return {
    id: row.id,
    accountName: row.account_name ?? '',
    accountNumber: row.account_number ?? '',
    accountType: row.account_type ?? 'Brokerage',
    institution: row.institution ?? 'Chase',
    totalValue: Number(row.total_value ?? 0),
    totalCost: Number(row.total_cost ?? 0),
    unrealizedGL: Number(row.unrealized_gl ?? 0),
    asOfDate: row.as_of_date ?? null,
  }
}

function mapTaxLot(row: any): TaxLot {
  return {
    id: row.id,
    ticker: row.ticker ?? '',
    cusip: row.cusip ?? null,
    description: row.description ?? null,
    assetClass: row.asset_class ?? null,
    assetStrategy: row.asset_strategy ?? null,
    quantity: Number(row.quantity ?? 0),
    price: row.price != null ? Number(row.price) : null,
    value: row.value != null ? Number(row.value) : null,
    cost: row.cost != null ? Number(row.cost) : null,
    originalCost: row.original_cost != null ? Number(row.original_cost) : null,
    unitCost: row.unit_cost != null ? Number(row.unit_cost) : null,
    unrealizedGL: row.unrealized_gl != null ? Number(row.unrealized_gl) : null,
    unrealizedGLPct: row.unrealized_gl_pct != null ? Number(row.unrealized_gl_pct) : null,
    acquisitionDate: row.acquisition_date ?? null,
    taxTerm: row.tax_term ?? null,
    daysHeld: row.days_held != null ? Number(row.days_held) : null,
    daysUntilLong: row.days_until_long != null ? Number(row.days_until_long) : null,
    estAnnualIncome: row.est_annual_income != null ? Number(row.est_annual_income) : null,
    asOfDate: row.as_of_date ?? null,
  }
}

function mapInvestmentTxn(row: any): InvestmentTransaction {
  return {
    id: row.id,
    tradeDate: row.trade_date ?? '',
    postDate: row.post_date ?? null,
    settlementDate: row.settlement_date ?? null,
    transactionType: row.transaction_type ?? '',
    description: row.description ?? null,
    ticker: row.ticker ?? null,
    cusip: row.cusip ?? null,
    securityType: row.security_type ?? null,
    price: row.price != null ? Number(row.price) : null,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    amount: row.amount != null ? Number(row.amount) : null,
    income: row.income != null ? Number(row.income) : null,
    glShort: row.gl_short != null ? Number(row.gl_short) : null,
    glLong: row.gl_long != null ? Number(row.gl_long) : null,
    tranCode: row.tran_code ?? null,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
      subsRes,
      budgetRes,
      billsRes,
      burnRes,
      promosRes,
      taxRes,
      wealthRes,
      settingsRes,
      invAccountsRes,
      taxLotsRes,
      invTxnsRes,
      txnsRes,
    ] = await Promise.all([
      supabase
        .from('debt_accounts')
        .select('*')
        .gt('balance', 0)
        .order('balance', { ascending: true }),
      supabase.from('financial_modules').select('*'),
      supabase.from('subscriptions').select('*').eq('is_active', true),
      supabase.from('budget_categories').select('*').order('pct_of_total', { ascending: false }),
      supabase.from('bills').select('*').eq('is_active', true),
      supabase.from('burn_rate_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('promo_deadlines').select('*').order('expires', { ascending: true }),
      supabase.from('tax_snapshots').select('*').order('tax_year', { ascending: false }).limit(1),
      supabase.from('wealth_scenarios').select('*').order('sort_order', { ascending: true }),
      supabase.from('financial_settings').select('*'),
      supabase.from('investment_accounts').select('*').order('total_value', { ascending: false }),
      supabase.from('tax_lots').select('*').order('value', { ascending: false }),
      supabase.from('investment_transactions').select('*').order('trade_date', { ascending: false }),
      supabase.from('transactions').select('transaction_date, amount, category'),
    ])

    const fallback = getAllData()

    // ── Debt accounts ────────────────────────────────────────────
    const debts: DebtAccount[] =
      debtsRes.data && debtsRes.data.length > 0
        ? debtsRes.data.map(mapDebtAccount)
        : fallback.debts

    // ── Modules (sorted M1–M9) ───────────────────────────────────
    const modules: FinancialModule[] =
      modulesRes.data && modulesRes.data.length > 0
        ? [...modulesRes.data]
            .sort((a, b) => (MODULE_ORDER[a.name] ?? 99) - (MODULE_ORDER[b.name] ?? 99))
            .map(mapFinancialModule)
        : fallback.modules

    // ── Subscriptions (split by action) ──────────────────────────
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

    // ── Spending categories ──────────────────────────────────────
    // Prefer LIVE data computed from imported transactions (trailing 12 months).
    // Fall back to the budget_categories table, then hardcoded defaults.
    const txns = (txnsRes.data ?? []) as TxnRow[]
    const since12mo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
    const liveCats = txns.length > 0 ? liveSpendCategories(txns, since12mo) : []
    const spendingCategories: SpendingCategory[] =
      liveCats.length > 0
        ? liveCats
        : budgetRes.data && budgetRes.data.length > 0
          ? (budgetRes.data as DbBudgetCategory[]).map(mapBudgetCategory)
          : SPENDING_CATEGORIES

    // ── Bills ────────────────────────────────────────────────────
    const bills: Bill[] =
      billsRes.data && billsRes.data.length > 0
        ? (billsRes.data as DbBill[]).map(mapBill)
        : BILLS

    // ── Burn rate ────────────────────────────────────────────────
    const burnRate: BurnRateItem[] =
      burnRes.data && burnRes.data.length > 0
        ? (burnRes.data as DbBurnRateItem[]).map(mapBurnRateItem)
        : BURN_RATE

    // ── Promo deadlines ──────────────────────────────────────────
    const promos: PromoDeadline[] =
      promosRes.data && promosRes.data.length > 0
        ? (promosRes.data as DbPromoDeadline[]).map(mapPromoDeadline)
        : PROMOS

    // ── Tax snapshot (most recent year) ──────────────────────────
    const taxSnapshot: TaxSnapshot =
      taxRes.data && taxRes.data.length > 0
        ? mapTaxSnapshot(taxRes.data[0] as DbTaxSnapshot)
        : TAX_SNAPSHOT

    // ── Wealth scenarios ─────────────────────────────────────────
    const wealthScenarios: WealthScenario[] =
      wealthRes.data && wealthRes.data.length > 0
        ? (wealthRes.data as DbWealthScenario[]).map(mapWealthScenario)
        : WEALTH_SCENARIOS

    // ── Financial settings (JSONB) ───────────────────────────────
    const settings = settingsRes.data as DbFinancialSetting[] | null

    const actionItemsRaw = getSetting(settings, 'action_items')
    const actionItems: ActionItem[] =
      Array.isArray(actionItemsRaw) ? actionItemsRaw as ActionItem[] : ACTION_ITEMS

    const topActionsRaw = getSetting(settings, 'top_actions')
    const topActions: TopAction[] =
      Array.isArray(topActionsRaw) ? topActionsRaw as TopAction[] : TOP_ACTIONS

    const incomeBridgeRaw = getSetting(settings, 'income_bridge')
    const incomeBridge: IncomeBridge =
      incomeBridgeRaw && typeof incomeBridgeRaw === 'object'
        ? mapIncomeBridge(incomeBridgeRaw as Record<string, unknown>)
        : INCOME_BRIDGE

    const spendingSummaryRaw = getSetting(settings, 'spending_summary')
    const spendingSummary: SpendingSummary =
      spendingSummaryRaw && typeof spendingSummaryRaw === 'object'
        ? mapSpendingSummary(spendingSummaryRaw as Record<string, unknown>)
        : SPENDING_SUMMARY

    const subscriptionSummaryRaw = getSetting(settings, 'subscription_summary')
    const subscriptionSummary: SubscriptionSummary =
      subscriptionSummaryRaw && typeof subscriptionSummaryRaw === 'object'
        ? mapSubscriptionSummary(subscriptionSummaryRaw as Record<string, unknown>)
        : SUBSCRIPTION_SUMMARY

    const propertyTaxRaw = getSetting(settings, 'property_tax')
    const propertyTax: PropertyTaxConfig =
      propertyTaxRaw && typeof propertyTaxRaw === 'object'
        ? mapPropertyTax(propertyTaxRaw as Record<string, unknown>)
        : PROPERTY_TAX

    const assetsRaw = getSetting(settings, 'assets')
    const assets: Assets =
      assetsRaw && typeof assetsRaw === 'object'
        ? mapAssets(assetsRaw as Record<string, unknown>)
        : ASSETS_FALLBACK

    // ── Investment data ───────────────────────────────────────────
    const investments: InvestmentData =
      invAccountsRes.data && invAccountsRes.data.length > 0
        ? {
            accounts: invAccountsRes.data.map(mapInvestmentAccount),
            taxLots: taxLotsRes.data ? taxLotsRes.data.map(mapTaxLot) : [],
            transactions: invTxnsRes.data ? invTxnsRes.data.map(mapInvestmentTxn) : [],
          }
        : EMPTY_INVESTMENT_DATA

    if (invAccountsRes.error) console.warn('[financial-data-service] investment_accounts:', invAccountsRes.error.message)
    if (taxLotsRes.error) console.warn('[financial-data-service] tax_lots:', taxLotsRes.error.message)
    if (invTxnsRes.error) console.warn('[financial-data-service] investment_transactions:', invTxnsRes.error.message)

    // ── Derive HELOC data from live debts ────────────────────────
    const helocAccounts = deriveHelocAccounts(debts)
    const helocKPIs = computeHelocKPIs(debts)
    const waterfallData = computeWaterfall(helocKPIs)

    // ── Deadlines (already in Supabase — fetched via API route) ──
    // The DeadlineTimeline component fetches via /api/finance/deadlines
    // We pass the hardcoded fallback here for getAllData() compat
    const deadlines = DEADLINES

    // Log warnings for any failed fetches
    if (debtsRes.error) console.warn('[financial-data-service] debt_accounts:', debtsRes.error.message)
    if (modulesRes.error) console.warn('[financial-data-service] financial_modules:', modulesRes.error.message)
    if (subsRes.error) console.warn('[financial-data-service] subscriptions:', subsRes.error.message)
    if (budgetRes.error) console.warn('[financial-data-service] budget_categories:', budgetRes.error.message)
    if (billsRes.error) console.warn('[financial-data-service] bills:', billsRes.error.message)
    if (burnRes.error) console.warn('[financial-data-service] burn_rate_items:', burnRes.error.message)
    if (promosRes.error) console.warn('[financial-data-service] promo_deadlines:', promosRes.error.message)
    if (taxRes.error) console.warn('[financial-data-service] tax_snapshots:', taxRes.error.message)
    if (wealthRes.error) console.warn('[financial-data-service] wealth_scenarios:', wealthRes.error.message)
    if (settingsRes.error) console.warn('[financial-data-service] financial_settings:', settingsRes.error.message)

    return {
      debts,
      modules,
      cancelSubs,
      reviewSubs,
      essentialBills,
      spendingCategories,
      bills,
      burnRate,
      promos,
      taxSnapshot,
      wealthScenarios,
      actionItems,
      topActions,
      incomeBridge,
      spendingSummary,
      subscriptionSummary,
      propertyTax,
      assets,
      deadlines,
      helocAccounts,
      helocKPIs,
      waterfallData,
      investments,
    }
  } catch (err) {
    console.error('[financial-data-service] Unexpected error, falling back:', err)
    return getAllData()
  }
}
