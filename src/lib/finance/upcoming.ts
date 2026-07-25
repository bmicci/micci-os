// ───────────────────────────────────────────────────────────────────────────
// "Up Next" — one merged, date-sorted view of everything time-critical.
//
// Three sources that were previously scattered across tabs (or nowhere):
//   1. Recurring bills — PREDICTED from the live recurring detection:
//      next charge ≈ last charge + median cadence. No manual bill calendar
//      to maintain; it derives from the same transactions everything else
//      does, so a new bill appears on its own after two charges.
//   2. Promo / HELOC expirations — the deferred-interest cliffs.
//   3. Action items with due dates.
//
// Sorted by date, so what's next is literally at the top.
// ───────────────────────────────────────────────────────────────────────────

import type { RecurringAnalysis } from './recurring'
import type { PromoDeadline, ActionItem } from '../financial-data'

export type UpcomingKind = 'bill' | 'promo' | 'action'

export interface UpcomingItem {
  kind: UpcomingKind
  label: string
  detail: string
  date: string          // YYYY-MM-DD
  daysAway: number
  amount: number | null
  urgent: boolean       // drives red vs amber vs normal
}

const DAY = 86400000

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseLocal(s: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s)
}

/**
 * Build the merged upcoming list for the next `horizonDays`.
 * `today` is injectable for testing.
 */
export function computeUpcoming(
  recurring: RecurringAnalysis,
  promos: PromoDeadline[],
  actionItems: ActionItem[],
  horizonDays = 45,
  today: Date = new Date(),
): UpcomingItem[] {
  const t0 = new Date(today)
  t0.setHours(0, 0, 0, 0)
  const items: UpcomingItem[] = []

  // ── 1. Predicted recurring charges ──
  // Only active charges: a lapsed one isn't coming back. Roll the predicted
  // date forward until it lands in the future — the detection window may end
  // before today (data staleness), which would otherwise show past-due bills
  // that already paid themselves.
  for (const c of recurring.active) {
    const last = parseLocal(c.lastCharged)
    let next = new Date(last.getTime() + c.cadenceDays * DAY)
    let guard = 0
    while (next < t0 && guard++ < 24) {
      next = new Date(next.getTime() + c.cadenceDays * DAY)
    }
    const daysAway = Math.round((next.getTime() - t0.getTime()) / DAY)
    if (daysAway < 0 || daysAway > horizonDays) continue
    items.push({
      kind: 'bill',
      label: c.name,
      detail: c.kind === 'bill' ? 'Bill · auto' : 'Subscription',
      date: isoDate(next),
      daysAway,
      amount: c.lastAmount,
      urgent: false, // a predicted bill is informational, not an alarm
    })
  }

  // ── 2. Promo / HELOC expirations ──
  for (const p of promos) {
    if (!p.expires || p.balance <= 0) continue
    const d = parseLocal(p.expires)
    const daysAway = Math.ceil((d.getTime() - t0.getTime()) / DAY)
    if (daysAway < 0 || daysAway > horizonDays) continue
    items.push({
      kind: 'promo',
      label: `${p.name} — 0% expires`,
      detail: p.risk
        ? `⚠ ${p.acct} · deferred interest at risk`
        : `${p.acct} · pay from HELOC before this date`,
      date: p.expires,
      daysAway,
      amount: p.balance,
      urgent: true, // a missed promo cliff costs real money
    })
  }

  // ── 3. Action items with due dates ──
  for (const a of actionItems) {
    if ((a.status ?? 'active') !== 'active' || !a.dueDate) continue
    const d = parseLocal(a.dueDate)
    const daysAway = Math.ceil((d.getTime() - t0.getTime()) / DAY)
    if (daysAway > horizonDays) continue // keep overdue (negative) visible
    items.push({
      kind: 'action',
      label: a.title,
      detail: a.detail || 'Action item',
      date: a.dueDate,
      daysAway,
      amount: a.amount ?? null,
      urgent: a.priority === 'red' || daysAway < 0,
    })
  }

  return items.sort((a, b) => a.daysAway - b.daysAway)
}
