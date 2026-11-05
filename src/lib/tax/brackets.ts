// ═══════════════════════════════════════════════════════════════════
// 2026 Federal Tax Brackets & FICA Constants
// Pure functions — no side effects, no store access
// ═══════════════════════════════════════════════════════════════════

import type { FilingStatus, TaxResult } from '@/types/finance'

// ── 2026 Brackets (IRS Rev. Proc. 2025-32) ───────────────────────
// Single figures match the Schwab compensation reference doc; MFJ/MFS/HOH
// are from the same release — verify against irs.gov before relying on them.

interface Bracket {
  min: number
  max: number
  rate: number
}

const BRACKETS_2026: Record<FilingStatus, Bracket[]> = {
  single: [
    { min: 0, max: 12_400, rate: 0.10 },
    { min: 12_400, max: 50_400, rate: 0.12 },
    { min: 50_400, max: 105_700, rate: 0.22 },
    { min: 105_700, max: 201_775, rate: 0.24 },
    { min: 201_775, max: 256_225, rate: 0.32 },
    { min: 256_225, max: 640_600, rate: 0.35 },
    { min: 640_600, max: Infinity, rate: 0.37 },
  ],
  mfj: [
    { min: 0, max: 24_800, rate: 0.10 },
    { min: 24_800, max: 100_800, rate: 0.12 },
    { min: 100_800, max: 211_400, rate: 0.22 },
    { min: 211_400, max: 403_550, rate: 0.24 },
    { min: 403_550, max: 512_450, rate: 0.32 },
    { min: 512_450, max: 768_700, rate: 0.35 },
    { min: 768_700, max: Infinity, rate: 0.37 },
  ],
  mfs: [
    { min: 0, max: 12_400, rate: 0.10 },
    { min: 12_400, max: 50_400, rate: 0.12 },
    { min: 50_400, max: 105_700, rate: 0.22 },
    { min: 105_700, max: 201_775, rate: 0.24 },
    { min: 201_775, max: 256_225, rate: 0.32 },
    { min: 256_225, max: 384_350, rate: 0.35 },
    { min: 384_350, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0, max: 17_700, rate: 0.10 },
    { min: 17_700, max: 67_450, rate: 0.12 },
    { min: 67_450, max: 105_700, rate: 0.22 },
    { min: 105_700, max: 201_750, rate: 0.24 },
    { min: 201_750, max: 256_200, rate: 0.32 },
    { min: 256_200, max: 640_600, rate: 0.35 },
    { min: 640_600, max: Infinity, rate: 0.37 },
  ],
}

// ── Standard Deductions (2026 projected) ─────────────────────────

export const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  single: 16_100,
  mfj: 32_200,
  mfs: 16_100,
  hoh: 24_150,
}

// ── FICA Constants ───────────────────────────────────────────────

export const SS_RATE = 0.062
export const SS_WAGE_BASE_2026 = 184_500
export const MEDICARE_RATE = 0.0145
export const MEDICARE_ADDITIONAL_RATE = 0.009
export const MEDICARE_ADDITIONAL_THRESHOLD: Record<FilingStatus, number> = {
  single: 200_000,
  mfj: 250_000,
  mfs: 125_000,
  hoh: 200_000,
}

// ── 401(k) Limits ────────────────────────────────────────────────

export const LIMIT_401K_2026 = 24_500
export const LIMIT_401K_CATCHUP_2026 = 8_000 // age 50+
export const LIMIT_HSA_INDIVIDUAL_2026 = 4_400
export const LIMIT_HSA_FAMILY_2026 = 8_750

// ── Bracket Calculation ──────────────────────────────────────────

/**
 * Calculate federal income tax using progressive brackets.
 * @param taxableIncome - AGI minus deductions
 * @param filingStatus - Filing status for bracket selection
 * @returns Tax amount, marginal bracket rate, and effective rate
 */
export function calculateFederalTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
): TaxResult {
  if (taxableIncome <= 0) {
    return { federalTax: 0, marginalBracket: 0.10, effectiveRate: 0 }
  }

  const brackets = BRACKETS_2026[filingStatus]
  let tax = 0
  let marginalBracket = brackets[0].rate

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
    tax += taxableInBracket * bracket.rate
    marginalBracket = bracket.rate
  }

  return {
    federalTax: Math.round(tax * 100) / 100,
    marginalBracket,
    effectiveRate: taxableIncome > 0 ? tax / taxableIncome : 0,
  }
}

/**
 * Calculate Social Security tax for a single pay period.
 * Accounts for the annual wage base cap.
 * @returns Tax amount and the pay period number where SS caps out (null if no cap this period)
 */
export function calculateSocialSecurity(
  grossPayPerPeriod: number,
  ytdGross: number,
): { amount: number; cappedAt: number | null } {
  const remainingBase = Math.max(0, SS_WAGE_BASE_2026 - ytdGross)

  if (remainingBase <= 0) {
    return { amount: 0, cappedAt: null }
  }

  const taxableThisPeriod = Math.min(grossPayPerPeriod, remainingBase)
  const amount = Math.round(taxableThisPeriod * SS_RATE * 100) / 100

  // Did we cap out this period?
  const cappedAt = grossPayPerPeriod > remainingBase ? 1 : null

  return { amount, cappedAt }
}

/**
 * Calculate Medicare tax for a single pay period.
 * Includes Additional Medicare Tax (0.9%) on wages over threshold.
 */
export function calculateMedicare(
  grossPayPerPeriod: number,
  ytdGross: number,
  filingStatus: FilingStatus,
): { base: number; additional: number } {
  const base = Math.round(grossPayPerPeriod * MEDICARE_RATE * 100) / 100

  const threshold = MEDICARE_ADDITIONAL_THRESHOLD[filingStatus]
  const additionalTaxableYtd = Math.max(0, ytdGross + grossPayPerPeriod - threshold)
  const additionalTaxablePrev = Math.max(0, ytdGross - threshold)
  const additionalTaxableThisPeriod = additionalTaxableYtd - additionalTaxablePrev
  const additional = Math.round(additionalTaxableThisPeriod * MEDICARE_ADDITIONAL_RATE * 100) / 100

  return { base, additional }
}

/**
 * Determine which pay period Social Security tax caps out.
 * Useful for the 12-month projection (net pay increases after cap).
 */
export function getSocialSecurityCapPeriod(
  grossPayPerPeriod: number,
  payFrequency: number,
): number | null {
  if (grossPayPerPeriod <= 0) return null

  let ytdGross = 0
  for (let period = 1; period <= payFrequency; period++) {
    ytdGross += grossPayPerPeriod
    if (ytdGross >= SS_WAGE_BASE_2026) {
      return period
    }
  }
  return null // doesn't cap out (salary too low)
}
