// ───────────────────────────────────────────────────────────────────────────
// Master Plan — plan vs actual. Pure functions, no I/O.
//
// The plan (financial_settings.strategic_plan.master_plan) carries the
// workbook's month-end projection for strategies A/B/C. This file compares
// that projection with live debt balances: which plan account each live
// debt is, what the plan expected by now, and whether you're ahead or behind.
// Nothing here writes data or re-derives the plan; the workbook is the model.
// ───────────────────────────────────────────────────────────────────────────

import { last4 } from './liveDebts'

export type StrategyKey = 'A' | 'B' | 'C'
export const STRATEGIES: StrategyKey[] = ['A', 'B', 'C']

export interface AccountMatch { last4?: string; name?: string; category?: string }

export interface PlanAccount {
  key: string
  label: string
  match: AccountMatch
  start: number
  rate_after?: number | null
  promo_ends?: string | null
  min?: number | null
  deferred_interest?: number | null
  order?: number | null
}

export interface StrategyProjection {
  debt: number[]
  cards: number[]
  savings: number[]
  interest: number[]
  accounts: Record<string, number[]>
}

export interface PlanMilestone { key: string; label: string; target: string; kind?: string; savings?: number; debt?: number }
export interface PlanDeadline { date: string; what: string; amount?: number; inflow?: number; account?: string; kind?: string }
export interface PlanTradeoff {
  path: string; month_2027: number; savings_2029: number; debt_2029: number; debt_free: string; interest: number; recommended?: boolean
}

export interface MasterPlan {
  base_case: Record<string, string | number | boolean>
  start: { date: string; non_mortgage_debt: number; checking?: number }
  milestones: PlanMilestone[]
  deadlines: PlanDeadline[]
  tradeoffs: PlanTradeoff[]
  next_60_days: string[]
  risks: string[]
  excluded_accounts: { match: AccountMatch; reason: string }[]
  /** 'YYYY-MM' for each projected month; values are balances at that month's end. */
  months: string[]
  accounts: PlanAccount[]
  projection: Record<StrategyKey, StrategyProjection>
}

/** What the plan page needs from a live debt (a subset of DebtAccount). */
export interface LiveDebt {
  name: string
  balance: number
  category: string
  payInFull?: boolean
  source?: 'live' | 'manual'
  asOf?: string
  stale?: boolean
}

const isNumArr = (v: unknown): v is number[] => Array.isArray(v) && v.every(x => typeof x === 'number' || x === null)

/** Validate the stored plan; null when it's missing or malformed (e.g. still v5). */
export function parseMasterPlan(value: unknown): MasterPlan | null {
  if (!value || typeof value !== 'object') return null
  const mp = (value as Record<string, unknown>).master_plan as Partial<MasterPlan> | undefined
  if (!mp || !Array.isArray(mp.months) || mp.months.length === 0 || !mp.projection || !mp.start) return null
  for (const s of STRATEGIES) {
    const p = mp.projection[s]
    if (!p || !isNumArr(p.debt) || p.debt.length !== mp.months.length) return null
  }
  return {
    base_case: mp.base_case ?? {},
    start: mp.start,
    milestones: mp.milestones ?? [],
    deadlines: mp.deadlines ?? [],
    tradeoffs: mp.tradeoffs ?? [],
    next_60_days: mp.next_60_days ?? [],
    risks: mp.risks ?? [],
    excluded_accounts: mp.excluded_accounts ?? [],
    months: mp.months,
    accounts: mp.accounts ?? [],
    projection: mp.projection as Record<StrategyKey, StrategyProjection>,
  }
}

/** Last calendar day of a 'YYYY-MM' month, as 'YYYY-MM-DD'. */
export function monthEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 0))
  return d.toISOString().slice(0, 10)
}

/**
 * Index of the latest month-end on or before `today` (YYYY-MM-DD), or -1 when
 * today is before the first projected month-end (the plan's start balances apply).
 */
export function planIndexAt(plan: Pick<MasterPlan, 'months'>, today: string): number {
  let idx = -1
  plan.months.forEach((ym, i) => { if (monthEnd(ym) <= today) idx = i })
  return idx
}

