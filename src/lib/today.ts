// ───────────────────────────────────────────────────────────────────────────
// /today — the daily log (ROADMAP Phase 3: top 3 actions, evening check-in,
// streak). Pure functions over data the app already has; the page renders.
//
//   · Top 3 actions — open action_items, overdue first
//   · Evening check-in — health_daily (the /health/checkin rows), with the
//     consecutive-day streak
//   · Money today — next payday and the bills / promo cliffs due this week
//
// Every date here is a YYYY-MM-DD string in America/Chicago, so "today" is
// Brandon's day, not the server's UTC day.
// ───────────────────────────────────────────────────────────────────────────

import type { ActionItem } from './financial-data'
import type { UpcomingItem } from './finance/upcoming'
import type { RunwayEmployment } from './finance/txnAggregate'
import { SCORECARD_ROWS, type HealthDailyRow } from './health/overview'
import { shiftDay } from './health/dates'

const DAY = 86_400_000

/** Whole calendar days from `from` to `to` (YYYY-MM-DD); negative = past. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY)
}

// ── Top 3 actions ───────────────────────────────────────────────────────────

export interface TodayAction extends ActionItem {
  /** Days until due (negative = overdue), or null when undated. */
  daysAway: number | null
}

/** Lower sorts first: overdue, due today, red, due this week, amber, the rest. */
function actionRank(a: TodayAction): number {
  const d = a.daysAway
  if (d != null && d < 0) return 0
  if (d === 0) return 1
  if (a.priority === 'red') return 2
  if (d != null && d <= 7) return 3
  if (a.priority === 'amber') return 4
  return 5
}

const PRIORITY_ORDER = { red: 0, amber: 1, blue: 2 } as const

/** The `n` open action items that matter most today. */
export function pickTopActions(items: ActionItem[], today: string, n = 3): TodayAction[] {
  return items
    .filter(i => (i.status ?? 'active') === 'active')
    .map(i => ({ ...i, daysAway: i.dueDate ? daysBetween(today, i.dueDate.slice(0, 10)) : null }))
    .sort((a, b) =>
      actionRank(a) - actionRank(b)
      || (a.daysAway ?? Infinity) - (b.daysAway ?? Infinity)
      || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      || a.title.localeCompare(b.title))
    .slice(0, n)
}

// ── Money today ─────────────────────────────────────────────────────────────

/**
 * Bills and promo cliffs due within `horizon` days. Action items are left
 * out (they're in the top 3). A promo past its expiry stays in: it's
 * unresolved until marked paid.
 */
export function dueThisWeek(upcoming: UpcomingItem[], today: string, horizon = 7): UpcomingItem[] {
  return upcoming
    .filter(u => u.kind !== 'action')
    // Re-count from Chicago's today: the list was built on the server's clock.
    .map(u => ({ ...u, daysAway: daysBetween(today, u.date) }))
    .filter(u => u.daysAway <= horizon && (u.daysAway >= 0 || u.kind === 'promo'))
    .sort((a, b) => a.daysAway - b.daysAway)
}

export interface NextPayday {
  employer: string
  date: string
  daysAway: number
  netPerCheck: number
  /** True before the first check has landed. */
  first: boolean
}

/**
 * The next payday on or after today, stepping from the first payday by the
 * pay period (14 days = every other Friday). The date is the scheduled
 * payday; a weekend or holiday payday lands the business day before.
 */
export function nextPayday(emp: RunwayEmployment | null, today: string, periodDays = 14): NextPayday | null {
  if (!emp?.firstPayday || periodDays <= 0) return null
  let date = emp.firstPayday.slice(0, 10)
  let guard = 0
  while (date < today && guard++ < 1000) date = shiftDay(date, periodDays)
  return {
    employer: emp.employer,
    date,
    daysAway: daysBetween(today, date),
    netPerCheck: emp.netPerCheck,
    first: date === emp.firstPayday.slice(0, 10),
  }
}

// ── Evening check-in + streak ───────────────────────────────────────────────

/** A day counts as logged when the check-in recorded anything. */
export function isCheckedIn(r: HealthDailyRow | undefined): boolean {
  if (!r) return false
  return r.energy_level != null || r.sleep_hours_self != null || SCORECARD_ROWS.some(s => r[s.key] != null)
}

export interface CheckinStatus {
  loggedToday: boolean
  /** Consecutive logged days ending today, or yesterday while today is open. */
  streak: number
  /** Logged days in the last 7, today included. */
  last7: number
  lastLogged: string | null
}

export function checkinStatus(daily: HealthDailyRow[], today: string): CheckinStatus {
  const logged = new Set(daily.filter(r => r.day <= today && isCheckedIn(r)).map(r => r.day))
  const loggedToday = logged.has(today)
  let streak = 0
  let cursor = loggedToday ? today : shiftDay(today, -1)
  while (logged.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  const last7 = Array.from({ length: 7 }, (_, i) => shiftDay(today, -i)).filter(d => logged.has(d)).length
  const lastLogged = [...logged].sort().at(-1) ?? null
  return { loggedToday, streak, last7, lastLogged }
}

/** Short label for a days-away count: "today" · "tomorrow" · "Fri" · "in 9d". */
export function whenLabel(date: string, today: string): string {
  const d = daysBetween(today, date)
  if (d < 0) return `${-d}d overdue`
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d < 7) return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  return `in ${d}d`
}
