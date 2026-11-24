// ───────────────────────────────────────────────────────────────────────────
// Current role → dashboard summary — pure functions.
//
// The accepted offer in financial_settings.job_offers is the job Brandon now
// holds (Schwab from Nov 16, 2026). The dashboard's role card reads it from
// here: how long he's been in the role, when the next check lands, and the
// pay facts the offer already stores. No hardcoded employer, dates or pay.
// ───────────────────────────────────────────────────────────────────────────

import type { OfferPaycheck } from './jobIncome'
import { generatePaydays } from './cashflowPlan'

export interface RoleSummary {
  employer: string
  title: string | null
  startDate: string
  /** false until the start date arrives */
  started: boolean
  /** 1 on the start date; negative count of days to go before it */
  dayInRole: number
  /** 1 during the first seven days in the role */
  weekInRole: number
  payLabel: string
  annualGross: number
  /** Net of the next check, before the Social Security wage cap (what early-year checks pay) */
  netPerCheck: number
  nextPayday: string | null
  daysToPayday: number | null
  /** true when the next check is the first one from this employer */
  firstCheck: boolean
  k401Annual: number
  k401Pct: number | null
}

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dayDiff(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`)) / 86400000)
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Plain-words pay cadence: "Every other Friday", "Twice a month", … */
export function payCadenceLabel(payFrequency: number, firstPayday: string): string {
  const weekday = DOW[new Date(`${firstPayday}T12:00:00Z`).getUTCDay()]
  if (payFrequency === 26) return `Every other ${weekday}`
  if (payFrequency === 52) return `Every ${weekday}`
  if (payFrequency === 24) return 'Twice a month'
  if (payFrequency === 12) return 'Monthly'
  return `${payFrequency} checks a year`
}

export function roleSummary(pay: OfferPaycheck, todayIso: string): RoleSummary {
  const o = pay.offer
  const elapsed = dayDiff(o.startDate, todayIso)
  const started = elapsed >= 0
  // Next payday on or after today. generatePaydays owns the schedule, so any
  // payday rule it applies (business days, holidays) shows up here too.
  const upcoming = generatePaydays(o.firstPayday, o.payFrequency, addDays(todayIso, 62))
    .filter(d => d >= todayIso)
  const nextPayday = upcoming[0] ?? null
  return {
    employer: o.employer,
    title: o.title?.trim() || null,
    startDate: o.startDate,
    started,
    dayInRole: started ? elapsed + 1 : elapsed,
    weekInRole: started ? Math.floor(elapsed / 7) + 1 : 0,
    payLabel: payCadenceLabel(o.payFrequency, o.firstPayday),
    annualGross: pay.annualGross,
    netPerCheck: pay.netPerCheckEarly,
    nextPayday,
    daysToPayday: nextPayday ? dayDiff(todayIso, nextPayday) : null,
    firstCheck: nextPayday != null && nextPayday <= o.firstPayday,
    k401Annual: o.contribution401kAnnual ?? 0,
    k401Pct: pay.annualGross > 0 && o.contribution401kAnnual
      ? Math.round((o.contribution401kAnnual / pay.annualGross) * 1000) / 10
      : null,
  }
}
