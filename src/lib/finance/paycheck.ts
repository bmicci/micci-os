// ═══════════════════════════════════════════════════════════════════
// Paycheck Calculator — Pure functions
// No side effects, no store access, no API calls
// ═══════════════════════════════════════════════════════════════════

import type { PaycheckInputs, PaycheckResult } from '@/types/finance'
import {
  calculateFederalTax,
  calculateSocialSecurity,
  calculateMedicare,
  getSocialSecurityCapPeriod,
  STANDARD_DEDUCTION_2026,
  LIMIT_401K_2026,
} from '@/lib/tax'
import { getStateTaxRate } from '@/lib/tax/state'

/**
 * Calculate complete paycheck breakdown from inputs.
 * Returns per-period AND annualized figures.
 */
export function calculateNetPay(inputs: PaycheckInputs): PaycheckResult {
  const {
    salary,
    bonusPercent,
    payFrequency,
    filingStatus,
    state,
    taxMethod,
    manualEffectiveRate,
    contribution401k,
    employerMatchPct,
    employerMatchCap,
    hsaContribution,
    healthPremium,
    otherPreTax,
  } = inputs

  // ── Gross ────────────────────────────────────────────────────
  const totalComp = salary + salary * (bonusPercent / 100)
  const grossPerPeriod = totalComp / payFrequency

  // ── Pre-tax deductions (reduce taxable income) ───────────────
  const annual401k = Math.min(contribution401k, LIMIT_401K_2026)
  const per401k = annual401k / payFrequency
  const annualHsa = hsaContribution
  const perHsa = annualHsa / payFrequency
  const perHealth = healthPremium
  const annualHealth = healthPremium * (payFrequency === 12 ? 12 : payFrequency === 24 ? 24 : payFrequency === 26 ? 26 : 52)
  const perOther = otherPreTax
  const annualOther = otherPreTax * (payFrequency === 12 ? 12 : payFrequency === 24 ? 24 : payFrequency === 26 ? 26 : 52)

  const totalPreTaxAnnual = annual401k + annualHsa + annualHealth + annualOther

  // ── Taxable income ───────────────────────────────────────────
  const agi = totalComp - totalPreTaxAnnual
  const standardDeduction = STANDARD_DEDUCTION_2026[filingStatus]
  const taxableIncome = Math.max(0, agi - standardDeduction)

  // ── Federal tax ──────────────────────────────────────────────
  let federalTaxAnnual: number
  let marginalBracket: number

  if (taxMethod === 'manual_rate') {
    federalTaxAnnual = Math.round(taxableIncome * (manualEffectiveRate / 100) * 100) / 100
    marginalBracket = manualEffectiveRate / 100
  } else {
    const result = calculateFederalTax(taxableIncome, filingStatus)
    federalTaxAnnual = result.federalTax
    marginalBracket = result.marginalBracket
  }
  const federalTaxPer = Math.round((federalTaxAnnual / payFrequency) * 100) / 100

  // ── FICA (calculated on gross, not reduced by pre-tax deductions except 401k for SS) ──
  // Note: 401(k) contributions ARE subject to FICA. Only Section 125 cafeteria plans reduce FICA base.
  // For simplicity, we calculate FICA on gross comp.

  // Social Security — annual
  let ssAnnual = 0
  let ytdGross = 0
  const ssCapPeriod = getSocialSecurityCapPeriod(grossPerPeriod, payFrequency)
  for (let p = 1; p <= payFrequency; p++) {
    const { amount } = calculateSocialSecurity(grossPerPeriod, ytdGross)
    ssAnnual += amount
    ytdGross += grossPerPeriod
  }
  const ssPer = Math.round((ssAnnual / payFrequency) * 100) / 100

  // Medicare — annual
  let medicareBaseAnnual = 0
  let medicareAdditionalAnnual = 0
  ytdGross = 0
  for (let p = 1; p <= payFrequency; p++) {
    const { base, additional } = calculateMedicare(grossPerPeriod, ytdGross, filingStatus)
    medicareBaseAnnual += base
    medicareAdditionalAnnual += additional
    ytdGross += grossPerPeriod
  }
  const medicareAnnual = Math.round((medicareBaseAnnual + medicareAdditionalAnnual) * 100) / 100
  const medicarePer = Math.round((medicareAnnual / payFrequency) * 100) / 100

  // ── State tax ────────────────────────────────────────────────
  const stateRate = getStateTaxRate(state)
  const stateTaxAnnual = Math.round(taxableIncome * stateRate * 100) / 100
  const stateTaxPer = Math.round((stateTaxAnnual / payFrequency) * 100) / 100

  // ── Employer 401(k) match (not a deduction — a benefit) ─────
  const matchableComp = salary // match is typically on base salary only
  const matchAmount = Math.min(
    matchableComp * (employerMatchPct / 100),
    matchableComp * (employerMatchCap / 100),
  )
  const employerMatchPer = Math.round((matchAmount / payFrequency) * 100) / 100

  // ── Net pay ──────────────────────────────────────────────────
  const totalDeductionsPer = federalTaxPer + ssPer + medicarePer + stateTaxPer + per401k + perHsa + perHealth + perOther
  const netPayPer = Math.round((grossPerPeriod - totalDeductionsPer) * 100) / 100
  const netPayAnnual = Math.round(netPayPer * payFrequency * 100) / 100

  // ── Effective total tax rate ─────────────────────────────────
  const totalTaxAnnual = federalTaxAnnual + ssAnnual + medicareAnnual + stateTaxAnnual
  const effectiveTotalTaxRate = totalComp > 0 ? totalTaxAnnual / totalComp : 0

  return {
    grossPay: Math.round(grossPerPeriod * 100) / 100,
    grossAnnual: totalComp,
    federalTax: federalTaxPer,
    federalTaxAnnual,
    marginalBracket,
    socialSecurity: ssPer,
    socialSecurityAnnual: Math.round(ssAnnual * 100) / 100,
    ssCapPeriod,
    medicare: medicarePer,
    medicareAnnual,
    medicareAdditional: Math.round(medicareAdditionalAnnual * 100) / 100,
    stateTax: stateTaxPer,
    stateTaxAnnual,
    contribution401k: Math.round(per401k * 100) / 100,
    contribution401kAnnual: annual401k,
    employerMatch: employerMatchPer,
    employerMatchAnnual: Math.round(matchAmount * 100) / 100,
    hsaContribution: Math.round(perHsa * 100) / 100,
    healthPremium: perHealth,
    otherPreTax: perOther,
    netPay: netPayPer,
    netPayAnnual,
    effectiveTotalTaxRate: Math.round(effectiveTotalTaxRate * 10000) / 10000,
  }
}

/**
 * Default paycheck inputs (Brandon's current situation at new job target).
 */
export const DEFAULT_PAYCHECK_INPUTS: PaycheckInputs = {
  salary: 250_000,
  bonusPercent: 30,
  payFrequency: 26,
  filingStatus: 'single',
  state: 'TX',
  taxMethod: 'bracket_calc',
  manualEffectiveRate: 22,
  contribution401k: 23_500,
  employerMatchPct: 0,
  employerMatchCap: 0,
  hsaContribution: 0,
  healthPremium: 350,
  otherPreTax: 0,
}