/** Plan value of a series at `today`: the latest month-end on or before it, else the start value. */
export function seriesAt(series: number[], idx: number, start: number): number {
  return idx < 0 ? start : series[Math.min(idx, series.length - 1)] ?? start
}

export function matches(m: AccountMatch, d: Pick<LiveDebt, 'name' | 'category'>): boolean {
  if (m.last4) return last4(d.name) === m.last4
  if (m.name) return d.name.toLowerCase().includes(m.name.toLowerCase())
  if (m.category) return d.category === m.category
  return false
}

export interface ReconcileRow {
  key: string
  label: string
  /** Plan balance as of the latest month-end (start balance before the first). */
  plan: number
  /** Live balance; 0 when a plan account has no live debt (paid off or not opened). */
  actual: number
  diff: number
  matchedName: string | null
  source: 'live' | 'manual' | 'none'
  asOf: string | null
  stale: boolean
}

export interface Reconciliation {
  asOfPlan: string            // date the plan numbers are as of
  rows: ReconcileRow[]
  /** Live debts the plan doesn't name (counted in the actual total). */
  unplanned: LiveDebt[]
  /** Live debts left out on purpose (paid in full monthly). */
  excluded: { debt: LiveDebt; reason: string }[]
  planTotal: number
  actualTotal: number
  diff: number                // actual − plan: negative = ahead of plan
}

/** Match live non-mortgage debts to the plan's accounts and compare balances. */
export function reconcile(plan: MasterPlan, live: LiveDebt[], strategy: StrategyKey, today: string): Reconciliation {
  const idx = planIndexAt(plan, today)
  const proj = plan.projection[strategy]
  const debts = live.filter(d => d.category !== 'Mortgage' && d.balance > 0)
  const used = new Set<number>()
  const excluded: Reconciliation['excluded'] = []

  debts.forEach((d, i) => {
    const ex = plan.excluded_accounts.find(e => matches(e.match, d))
    if (ex || d.payInFull) {
      used.add(i)
      excluded.push({ debt: d, reason: ex?.reason ?? 'Paid in full monthly' })
    }
  })

  const rows: ReconcileRow[] = plan.accounts.map(a => {
    const series = proj.accounts?.[a.key]
    const planBal = series ? seriesAt(series, idx, a.start) : a.start
    const i = debts.findIndex((d, j) => !used.has(j) && matches(a.match, d))
    const d = i >= 0 ? debts[i] : null
    if (i >= 0) used.add(i)
    const actual = d ? round2(d.balance) : 0
    return {
      key: a.key, label: a.label, plan: planBal, actual, diff: round2(actual - planBal),
      matchedName: d?.name ?? null, source: d?.source ?? (d ? 'manual' : 'none'), asOf: d?.asOf ?? null, stale: d?.stale === true,
    }
  })

  const unplanned = debts.filter((_, j) => !used.has(j))
  const planTotal = seriesAt(proj.debt, idx, plan.start.non_mortgage_debt)
  const actualTotal = round2(rows.reduce((s, r) => s + r.actual, 0) + unplanned.reduce((s, d) => s + d.balance, 0))
  return {
    asOfPlan: idx < 0 ? plan.start.date : monthEnd(plan.months[idx]),
    rows, unplanned, excluded, planTotal, actualTotal, diff: round2(actualTotal - planTotal),
  }
}

export type Pace = 'ahead' | 'on_track' | 'behind'
/** Within ±$500 of the plan counts as on track. */
export function pace(diff: number, tolerance = 500): Pace {
  return diff < -tolerance ? 'ahead' : diff > tolerance ? 'behind' : 'on_track'
}

export interface DeadlineStatus extends PlanDeadline {
  daysLeft: number
  /** For promo deadlines: the live balance on that card now. */
  liveBalance: number | null
  status: 'done' | 'cleared' | 'urgent' | 'upcoming' | 'past'
}

/** Days from `today` to `date` (both YYYY-MM-DD), calendar days. */
export function daysBetween(today: string, date: string): number {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86_400_000)
}

