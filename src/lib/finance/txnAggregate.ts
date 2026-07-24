// ───────────────────────────────────────────────────────────────────────────
// Transaction aggregation — pure functions over rows from the transactions table.
// Shared by the /api/transactions route (client-fetched charts) and the
// server-side financial-data-service (spend categories + burn).
//
// Amount convention (set at import time): + = spend, − = money in
// (refund/credit/payment/deposit). Summing signed amounts nets refunds
// against spend automatically.
// ───────────────────────────────────────────────────────────────────────────

/** Categories that are NOT real spend — excluded from all spend rollups. */
export const NON_SPEND_CATEGORIES = new Set(['Card Payment', 'Transfer', 'Income'])

/** Fixed / essential categories — used to derive a survival floor. */
const ESSENTIAL_CATEGORIES = new Set([
  'Housing', 'Taxes', 'Debt Service', 'Utilities', 'Bills & Utilities',
  'Insurance', 'Groceries', 'Health & Medical', 'Health & Wellness', 'Communications',
])

export interface TxnRow {
  transaction_date: string
  amount: number | string
  category: string | null
  merchant?: string | null
}

export interface CategorySpend {
  cat: string
  net: number       // net spend over the window (charges − refunds)
  count: number
}

// ── Category colors (stable palette; hash fallback for unknowns) ──
const CATEGORY_COLORS: Record<string, string> = {
  'Housing': '#6366f1',
  'Debt Service': '#be123c',
  'Taxes': '#f43f5e',
  'Restaurant': '#f59e0b',
  'Food & Dining': '#f59e0b',
  'Food & Drink': '#fbbf24',
  'Groceries': '#22c55e',
  'Merchandise & Supplies': '#8b5cf6',
  'Shopping': '#a855f7',
  'Business Services': '#0ea5e9',
  'Transportation': '#3b82f6',
  'Transport': '#3b82f6',
  'Travel': '#14b8a6',
  'Entertainment': '#f97316',
  'Communications': '#06b6d4',
  'Software & Subscriptions': '#06b6d4',
  'Utilities': '#64748b',
  'Bills & Utilities': '#64748b',
  'Insurance': '#a855f7',
  'Health & Wellness': '#ef4444',
  'Health & Medical': '#ec4899',
  'Personal': '#e879f9',
  'Personal Care': '#e879f9',
  'Fees & Adjustments': '#94a3b8',
  'Other': '#94a3b8',
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || '#' + ((Math.abs(hashStr(cat)) % 0xffffff).toString(16).padStart(6, '0'))
}

/**
 * Fetch ALL transaction rows, paging past Supabase's 1,000-row response cap.
 * A single .select() silently truncates to an arbitrary 1,000 of the rows,
 * which corrupts every downstream aggregate.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllTxns(supabase: any): Promise<TxnRow[]> {
  const PAGE = 1000
  const all: TxnRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, amount, category, merchant')
      .order('transaction_date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) {
      console.warn('[fetchAllTxns]', error.message)
      break
    }
    const rows = (data ?? []) as TxnRow[]
    all.push(...rows)
    if (rows.length < PAGE) break
  }
  return all
}

const num = (v: number | string) => (typeof v === 'number' ? v : parseFloat(v) || 0)
const inWindow = (d: string, since?: string, until?: string) =>
  (!since || d >= since) && (!until || d <= until)

/** Net spend per category over an optional [since, until] window (excludes non-spend). */
export function spendByCategory(rows: TxnRow[], since?: string, until?: string): CategorySpend[] {
  const map = new Map<string, { net: number; count: number }>()
  for (const r of rows) {
    const cat = r.category || 'Other'
    if (NON_SPEND_CATEGORIES.has(cat)) continue
    const d = String(r.transaction_date).slice(0, 10)
    if (!inWindow(d, since, until)) continue
    const e = map.get(cat) ?? { net: 0, count: 0 }
    e.net += num(r.amount)
    e.count++
    map.set(cat, e)
  }
  return [...map.entries()]
    .map(([cat, v]) => ({ cat, net: Math.round(v.net * 100) / 100, count: v.count }))
    .filter(c => c.net > 0)
    .sort((a, b) => b.net - a.net)
}

/** Total real income (Income category inflows are stored negative) over a window. */
export function totalIncome(rows: TxnRow[], since?: string, until?: string): number {
  let sum = 0
  for (const r of rows) {
    if ((r.category || '') !== 'Income') continue
    const d = String(r.transaction_date).slice(0, 10)
    if (!inWindow(d, since, until)) continue
    sum += -num(r.amount)
  }
  return Math.round(sum * 100) / 100
}

