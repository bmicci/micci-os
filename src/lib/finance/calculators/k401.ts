// 401(k) election calculator (Schwab plan rules). Pure — no I/O.
// Taxes follow the Schwab reference doc: 401(k) lowers income tax but NOT FICA wages;
// medical/dental/vision (Section 125) lowers both. Texas: no state income tax.
import { calculateFederalTax, STANDARD_DEDUCTION_2026, SS_RATE, SS_WAGE_BASE_2026, MEDICARE_RATE,
  MEDICARE_ADDITIONAL_RATE, MEDICARE_ADDITIONAL_THRESHOLD } from '@/lib/tax'

export interface K401Inputs {
  salary: number
  bonusPct: number          // target bonus as % of salary (0 to exclude the bonus)
  basePct: number           // % of base pay deferred
  bonusDeferPct: number     // % of bonus deferred
  limit: number             // IRS employee limit for the year
  matchPct: number          // Schwab matches $1 per $1 up to this % of eligible earnings
  kicker: number            // flat amount after the first contribution each year
  payPeriods: number        // 26 = biweekly
  section125PerCheck: number
  section125Checks: number  // deductions per year (24 of 26)
  ltdAnnual: number
  returnPct: number
  years: number
}

export interface K401Result {
  baseDeferral: number
  bonusDeferral: number
  totalDeferral: number
  match: number
  federalTax: number
  netAnnual: number
  /** Net per biweekly check on base pay before the Social Security cap (what early-year checks pay). */
  netPerCheckEarly: number
  netPerMonth: number
  balance: number           // employee + match, compounded
}

export const SCHWAB_DEFAULTS: K401Inputs = {
  salary: 240000, bonusPct: 0, basePct: 5, bonusDeferPct: 5, limit: 25500, matchPct: 5, kicker: 250,
  payPeriods: 26, section125PerCheck: 78, section125Checks: 24, ltdAnnual: 736.8, returnPct: 7, years: 3,
}

export function k401Calc(i: K401Inputs): K401Result {
  const bonus = i.salary * (i.bonusPct / 100)
  const gross = i.salary + bonus
  const baseDeferral = Math.min(i.salary * (i.basePct / 100), i.limit)
  const bonusDeferral = Math.min(bonus * (i.bonusDeferPct / 100), Math.max(0, i.limit - baseDeferral))
  const totalDeferral = baseDeferral + bonusDeferral
  const sec125 = i.section125PerCheck * i.section125Checks
  const ficaWages = gross - sec125
  const std = STANDARD_DEDUCTION_2026.single

  const fedOf = (income: number, deferral: number) =>
    calculateFederalTax(Math.max(0, income - deferral - sec125 - std), 'single').federalTax
  const ssOf = (w: number) => SS_RATE * Math.min(w, SS_WAGE_BASE_2026)
  const medOf = (w: number) => MEDICARE_RATE * w + MEDICARE_ADDITIONAL_RATE * Math.max(0, w - MEDICARE_ADDITIONAL_THRESHOLD.single)

  const federalTax = fedOf(gross, totalDeferral)
  const netAnnual = gross - totalDeferral - sec125 - federalTax - ssOf(ficaWages) - medOf(ficaWages) - i.ltdAnnual
  const match = totalDeferral > 0
    ? Math.min(totalDeferral, (gross) * (i.matchPct / 100)) + i.kicker
    : 0

  // Early-year base-pay check: federal share from a base-pay-only year, full 6.2% Social Security.
  const baseFicaWages = i.salary - sec125
  const fedBase = fedOf(i.salary, baseDeferral)
  const perCheckGross = i.salary / i.payPeriods
  const netPerCheckEarly = perCheckGross - baseDeferral / i.payPeriods - sec125 / i.payPeriods
    - fedBase / i.payPeriods - (SS_RATE * perCheckGross) - (medOf(baseFicaWages) / i.payPeriods) - i.ltdAnnual / i.payPeriods

  let balance = 0
  const r = i.returnPct / 100
  for (let y = 0; y < i.years; y++) balance = (balance + totalDeferral + match) * (1 + r)

  return {
    baseDeferral, bonusDeferral, totalDeferral, match, federalTax,
    netAnnual, netPerCheckEarly, netPerMonth: (netPerCheckEarly * i.payPeriods) / 12, balance,
  }
}