/** Upcoming deadlines with days left and, for promo cards, whether the balance is already gone. */
export function deadlineStatus(plan: MasterPlan, rec: Reconciliation, today: string, urgentDays = 21): DeadlineStatus[] {
  const byKey = new Map(rec.rows.map(r => [r.key, r]))
  return plan.deadlines
    .map(d => {
      const daysLeft = daysBetween(today, d.date)
      const row = d.account ? byKey.get(d.account) : undefined
      const liveBalance = row ? row.actual : null
      let status: DeadlineStatus['status']
      if (daysLeft < 0) status = 'past'
      else if (d.kind === 'promo' && liveBalance != null && liveBalance <= 1) status = 'cleared'
      else if (daysLeft <= urgentDays) status = 'urgent'
      else status = 'upcoming'
      return { ...d, daysLeft, liveBalance, status }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface ChartPoint { month: string; A: number; B: number; C: number; actual?: number }

/** Month-end debt for each strategy, starting at the plan's start date, with today's actual on its month. */
export function chartSeries(plan: MasterPlan, actualTotal: number | null, today: string): ChartPoint[] {
  const startYm = plan.start.date.slice(0, 7)
  const pts: ChartPoint[] = [{ month: startYm, A: plan.start.non_mortgage_debt, B: plan.start.non_mortgage_debt, C: plan.start.non_mortgage_debt }]
  plan.months.forEach((ym, i) => pts.push({ month: ym, A: plan.projection.A.debt[i], B: plan.projection.B.debt[i], C: plan.projection.C.debt[i] }))
  if (actualTotal != null) {
    const ym = today.slice(0, 7)
    const p = pts.find(x => x.month === ym)
    if (p) p.actual = actualTotal
  }
  return pts
}

export interface MilestoneStatus extends PlanMilestone { monthsLeft: number | null; done: boolean; note: string }

/** Where each milestone stands, from live balances where the app can tell. */
export function milestoneStatus(plan: MasterPlan, rec: Reconciliation, strategy: StrategyKey, today: string): MilestoneStatus[] {
  const promoKeys = new Set(plan.accounts.filter(a => a.promo_ends || a.key.startsWith('rollover')).map(a => a.key))
  const cardsLeft = rec.rows.filter(r => promoKeys.has(r.key)).reduce((s, r) => s + r.actual, 0)
    + rec.unplanned.filter(d => d.category === 'Credit Card').reduce((s, d) => s + d.balance, 0)
  const helocRow = rec.rows.find(r => r.key === 'heloc')
  const ym = today.slice(0, 7)
  return plan.milestones.map(m => {
    const monthsLeft = /^\d{4}-\d{2}$/.test(m.target)
      ? (Number(m.target.slice(0, 4)) - Number(ym.slice(0, 4))) * 12 + Number(m.target.slice(5)) - Number(ym.slice(5))
      : null
    let done = false
    let note = ''
    if (m.key === 'cards_cleared') {
      done = cardsLeft <= 1
      note = done ? 'All promo cards are at $0' : `${fmt(cardsLeft)} left on promo cards`
    } else if (m.key === 'heloc_paid') {
      done = helocRow != null && helocRow.actual <= 1
      note = helocRow ? `${fmt(helocRow.actual)} on the HELOC` : ''
    } else if (m.key === 'debt_2029' && m.debt != null) {
      done = rec.actualTotal <= m.debt
      note = `${fmt(rec.actualTotal)} today; plan ${strategy} reaches ${fmt(plan.projection[strategy].debt.at(-1) ?? 0)}`
    } else if (m.savings != null) {
      note = 'Savings balance isn’t tracked live yet'
    } else if (m.kind === 'rule') {
      const over = rec.rows.filter(r => r.actual > 1 && promoKeys.has(r.key)).length
      note = over ? 'Holds while every promo is rolled or paid before its deadline' : 'No promo balances left'
    }
    return { ...m, monthsLeft, done, note }
  })
}

function round2(n: number) { return Math.round(n * 100) / 100 }
function fmt(n: number) { return '$' + Math.round(n).toLocaleString('en-US') }