/** Monthly spend stacked by category — shape consumed by SpendTrendChart. */
export function monthlyTrend(rows: TxnRow[]): {
  months: Record<string, unknown>[]
  categories: string[]
} {
  const monthMap = new Map<string, Map<string, number>>()
  const cats = new Set<string>()
  for (const r of rows) {
    const cat = r.category || 'Other'
    if (NON_SPEND_CATEGORIES.has(cat)) continue
    const month = String(r.transaction_date).slice(0, 7)
    cats.add(cat)
    if (!monthMap.has(month)) monthMap.set(month, new Map())
    const cm = monthMap.get(month)!
    cm.set(cat, (cm.get(cat) || 0) + num(r.amount))
  }
  const months = [...monthMap.keys()].sort().map(month => {
    const cm = monthMap.get(month)!
    const entry: Record<string, unknown> = { month }
    let total = 0
    for (const [cat, amt] of cm) {
      const v = Math.round(amt * 100) / 100
      entry[cat] = v
      total += amt
    }
    entry.total = Math.round(total * 100) / 100
    return entry
  })
  return { months, categories: [...cats].sort() }
}

export interface BurnCategory { cat: string; monthly: number; color: string }

export interface BurnAnalysis {
  hasData: boolean
  windowStart: string
  windowEnd: string
  windowDays: number
  monthlySpend: number     // real, from transactions over the recent window
  monthlyIncome: number    // steady-state recurring income (passed in, NOT tx-derived)
  monthlyNetBurn: number   // monthlySpend − monthlyIncome (positive = burning cash)
  byCategory: BurnCategory[]
}

export const EMPTY_BURN: BurnAnalysis = {
  hasData: false, windowStart: '', windowEnd: '', windowDays: 0,
  monthlySpend: 0, monthlyIncome: 0, monthlyNetBurn: 0, byCategory: [],
}

/**
 * Real recent burn rate from transactions.
 *
 * Spend is the actual trailing-window spend. Income is the caller-supplied
 * STEADY-STATE recurring figure (e.g. current unemployment) — deliberately
 * NOT derived from transactions, because tx income includes one-time events
 * (severance, final pay) that don't recur and would understate the true burn.
 */
export function computeBurn(rows: TxnRow[], steadyMonthlyIncome: number, windowDays = 90): BurnAnalysis {
  if (rows.length === 0) return { ...EMPTY_BURN, monthlyIncome: steadyMonthlyIncome }
  const maxD = rows.reduce((m, r) => {
    const d = String(r.transaction_date).slice(0, 10)
    return d > m ? d : m
  }, '0000-00-00')
  if (maxD === '0000-00-00') return { ...EMPTY_BURN, monthlyIncome: steadyMonthlyIncome }

  const start = new Date(new Date(maxD + 'T00:00:00Z').getTime() - windowDays * 86400000)
    .toISOString().slice(0, 10)
  const byCat = spendByCategory(rows, start, maxD)
  const monthlyFactor = (365 / 12) / windowDays
  const monthlySpend = Math.round(byCat.reduce((s, c) => s + c.net, 0) * monthlyFactor)

  return {
    hasData: true,
    windowStart: start,
    windowEnd: maxD,
    windowDays,
    monthlySpend,
    monthlyIncome: Math.round(steadyMonthlyIncome),
    monthlyNetBurn: Math.round(monthlySpend - steadyMonthlyIncome),
    byCategory: byCat.map(c => ({ cat: c.cat, monthly: Math.round(c.net * monthlyFactor), color: categoryColor(c.cat) })),
  }
}

export interface MonthlyFlow {
  month: string // 'YYYY-MM'
  income: number
  spend: number
}

/** Income vs spend per month for the trailing N months (for the in/out chart). */
export function monthlyFlows(rows: TxnRow[], monthsBack = 6): MonthlyFlow[] {
  const map = new Map<string, { income: number; spend: number }>()
  for (const r of rows) {
    const cat = r.category || 'Other'
    const month = String(r.transaction_date).slice(0, 7)
    const e = map.get(month) ?? { income: 0, spend: 0 }
    if (cat === 'Income') e.income += -num(r.amount) // income stored negative
    else if (!NON_SPEND_CATEGORIES.has(cat)) e.spend += num(r.amount)
    map.set(month, e)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-monthsBack)
    .map(([month, v]) => ({
      month,
      income: Math.round(v.income),
      spend: Math.round(Math.max(v.spend, 0)),
    }))
}

