// ═══════════════════════════════════════════════════════════════════
// Cash Flow plan — month-by-month cash walk from today. Pure, no I/O.
//
// Income is real paychecks on real paydays (so a 1-check first month and the
// Social Security cap later in the year show up), debt payments are the live
// minimums, living costs come from imported transactions, and dated one-time
// outflows (property tax, promo payoffs) land in their month.
// ═══════════════════════════════════════════════════════════════════

import type { DebtAccount } from '@/lib/financial-data'
import type { CashEvent } from './cashEvents'

export interface PlanLine { id: string; label: string; amount: number }

export interface CashFlowPlanInputs {
  todayIso: string
  startingCash: number
  paydays: string[]          // YYYY-MM-DD, any order
  netPerCheck: number        // net before the Social Security cap
  grossPerCheck: number      // Social Security wages per check
  ssPerCheck: number         // Social Security tax per check (stops at the wage base)
  ssWageBase: number
  monthlyDebtPayments: number
  monthlyLiving: number
  events: CashEvent[]        // amount < 0 = money out
  months?: number
}

export interface CashFlowPlanMonth {
  key: string                // YYYY-MM
  label: string              // "Nov 26"
  partial: boolean           // first month starts today, so costs are prorated
  checks: number
  income: number
  debt: number
  living: number
  oneTime: number            // signed; negative = out
  eventLabels: string[]
  net: number
  endCash: number
}

export interface CashFlowPlan {
  months: CashFlowPlanMonth[]
  lowPoint: { cash: number; monthKey: string; date: string }
  endCash: number
}

const r2 = (n: number) => Math.round(n * 100) / 100
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function daysInMonth(y: number, m0: number) {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()
}
function iso(y: number, m0: number, d: number) {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Paydays from the first payday through `untilIso`.
 * 24 = semi-monthly (15th and last day), 26 = every 14 days, 52 = weekly,
 * 12 = monthly on the first payday's day of month.
 */
export function generatePaydays(firstPayday: string, payFrequency: number, untilIso: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstPayday) || firstPayday > untilIso) return []
  const out: string[] = []
  const [fy, fm, fd] = firstPayday.split('-').map(Number)
  if (payFrequency === 24 || payFrequency === 12) {
    for (let i = 0; i < 400; i++) {
      const y = fy + Math.floor((fm - 1 + i) / 12)
      const m0 = (fm - 1 + i) % 12
      const days = payFrequency === 24
        ? [15, daysInMonth(y, m0)]
        : [Math.min(fd, daysInMonth(y, m0))]
      for (const d of days) {
        const s = iso(y, m0, d)
        if (s > untilIso) return out
        if (s >= firstPayday) out.push(s)
      }
    }
    return out
  }
  const step = payFrequency === 52 ? 7 : 14
  const t = new Date(`${firstPayday}T12:00:00Z`)
  for (let i = 0; i < 800; i++) {
    const s = t.toISOString().slice(0, 10)
    if (s > untilIso) break
    out.push(s)
    t.setUTCDate(t.getUTCDate() + step)
  }
  return out
}

/** Monthly debt payments: every open debt's minimum, except cards paid in full (their spend is already in living costs). */
export function debtPaymentLines(debts: DebtAccount[]): PlanLine[] {
  return debts
    .filter(d => d.balance > 0 && !d.payInFull && (d.min ?? 0) > 0)
    .sort((a, b) => (b.min ?? 0) - (a.min ?? 0))
    .map(d => ({ id: `debt:${d.name}`, label: d.name, amount: r2(d.min ?? 0) }))
}

// Transaction categories that are debt payments — modeled from the debt list
// instead, so they aren't counted twice.
const DEBT_CATEGORIES = new Set(['Debt Service'])

/** Monthly living costs from the trailing-window spend by category. */
export function livingLines(byCategory: { cat: string; monthly: number }[]): PlanLine[] {
  return byCategory
    .filter(c => !DEBT_CATEGORIES.has(c.cat) && c.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly)
    .map(c => ({ id: `cat:${c.cat}`, label: c.cat, amount: Math.round(c.monthly) }))
}

export function projectCashFlowPlan(inp: CashFlowPlanInputs): CashFlowPlan {
  const months = inp.months ?? 12
  const [ty, tm, td] = inp.todayIso.split('-').map(Number)

  // Net per payday, adding back Social Security once the year's wages pass the base
  const pays = [...inp.paydays].filter(d => d >= inp.todayIso).sort()
  const netByDay = new Map<string, number>()
  const ytd = new Map<string, number>()
  for (const d of pays) {
    const yr = d.slice(0, 4)
    const before = ytd.get(yr) ?? 0
    const after = before + inp.grossPerCheck
    ytd.set(yr, after)
    const overShare = inp.grossPerCheck > 0
      ? Math.min(1, Math.max(0, (after - Math.max(before, inp.ssWageBase)) / inp.grossPerCheck))
      : 0
    netByDay.set(d, (netByDay.get(d) ?? 0) + inp.netPerCheck + inp.ssPerCheck * overShare)
  }

  // Daily walk: costs accrue evenly, paychecks and one-time events land on
  // their dates — so the low point catches the dip before a payday.
  let cash = inp.startingCash
  let low = { cash: inp.startingCash, monthKey: inp.todayIso.slice(0, 7), date: inp.todayIso }
  const out: CashFlowPlanMonth[] = []
  for (let i = 0; i < months; i++) {
    const y = ty + Math.floor((tm - 1 + i) / 12)
    const m0 = (tm - 1 + i) % 12
    const key = `${y}-${String(m0 + 1).padStart(2, '0')}`
    const dim = daysInMonth(y, m0)
    const firstDay = i === 0 ? td : 1
    const dailyCost = (inp.monthlyDebtPayments + inp.monthlyLiving) / dim

    let income = 0, checks = 0, oneTime = 0
    const labels: string[] = []
    for (let d = firstDay; d <= dim; d++) {
      const day = iso(y, m0, d)
      cash -= dailyCost
      const pay = netByDay.get(day)
      if (pay) { cash += pay; income += pay; checks++ }
      for (const e of inp.events) if (e.date === day) { cash += e.amount; oneTime += e.amount; labels.push(e.label) }
      if (cash < low.cash) low = { cash: r2(cash), monthKey: key, date: day }
    }
    const share = (dim - firstDay + 1) / dim
    const debt = inp.monthlyDebtPayments * share
    const living = inp.monthlyLiving * share
    out.push({
      key, label: `${MONTHS[m0]} ${String(y).slice(2)}`, partial: share < 1, checks,
      income: r2(income), debt: r2(debt), living: r2(living), oneTime: r2(oneTime),
      eventLabels: labels, net: r2(income - debt - living + oneTime), endCash: r2(cash),
    })
  }
  return { months: out, lowPoint: low, endCash: r2(cash) }
}
