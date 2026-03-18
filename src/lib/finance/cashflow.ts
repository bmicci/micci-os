// ═══════════════════════════════════════════════════════════════════
// Cash Flow Calculator — Pure functions
// Monthly flow, free cash, allocation engine, 12-month projection
// ═══════════════════════════════════════════════════════════════════

import type {
  CashFlowResult,
  ExpenseLineItem,
  AllocationBucket,
  MonthlyProjection,
} from '@/types/finance'

export interface CashFlowInputs {
  netPayPerPeriod: number
  payFrequency: number
  helocMonthlyInterest: number
  promoMinimums: number
  deferredPayments: number
  expenses: ExpenseLineItem[]
  allocations: AllocationBucket[]
}

/**
 * Calculate monthly cash flow from income, obligations, and expenses.
 */
export function calculateMonthlyFlow(inputs: CashFlowInputs): CashFlowResult {
  const {
    netPayPerPeriod,
    payFrequency,
    helocMonthlyInterest,
    promoMinimums,
    deferredPayments,
    expenses,
    allocations,
  } = inputs

  // Monthly income (convert from pay period to monthly)
  const monthlyIncome = Math.round((netPayPerPeriod * payFrequency / 12) * 100) / 100

  // Total obligations (debt service)
  const totalObligations = Math.round((helocMonthlyInterest + promoMinimums + deferredPayments) * 100) / 100

  // Total living expenses
  const totalLivingExpenses = Math.round(
    expenses.reduce((sum, e) => sum + e.amount, 0) * 100,
  ) / 100

  // Free cash
  const freeCash = Math.round((monthlyIncome - totalObligations - totalLivingExpenses) * 100) / 100

  // Allocation engine
  const totalAllocPct = allocations.reduce((sum, a) => sum + a.percent, 0)
  const allocationResults = allocations
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(bucket => ({
      label: bucket.label,
      amount: Math.round((freeCash * (bucket.percent / 100)) * 100) / 100,
      percent: totalAllocPct > 0 ? bucket.percent : 0,
    }))

  return {
    totalIncome: monthlyIncome,
    totalObligations,
    totalLivingExpenses,
    freeCash,
    allocations: allocationResults,
  }
}

/**
 * Calculate free cash after all obligations and expenses.
 */
export function calculateFreeCash(cashflow: CashFlowResult): number {
  return cashflow.freeCash
}

/**
 * Suggest allocation percentages based on priorities.
 */
export function suggestAllocations(
  freeCash: number,
  priorities: { label: string; percent: number }[],
): { label: string; amount: number; percent: number }[] {
  return priorities.map(p => ({
    label: p.label,
    amount: Math.round((freeCash * (p.percent / 100)) * 100) / 100,
    percent: p.percent,
  }))
}

/**
 * Default allocation buckets per Phase 1 PRD.
 */
export const DEFAULT_ALLOCATIONS: AllocationBucket[] = [
  { id: '1', label: 'Emergency Fund / HYSA', percent: 30, sortOrder: 1 },
  { id: '2', label: 'Extra HELOC Principal', percent: 30, sortOrder: 2 },
  { id: '3', label: 'Brokerage / DCA Investing', percent: 25, sortOrder: 3 },
  { id: '4', label: 'Discretionary / Lifestyle', percent: 15, sortOrder: 4 },
]

/**
 * Default expense categories per Phase 1 PRD.
 */
export const DEFAULT_EXPENSES: ExpenseLineItem[] = [
  { id: 'housing', category: 'Housing', label: 'Mortgage payment', amount: 2480, isCustom: false },
  { id: 'transport', category: 'Transportation', label: 'Car insurance, gas/fuel', amount: 400, isCustom: false },
  { id: 'utilities', category: 'Utilities', label: 'Electric, gas, water, internet', amount: 350, isCustom: false },
  { id: 'phone', category: 'Phone', label: 'Mobile plan', amount: 100, isCustom: false },
  { id: 'food', category: 'Food', label: 'Groceries, dining out', amount: 800, isCustom: false },
  { id: 'health', category: 'Health & Wellness', label: 'ClassPass, supplements', amount: 200, isCustom: false },
  { id: 'subs', category: 'Subscriptions', label: 'Streaming, apps, SaaS', amount: 150, isCustom: false },
  { id: 'personal', category: 'Personal / Misc', label: 'Clothing, grooming, household', amount: 300, isCustom: false },
]

/**
 * Project cash flow 12 months forward with event-aware modeling.
 * Accounts for: SS cap-out, promo rollovers, deferred interest deadlines, one-time events.
 */
export function project12Months(inputs: {
  baseCashFlow: CashFlowInputs
  ssCapPeriod: number | null
  payFrequency: number
  grossPayPerPeriod: number
  ssPerPeriodSavings: number
  scheduledEvents: { monthOffset: number; label: string; amountDelta: number }[]
}): MonthlyProjection[] {
  const {
    baseCashFlow,
    ssCapPeriod,
    payFrequency,
    grossPayPerPeriod,
    ssPerPeriodSavings,
    scheduledEvents,
  } = inputs

  const baseFlow = calculateMonthlyFlow(baseCashFlow)
  const projections: MonthlyProjection[] = []
  let cumulativeSavings = 0
  const now = new Date()

  for (let m = 0; m < 12; m++) {
    const date = new Date(now.getFullYear(), now.getMonth() + m, 1)
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const events: string[] = []

    let incomeAdjust = 0
    let obligationAdjust = 0

    // SS cap-out boost: after the cap period, net pay increases
    if (ssCapPeriod !== null) {
      // Approximate which month the cap hits
      const capMonth = Math.floor((ssCapPeriod * 12) / payFrequency)
      if (m >= capMonth) {
        // Monthly SS savings = per-period savings * periods-per-month
        incomeAdjust += ssPerPeriodSavings * (payFrequency / 12)
        if (m === capMonth) events.push('SS wage base cap reached — net pay increases')
      }
    }

    // Scheduled events (promo expires, lump payments, etc.)
    for (const evt of scheduledEvents) {
      if (evt.monthOffset === m) {
        obligationAdjust += evt.amountDelta
        events.push(evt.label)
      }
    }

    const income = baseFlow.totalIncome + incomeAdjust
    const obligations = baseFlow.totalObligations + obligationAdjust
    const freeCash = income - obligations - baseFlow.totalLivingExpenses
    cumulativeSavings += Math.max(0, freeCash)

    projections.push({
      month: monthLabel,
      income: Math.round(income * 100) / 100,
      obligations: Math.round(obligations * 100) / 100,
      livingExpenses: baseFlow.totalLivingExpenses,
      freeCash: Math.round(freeCash * 100) / 100,
      cumulativeSavings: Math.round(cumulativeSavings * 100) / 100,
      events,
    })
  }

  return projections
}