export interface LiveSpendCategory {
  cat: string
  annual: number
  monthly: number
  survival: number
  pct: number
  color: string
}

/**
 * Build SpendingCategory[] from a window of transactions.
 * `survival` is a heuristic floor: essentials at 100% of actual, discretionary at 40%.
 */
export function liveSpendCategories(rows: TxnRow[], since?: string, until?: string): LiveSpendCategory[] {
  const byCat = spendByCategory(rows, since, until)
  const total = byCat.reduce((s, c) => s + c.net, 0)
  return byCat.map(c => {
    const monthly = Math.round((c.net / 12) * 100) / 100
    const survival = ESSENTIAL_CATEGORIES.has(c.cat)
      ? Math.round(monthly)
      : Math.round(monthly * 0.4)
    return {
      cat: c.cat,
      annual: Math.round(c.net),
      monthly: Math.round(monthly),
      survival,
      pct: total > 0 ? Math.round((c.net / total) * 1000) / 10 : 0,
      color: categoryColor(c.cat),
    }
  })
}

// ── Runway projection (income cliff-aware) ──────────────────────────────────
// A flat "liquid ÷ monthly burn" runway is wrong once a known income cliff
// (e.g. unemployment benefits exhausting on a confirmed date) falls inside
// the projection window — burn jumps the day that income stops. This walks
// forward day by day so the cash-out date reflects the real step change.

export interface RunwayProjection {
  today: string                    // YYYY-MM-DD
  cliffDate: string | null         // confirmed income-drop date, if any
  daysUntilCliff: number | null    // negative if the cliff has already passed
  preCliffMonthlyBurn: number      // monthlySpend − currentIncome (may be negative = surplus)
  postCliffMonthlyBurn: number     // monthlySpend − 0 (full spend once income stops)
  cashOutDate: string | null       // projected zero-cash date, or null if it never happens within 10y
  phase: 'pre-cliff' | 'post-cliff' | 'no-cliff'
}

function parseLocalDate(dateStr: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T00:00:00' : dateStr)
}

function isoDate(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAYS_PER_MONTH = 365 / 12

/**
 * Project the real cash-out date given a monthly spend rate, current income,
 * and an optional confirmed date that income drops to $0 (an income cliff —
 * e.g. unemployment benefits exhausting). Walks forward day by day rather
 * than assuming a single flat burn rate forever.
 */
export function computeRunwayProjection(
  liquidCash: number,
  monthlySpend: number,
  currentMonthlyIncome: number,
  cliffDateIso: string | null,
  today: Date = new Date(),
): RunwayProjection {
  const cursor = new Date(today)
  cursor.setHours(0, 0, 0, 0)
  const cliff = cliffDateIso ? parseLocalDate(cliffDateIso) : null

  const preCliffMonthlyBurn = Math.round(monthlySpend - currentMonthlyIncome)
  const postCliffMonthlyBurn = Math.round(monthlySpend)
  const daysUntilCliff = cliff ? Math.round((cliff.getTime() - cursor.getTime()) / 86400000) : null

  const phase: RunwayProjection['phase'] = !cliff ? 'no-cliff' : daysUntilCliff! > 0 ? 'pre-cliff' : 'post-cliff'

  // Cash-flow positive with no cliff ahead → never runs out.
  if (!cliff && preCliffMonthlyBurn <= 0) {
    return { today: isoDate(cursor), cliffDate: cliffDateIso, daysUntilCliff, preCliffMonthlyBurn, postCliffMonthlyBurn, cashOutDate: null, phase }
  }

  const dailySpend = monthlySpend / DAYS_PER_MONTH
  const dailyIncome = currentMonthlyIncome / DAYS_PER_MONTH
  let cash = liquidCash
  const walker = new Date(cursor)
  const MAX_DAYS = 3652 // 10-year cap

  for (let i = 0; i < MAX_DAYS; i++) {
    const pastCliff = cliff ? walker >= cliff : false
    const dailyNet = pastCliff ? -dailySpend : dailyIncome - dailySpend
    if (dailyNet < 0 && cash + dailyNet <= 0) {
      return { today: isoDate(cursor), cliffDate: cliffDateIso, daysUntilCliff, preCliffMonthlyBurn, postCliffMonthlyBurn, cashOutDate: isoDate(walker), phase }
    }
    cash += dailyNet
    walker.setDate(walker.getDate() + 1)
  }

  return { today: isoDate(cursor), cliffDate: cliffDateIso, daysUntilCliff, preCliffMonthlyBurn, postCliffMonthlyBurn, cashOutDate: null, phase }
}
