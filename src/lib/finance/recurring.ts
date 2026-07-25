// ───────────────────────────────────────────────────────────────────────────
// Recurring-charge detection — pure functions over imported transactions.
//
// Replaces the frozen 2025 subscription audit list with live detection:
// a merchant is "recurring" when its charges land on a regular cadence
// (monthly / quarterly / annual) with a stable amount. Everything the tab
// shows — current price, last-charged date, price creep, lapsed services,
// zombie flags — derives from the transactions table on every load.
//
// Tuned against Brandon's real data (4,100+ txns, Jun 2024–present):
// true subscriptions cluster tightly at ~30.4-day median gaps with exact
// or near-exact amounts (Uber One $9.99, Google One $1.99, NTTA $40.00),
// while noise (restaurants, gas, groceries) has irregular gaps and high
// amount variance.
// ───────────────────────────────────────────────────────────────────────────

import { NON_SPEND_CATEGORIES, canonCategory, type TxnRow } from './txnAggregate'

export interface RecurringCharge {
  name: string          // cleaned display name
  key: string           // normalized merchant key (grouping identity)
  category: string
  kind: 'subscription' | 'bill'
  cadence: 'monthly' | 'quarterly' | 'annual'
  cadenceDays: number   // median gap between charges
  monthlyCost: number   // normalized to a monthly figure
  lastAmount: number
  count: number
  firstSeen: string     // YYYY-MM-DD
  lastCharged: string   // YYYY-MM-DD
  status: 'active' | 'lapsed'
  priceChangePct: number | null // recent typical amount vs earlier typical amount
  zombie: boolean       // on the cancel list but still charging
}

export interface RecurringAnalysis {
  hasData: boolean
  dataEnd: string       // newest transaction date — "as of" for status calls
  active: RecurringCharge[]
  lapsed: RecurringCharge[]
  activeMonthlyTotal: number
  subsMonthlyTotal: number
  billsMonthlyTotal: number
  lapsedMonthlySavings: number
  zombieCount: number
  creepCount: number
}

export const EMPTY_RECURRING: RecurringAnalysis = {
  hasData: false, dataEnd: '', active: [], lapsed: [],
  activeMonthlyTotal: 0, subsMonthlyTotal: 0, billsMonthlyTotal: 0,
  lapsedMonthlySavings: 0, zombieCount: 0, creepCount: 0,
}

// Fixed obligations shown as "bills" rather than cancellable subscriptions.
// (Canonical names — canonCategory() has already collapsed aliases.)
const BILL_CATEGORIES = new Set([
  'Housing', 'Bills & Utilities', 'Insurance',
  'Communications', 'Taxes', 'Debt Service',
])

// Import-time categories are unreliable for checking-side autopays (TXU lands
// in "Other", Geico in "Business Services") — recognize obvious bills by name.
const BILL_MERCHANT = /txu|atmos|water|uverse|at&t|geico|state farm|insurance|ntta|mortgage|bank of america|sofi|lightstream|fcu|citizens pay|ut southwestern/i

// A restaurant or grocery run can hit a ~monthly rhythm by coincidence;
// these categories can't be subscriptions.
const EXCLUDE_CATEGORIES = new Set(['Food & Dining', 'Groceries'])

// Financing costs masquerade as recurring merchants — they belong to the
// debt tabs, not the subscription list.
const EXCLUDE_MERCHANT = /interest|plan fee|late fee|annual fee|membership fee rebate/i

const DAYS_PER_MONTH = 365 / 12

/** Normalized grouping key: first padded CSV segment, letters only. */
export function merchantKey(raw: string): string {
  let s = raw.split(/\s{2,}/)[0] ?? raw
  s = s.toUpperCase()
  s = s.replace(/^(TST\*|PY \*|SQ \*|BT\*|APLPAY |PP\*|PAYPAL \*)\s*/, '')
  s = s.replace(/HTTPS?:\/\/\S+/g, ' ')
  s = s.replace(/\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/g, ' ') // phone numbers
  s = s.replace(/[^A-Z]+/g, ' ').trim()
  return s.split(' ').filter(Boolean).slice(0, 4).join(' ')
}

