// ═══════════════════════════════════════════════════════════════════
// Financial Types — Single source of truth
// Covers: dashboard display, simulator inputs/outputs, Supabase rows
// ═══════════════════════════════════════════════════════════════════

// ── Debt ──────────────────────────────────────────────────────────

export type DebtDecision = 'roll' | 'keep' | 'promo'
export type DebtCategory = 'Personal Loan' | 'Credit Card' | 'Mortgage'
export type DebtAccountStatus = 'rolled' | 'promo_hold' | 'deferred' | 'keep' | 'paid_off'
export type AccountType = 'personal_loan' | 'auto_loan' | 'credit_card' | 'charge_plan' | 'deferred_interest' | 'mortgage' | 'heloc' | 'line_of_credit' | 'other'

/** Component-facing debt account (used by dashboard + charts) */
export interface DebtAccount {
  name: string
  balance: number
  rate: number
  min: number | null
  decision: DebtDecision
  category: DebtCategory
}

/** Extended debt account for HELOC tracker (Phase 1) */
export interface HELOCDebtAccount {
  id: string
  userId: string
  accountName: string
  accountType: AccountType
  originalBalance: number
  currentBalance: number
  interestRate: number
  monthlyPayment: number
  status: DebtAccountStatus
  rollDate: string | null
  promoExpiry: string | null
  deferredExpiry: string | null
  notes: string | null
}

// ── Modules ───────────────────────────────────────────────────────

export type ModuleStatus = 'done' | 'progress' | 'pending' | 'urgent'

export interface FinancialModule {
  id: number
  supabaseId?: string
  name: string
  status: ModuleStatus
  pct: number
  desc: string
  docsHave: string[]
  docsMissing: string[]
  actions: string[]
}

// ── Deadlines ─────────────────────────────────────────────────────

export type DeadlineUrgency = 'critical' | 'high' | 'medium' | 'low'
export type DeadlineStatus = 'upcoming' | 'completed' | 'missed'

export interface Deadline {
  date: string
  event: string
  amount: number | null
  risk: string
}

export interface DeadlineRecord {
  id: string
  userId: string
  title: string
  description: string | null
  deadlineDate: string
  urgency: DeadlineUrgency
  module: string | null
  impactIfMissed: string | null
  status: DeadlineStatus
}

// ── Action Items ──────────────────────────────────────────────────

export type ActionPriority = 'red' | 'amber' | 'blue'

export interface ActionItem {
  priority: ActionPriority
  title: string
  detail: string
}

// ── Promo Deadlines ───────────────────────────────────────────────

export interface PromoDeadline {
  name: string
  balance: number
  expires: string
  risk: number | null
  acct: string
  note: string
}

// ── Bills ─────────────────────────────────────────────────────────

export type BillStatus = 'autopay' | 'paid' | 'confirm' | 'manual' | 'recurring'

export interface Bill {
  date: string
  payee: string
  amount: number
  type: string
  status: BillStatus
  note: string
}

// ── Spending & Budget ─────────────────────────────────────────────

export interface SpendingCategory {
  cat: string
  annual: number
  monthly: number
  survival: number
  pct: number
  color: string
}

export interface BurnRateItem {
  label: string
  current: number
  survival: number
  note: string
}

// ── Subscriptions ─────────────────────────────────────────────────

export interface Subscription {
  name: string
  mo: number
  reason: string
}

export interface EssentialBill {
  name: string
  mo: number
  yr: number
  note: string
}

// ── HELOC (dashboard display) ─────────────────────────────────────

export interface HELOCAccount {
  name: string
  balance: number
  rate: number
  moNow: number
  decision: DebtDecision
}

// ── Wealth & Scenarios ────────────────────────────────────────────

export interface WealthScenario {
  name: string
  pmt: number
  r: number
  color: string
  label: string
}

export interface TopAction {
  icon: string
  text: string
  save: string
}

// ── Tax ───────────────────────────────────────────────────────────

export interface TaxSnapshot {
  w2Income: number
  federalWithheld: number
  scenarioA: { label: string; owed: number; note: string }
  scenarioB: { label: string; owed: number; note: string }
  keyItems: string[]
  filingDeadline: string
  caveat: string
}

// ── Paycheck Simulator (Phase 1) ─────────────────────────────────

export type PayFrequency = 52 | 26 | 24 | 12
export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh'
export type TaxMethod = 'bracket_calc' | 'manual_rate'

export interface PaycheckInputs {
  salary: number
  bonusPercent: number
  payFrequency: PayFrequency
  filingStatus: FilingStatus
  state: string
  taxMethod: TaxMethod
  manualEffectiveRate: number
  contribution401k: number
  employerMatchPct: number
  employerMatchCap: number
  hsaContribution: number
  healthPremium: number
  otherPreTax: number
}

export interface TaxResult {
  federalTax: number
  marginalBracket: number
  effectiveRate: number
}

export interface PaycheckResult {
  grossPay: number
  grossAnnual: number
  federalTax: number
  federalTaxAnnual: number
  marginalBracket: number
  socialSecurity: number
  socialSecurityAnnual: number
  ssCapPeriod: number | null
  medicare: number
  medicareAnnual: number
  medicareAdditional: number
  stateTax: number
  stateTaxAnnual: number
  contribution401k: number
  contribution401kAnnual: number
  employerMatch: number
  employerMatchAnnual: number
  hsaContribution: number
  healthPremium: number
  otherPreTax: number
  netPay: number
  netPayAnnual: number
  effectiveTotalTaxRate: number
}

// ── Cash Flow (Phase 1) ──────────────────────────────────────────

export interface ExpenseLineItem {
  id: string
  category: string
  label: string
  amount: number
  isCustom: boolean
}

export interface AllocationBucket {
  id: string
  label: string
  percent: number
  sortOrder: number
}

export interface CashFlowResult {
  totalIncome: number
  totalObligations: number
  totalLivingExpenses: number
  freeCash: number
  allocations: { label: string; amount: number; percent: number }[]
}

export interface MonthlyProjection {
  month: string
  income: number
  obligations: number
  livingExpenses: number
  freeCash: number
  cumulativeSavings: number
  events: string[]
}

// ── Scenarios (Phase 1) ──────────────────────────────────────────

export interface Scenario {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  isBaseline: boolean
  paycheckInputs: PaycheckInputs
  helocInputs: Record<string, unknown>
  cashflowInputs: Record<string, unknown>
  notes: string
}

export interface ComparisonMetric {
  label: string
  key: string
  values: { scenarioId: string; value: number }[]
  deltaFromBaseline: { scenarioId: string; delta: number; pctChange: number }[]
}

// ── Aggregate (full dashboard data shape) ─────────────────────────

export interface FinancialData {
  debts: DebtAccount[]
  modules: FinancialModule[]
  deadlines: Deadline[]
  actionItems: ActionItem[]
  promos: PromoDeadline[]
  bills: Bill[]
  spendingCategories: SpendingCategory[]
  burnRate: BurnRateItem[]
  cancelSubs: Subscription[]
  reviewSubs: Subscription[]
  essentialBills: EssentialBill[]
  helocAccounts: HELOCAccount[]
  wealthScenarios: WealthScenario[]
  topActions: TopAction[]
  taxSnapshot: TaxSnapshot
}
