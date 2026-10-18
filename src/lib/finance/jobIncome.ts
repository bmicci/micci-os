// ───────────────────────────────────────────────────────────────────────────
// Job offers → paychecks — pure functions.
//
// An offer (hourly contract or salaried role) is stored as data in
// financial_settings.job_offers, so a second offer (e.g. Schwab next to
// Southwest) is a new array entry, not new code. The runway projection takes
// the active offer's paycheck schedule and drops each net check on its real
// payday, so the "dip until the first check, then surplus" shape is exact.
// ───────────────────────────────────────────────────────────────────────────

import type { FilingStatus, PayFrequency, PaycheckResult } from '@/types/finance'
import { calculateNetPay } from './paycheck'
import { SS_RATE } from '@/lib/tax'

export interface JobOffer {
  id: string                       // 'southwest', 'schwab', …
  employer: string
  title?: string
  kind: 'hourly' | 'salary'
  employment: 'w2' | '1099'        // 1099 support is a TODO; only W-2 is modeled today
  hourlyRate?: number              // hourly
  hoursPerWeek?: number            // hourly — guaranteed hours
  annualSalary?: number            // salary
  bonusPct?: number                // salary
  payFrequency: PayFrequency       // 26 = biweekly
  startDate: string                // YYYY-MM-DD
  firstPayday: string              // YYYY-MM-DD
  filingStatus?: FilingStatus
  contribution401kAnnual?: number
  healthPremiumPerCheck?: number   // 0 while staying on outside coverage (BCBS)
  status: 'accepted' | 'offer' | 'prospect'
  notes?: string
}

export interface OfferPaycheck {
  offer: JobOffer
  annualGross: number
  result: PaycheckResult
  /** Net per check before the Social Security wage cap kicks in — what the
   *  first checks of each calendar year actually pay. Averaged `netPay` is
   *  higher because it spreads the capped months across the year. */
  netPerCheckEarly: number
  netPerCheckAvg: number
  monthlyNetAvg: number
  periodDays: number
}

export function offerAnnualGross(o: JobOffer): number {
  if (o.kind === 'hourly') return (o.hourlyRate ?? 0) * (o.hoursPerWeek ?? 40) * 52
  return (o.annualSalary ?? 0)
}

const PERIOD_DAYS: Record<number, number> = { 52: 7, 26: 14, 24: 365 / 24, 12: 365 / 12 }

export function offerPaycheck(o: JobOffer): OfferPaycheck {
  const annualGross = offerAnnualGross(o)
  const result = calculateNetPay({
    salary: annualGross,
    bonusPercent: o.kind === 'salary' ? (o.bonusPct ?? 0) : 0,
    payFrequency: o.payFrequency,
    filingStatus: o.filingStatus ?? 'single',
    state: 'TX',
    taxMethod: 'bracket_calc',
    manualEffectiveRate: 22,
    contribution401k: o.contribution401kAnnual ?? 0,
    employerMatchPct: 0,
    employerMatchCap: 0,
    hsaContribution: 0,
    healthPremium: o.healthPremiumPerCheck ?? 0,
    otherPreTax: 0,
  })
  const fullSsPerCheck = result.grossPay * SS_RATE
  const netPerCheckEarly = Math.round((result.netPay - Math.max(0, fullSsPerCheck - result.socialSecurity)) * 100) / 100
  return {
    offer: o,
    annualGross,
    result,
    netPerCheckEarly,
    netPerCheckAvg: result.netPay,
    monthlyNetAvg: Math.round(result.netPayAnnual / 12),
    periodDays: PERIOD_DAYS[o.payFrequency] ?? 14,
  }
}

/** The offer the runway should model: an accepted one, else none. */
export function activeOffer(offers: JobOffer[]): JobOffer | null {
  return offers.find(o => o.status === 'accepted') ?? null
}

export function parseOffers(raw: unknown): JobOffer[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((o): o is JobOffer =>
    !!o && typeof o === 'object'
    && typeof (o as JobOffer).id === 'string'
    && typeof (o as JobOffer).firstPayday === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test((o as JobOffer).firstPayday),
  )
}