/** Human display name from the raw merchant string. */
function displayName(raw: string): string {
  let s = raw.split(/\s{2,}/)[0] ?? raw
  s = s.replace(/^(TST\*|PY \*|SQ \*|BT\*|AplPay |PP\*|PAYPAL \*)\s*/i, '')
  s = s.replace(/https?:\/\/\S+/gi, ' ')
  s = s.replace(/\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  // Title-case ALL-CAPS strings; leave mixed case (e.g. "LifeTimeFitness.COM") alone
  if (s === s.toUpperCase()) {
    s = s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())
  }
  return s
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const num = (v: number | string) => (typeof v === 'number' ? v : parseFloat(v) || 0)

interface Charge { d: string; amt: number; cat: string }

function classifyCadence(gaps: number[]): { cadence: RecurringCharge['cadence']; cadenceDays: number } | null {
  const g = median(gaps)
  // (window, regularity tolerance in days, min gap count)
  const bands: { cadence: RecurringCharge['cadence']; lo: number; hi: number; tol: number; minGaps: number }[] = [
    { cadence: 'monthly', lo: 25, hi: 36, tol: 7, minGaps: 2 },
    { cadence: 'quarterly', lo: 80, hi: 100, tol: 14, minGaps: 2 },
    { cadence: 'annual', lo: 330, hi: 400, tol: 30, minGaps: 1 },
  ]
  for (const b of bands) {
    if (g < b.lo || g > b.hi || gaps.length < b.minGaps) continue
    const regular = gaps.filter(x => Math.abs(x - g) <= b.tol).length / gaps.length
    if (regular >= 0.6) return { cadence: b.cadence, cadenceDays: Math.round(g * 10) / 10 }
  }
  return null
}

/**
 * Detect recurring charges from raw transactions.
 * `cancelListNames` — service names from the old audit's cancel list; a
 * detected ACTIVE recurring merchant matching one is flagged as a zombie
 * (decided to cancel, still being charged).
 */
export function detectRecurring(rows: TxnRow[], cancelListNames: string[] = []): RecurringAnalysis {
  const groups = new Map<string, { raw: string; list: Charge[] }>()
  let dataEnd = ''

  for (const r of rows) {
    const cat = canonCategory(r.category)
    const d = String(r.transaction_date ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue // pending rows can lack a date
    if (d > dataEnd) dataEnd = d
    if (NON_SPEND_CATEGORIES.has(cat) || EXCLUDE_CATEGORIES.has(cat)) continue
    const amt = num(r.amount)
    if (amt <= 0) continue // refunds/credits don't define cadence
    const raw = r.merchant ?? ''
    if (!raw || EXCLUDE_MERCHANT.test(raw)) continue
    const key = merchantKey(raw)
    if (key.length < 3) continue
    if (!groups.has(key)) groups.set(key, { raw, list: [] })
    groups.get(key)!.list.push({ d, amt, cat })
  }

  if (groups.size === 0 || !dataEnd) return EMPTY_RECURRING

  const normalizedCancels = cancelListNames
    .map(n => n.toUpperCase().replace(/[^A-Z]+/g, ' ').trim())
    .filter(n => n.length >= 4)

  const charges: RecurringCharge[] = []

  for (const [key, { raw, list }] of groups) {
    if (list.length < 2) continue
    list.sort((a, b) => a.d.localeCompare(b.d))

    // Collapse same-day charges (split payments) into one event
    const events: Charge[] = []
    for (const c of list) {
      const prev = events[events.length - 1]
      if (prev && prev.d === c.d) prev.amt += c.amt
      else events.push({ ...c })
    }
    if (events.length < 2) continue

    const gaps: number[] = []
    for (let i = 1; i < events.length; i++) {
      gaps.push((Date.parse(events[i].d) - Date.parse(events[i - 1].d)) / 86400000)
    }

    const band = classifyCadence(gaps)
    if (!band) continue

    // Two visits ~a year apart isn't an annual subscription unless the
    // amounts match like a renewal would.
    if (band.cadence === 'annual' && events.length === 2) {
      const [a1, a2] = [events[0].amt, events[1].amt]
      if (Math.abs(a1 - a2) / Math.max(a1, a2) > 0.03) continue
    }

    // Amount stability: robust relative spread around the median
    const amts = events.map(e => e.amt)
    const m = median(amts)
    if (m <= 0) continue
    const relMAD = median(amts.map(a => Math.abs(a - m))) / m
    if (relMAD > 0.35) continue

    const last = events[events.length - 1]
    const daysSinceLast = (Date.parse(dataEnd) - Date.parse(last.d)) / 86400000
    const status: RecurringCharge['status'] = daysSinceLast <= band.cadenceDays * 1.6 ? 'active' : 'lapsed'

    // Price creep: typical recent amount vs the typical amount before that
    let priceChangePct: number | null = null
    if (events.length >= 6) {
      const recent = median(amts.slice(-3))
      const earlier = median(amts.slice(0, -3).slice(-3))
      if (earlier > 0) priceChangePct = Math.round(((recent - earlier) / earlier) * 1000) / 10
    }

    const cat = last.cat
    const monthlyCost =
      band.cadence === 'monthly' ? m : band.cadence === 'quarterly' ? m / 3 : m / 12

    const zombie =
      status === 'active' &&
      normalizedCancels.some(c => {
        const compact = key.replace(/ /g, '')
        const compactC = c.replace(/ /g, '')
        return compact.includes(compactC) || compactC.includes(compact)
      })

    charges.push({
      name: displayName(raw),
      key,
      category: cat,
      kind: BILL_CATEGORIES.has(cat) || BILL_MERCHANT.test(raw) ? 'bill' : 'subscription',
      cadence: band.cadence,
      cadenceDays: band.cadenceDays,
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      lastAmount: Math.round(last.amt * 100) / 100,
      count: events.length,
      firstSeen: events[0].d,
      lastCharged: last.d,
      status,
      priceChangePct,
      zombie,
    })
  }

  const active = charges.filter(c => c.status === 'active').sort((a, b) => b.monthlyCost - a.monthlyCost)
  const lapsed = charges.filter(c => c.status === 'lapsed').sort((a, b) => b.lastCharged.localeCompare(a.lastCharged))

  const sum = (xs: RecurringCharge[]) => Math.round(xs.reduce((s, c) => s + c.monthlyCost, 0) * 100) / 100
  const subs = active.filter(c => c.kind === 'subscription')
  const bills = active.filter(c => c.kind === 'bill')
  // Savings KPI counts only charges that stopped in the last 6 months —
  // a service cancelled a year ago isn't a recent win.
  const recentLapsed = lapsed.filter(
    c => (Date.parse(dataEnd) - Date.parse(c.lastCharged)) / 86400000 <= 180,
  )

  return {
    hasData: true,
    dataEnd,
    active,
    lapsed,
    activeMonthlyTotal: sum(active),
    subsMonthlyTotal: sum(subs),
    billsMonthlyTotal: sum(bills),
    lapsedMonthlySavings: sum(recentLapsed),
    zombieCount: active.filter(c => c.zombie).length,
    creepCount: active.filter(c => c.priceChangePct != null && c.priceChangePct >= 3).length,
  }
}
