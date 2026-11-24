// ───────────────────────────────────────────────────────────────────────────
// Payday business-day rule — pure functions.
//
// Payroll lands on the business day before a payday that falls on a weekend
// or a bank holiday (the Federal Reserve schedule). Schwab's calendar shows
// it: the Friday Jan 1, 2027 check is paid Thu Dec 31, 2026 (plan v17).
// ───────────────────────────────────────────────────────────────────────────

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function utc(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 12))
}

/** The nth (1-based) weekday of a month; n = -1 is the last one. */
function nthWeekday(y: number, m0: number, weekday: number, n: number): Date {
  if (n > 0) {
    const first = utc(y, m0, 1)
    return utc(y, m0, 1 + ((weekday - first.getUTCDay() + 7) % 7) + (n - 1) * 7)
  }
  const last = utc(y, m0 + 1, 0)
  return utc(y, m0, last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7))
}

/** Federal Reserve bank holidays for a year (YYYY-MM-DD). A fixed-date
 *  holiday on a Sunday is observed Monday; one on a Saturday is not moved
 *  (banks stay open the Friday before). */
export function bankHolidays(year: number): Set<string> {
  const fixed = [[0, 1], [5, 19], [6, 4], [10, 11], [11, 25]].map(([m0, d]) => {
    const day = utc(year, m0, d)
    if (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1)
    return iso(day)
  })
  const floating = [
    nthWeekday(year, 0, 1, 3),   // Martin Luther King Jr. Day
    nthWeekday(year, 1, 1, 3),   // Presidents Day
    nthWeekday(year, 4, 1, -1),  // Memorial Day
    nthWeekday(year, 8, 1, 1),   // Labor Day
    nthWeekday(year, 9, 1, 2),   // Columbus Day
    nthWeekday(year, 10, 4, 4),  // Thanksgiving
  ].map(iso)
  return new Set([...fixed, ...floating])
}

/** The day a check actually lands: the payday itself, or the business day
 *  before it when it falls on a weekend or a bank holiday. */
export function payOnBusinessDay(paydayIso: string): string {
  const d = new Date(`${paydayIso}T12:00:00Z`)
  for (let i = 0; i < 10; i++) {
    const s = iso(d)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6 && !bankHolidays(d.getUTCFullYear()).has(s)) return s
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return paydayIso
}
