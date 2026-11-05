// Debt payoff simulator for the Calculators section. Pure — no I/O.
// Every month: interest accrues, minimums are paid on every debt, and all remaining budget
// (extra + minimums freed by paid-off debts + any lump sum) goes to the target debt.

export interface PayoffDebt {
  id: string
  name: string
  balance: number
  apr: number          // annual %, 0 for promos
  minPayment: number
}

export type PayoffStrategy = 'avalanche' | 'snowball'

export interface Lump { month: number; amount: number } // month 1 = first month of the plan

export interface PayoffInputs {
  debts: PayoffDebt[]
  extraMonthly: number
  strategy: PayoffStrategy
  lumps?: Lump[]
  maxMonths?: number
}

export interface PayoffPoint { month: number; total: number }

export interface PayoffResult {
  months: number | null          // null: not paid off within the horizon
  totalInterest: number
  totalPaid: number
  payoffMonth: Record<string, number | null>
  order: string[]                // debt ids in the order they hit $0
  series: PayoffPoint[]
}

export function simulatePayoff(inputs: PayoffInputs): PayoffResult {
  const maxMonths = inputs.maxMonths ?? 480
  const debts = inputs.debts.filter(d => d.balance > 0.005).map(d => ({ ...d, bal: d.balance }))
  const budget = debts.reduce((s, d) => s + d.minPayment, 0) + Math.max(0, inputs.extraMonthly)
  const lumpsByMonth = new Map<number, number>()
  for (const l of inputs.lumps ?? []) lumpsByMonth.set(l.month, (lumpsByMonth.get(l.month) ?? 0) + l.amount)

  const payoffMonth: Record<string, number | null> = Object.fromEntries(inputs.debts.map(d => [d.id, d.balance > 0.005 ? null : 0]))
  const order: string[] = []
  const series: PayoffPoint[] = [{ month: 0, total: debts.reduce((s, d) => s + d.bal, 0) }]
  let totalInterest = 0
  let totalPaid = 0
  let month = 0

  while (debts.some(d => d.bal > 0.005) && month < maxMonths) {
    month++
    for (const d of debts) {
      if (d.bal <= 0.005) continue
      const interest = d.bal * (d.apr / 100 / 12)
      d.bal += interest
      totalInterest += interest
    }
    let pool = budget + (lumpsByMonth.get(month) ?? 0)
    // minimums first
    for (const d of debts) {
      if (d.bal <= 0.005) continue
      const pay = Math.min(d.minPayment, d.bal, pool)
      d.bal -= pay; pool -= pay; totalPaid += pay
    }
    // everything left goes to the target debt, then the next
    const targets = debts.filter(d => d.bal > 0.005).sort((a, b) =>
      inputs.strategy === 'avalanche' ? b.apr - a.apr || a.bal - b.bal : a.bal - b.bal || b.apr - a.apr)
    for (const d of targets) {
      if (pool <= 0.005) break
      const pay = Math.min(d.bal, pool)
      d.bal -= pay; pool -= pay; totalPaid += pay
    }
    for (const d of debts) {
      if (d.bal <= 0.005 && payoffMonth[d.id] === null) { payoffMonth[d.id] = month; order.push(d.id); d.bal = 0 }
    }
    series.push({ month, total: Math.max(0, debts.reduce((s, d) => s + d.bal, 0)) })
  }

  const done = !debts.some(d => d.bal > 0.005)
  return {
    months: done ? month : null,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    payoffMonth,
    order,
    series,
  }
}

/** Month index → "Mar 2028" given the plan's first month (YYYY-MM). */
export function monthLabel(startYm: string, offset: number): string {
  const [y, m] = startYm.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + offset, 1))
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
