// Health data is keyed by Brandon's local day (America/Chicago), not UTC —
// a 11 PM check-in belongs to that evening, and sleep to the wake-up date.
export const HEALTH_TZ = 'America/Chicago'

/** YYYY-MM-DD for `d` in America/Chicago. */
export function chicagoDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: HEALTH_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export const chicagoToday = () => chicagoDay()

/** Add whole days to a YYYY-MM-DD string (calendar math, timezone-free). */
export function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Weekday name for a YYYY-MM-DD string. */
export function weekday(iso: string, style: 'short' | 'long' = 'short'): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: style, timeZone: 'UTC' })
}
