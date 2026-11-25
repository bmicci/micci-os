// 2026 federal brackets and FICA (IRS Rev. Proc. 2025-32 figures in brackets.ts).
import { describe, expect, it } from 'vitest'
import {
  calculateFederalTax, calculateMedicare, calculateSocialSecurity, getSocialSecurityCapPeriod,
  SS_WAGE_BASE_2026,
} from '@/lib/tax/brackets'
import { getStateTaxRate, NO_INCOME_TAX_STATES } from '@/lib/tax/state'

describe('federal brackets (single, 2026)', () => {
  it('owes nothing on zero or negative taxable income', () => {
    expect(calculateFederalTax(0, 'single').federalTax).toBe(0)
    expect(calculateFederalTax(-500, 'single').federalTax).toBe(0)
  })
  it('taxes each bracket edge exactly', () => {
    expect(calculateFederalTax(12_400, 'single')).toMatchObject({ federalTax: 1_240, marginalBracket: 0.10 })
    expect(calculateFederalTax(50_400, 'single')).toMatchObject({ federalTax: 5_800, marginalBracket: 0.12 })
    expect(calculateFederalTax(105_700, 'single')).toMatchObject({ federalTax: 17_966, marginalBracket: 0.22 })
    expect(calculateFederalTax(201_775, 'single')).toMatchObject({ federalTax: 41_024, marginalBracket: 0.24 })
  })
  it('one dollar over an edge moves the marginal rate', () => {
    expect(calculateFederalTax(50_401, 'single').marginalBracket).toBe(0.22)
    expect(calculateFederalTax(50_401, 'single').federalTax).toBeCloseTo(5_800.22, 2)
  })
  it('Schwab year: $206,551.80 taxable owes $42,552.58 (32% bracket)', () => {
    // $240K - $12K 401(k) - 26 x $205.70 benefits - $16,100 standard deduction
    const r = calculateFederalTax(206_551.8, 'single')
    expect(r.federalTax).toBe(42_552.58)
    expect(r.marginalBracket).toBe(0.32)
    expect(r.effectiveRate).toBeCloseTo(0.206, 3)
  })
  it('married filing jointly doubles the low brackets', () => {
    expect(calculateFederalTax(24_800, 'mfj').federalTax).toBe(2_480)
  })
})

describe('Social Security', () => {
  it('charges 6.2% under the wage base', () => {
    expect(calculateSocialSecurity(10_000, 0)).toEqual({ amount: 620, cappedAt: null })
  })
  it('charges only the slice left under the base in the period it caps out', () => {
    const r = calculateSocialSecurity(10_000, SS_WAGE_BASE_2026 - 4_000)
    expect(r.amount).toBe(248)
    expect(r.cappedAt).toBe(1)
  })
  it('charges nothing once the base is reached', () => {
    expect(calculateSocialSecurity(10_000, SS_WAGE_BASE_2026)).toEqual({ amount: 0, cappedAt: null })
  })
  it('a $9,230.77 check every other week caps out on check 20', () => {
    expect(getSocialSecurityCapPeriod(9_230.77, 26)).toBe(20)
  })
  it('a salary under the base never caps out', () => {
    expect(getSocialSecurityCapPeriod(3_000, 26)).toBeNull()
    expect(getSocialSecurityCapPeriod(0, 26)).toBeNull()
  })
})

describe('Medicare', () => {
  it('charges 1.45% with no surtax under $200K (single)', () => {
    expect(calculateMedicare(10_000, 0, 'single')).toEqual({ base: 145, additional: 0 })
  })
  it('adds 0.9% only on the part of a check above $200K year to date', () => {
    expect(calculateMedicare(10_000, 195_000, 'single')).toEqual({ base: 145, additional: 45 })
    expect(calculateMedicare(10_000, 210_000, 'single').additional).toBe(90)
  })
  it('uses the $250K threshold for married filing jointly', () => {
    expect(calculateMedicare(10_000, 210_000, 'mfj').additional).toBe(0)
  })
})

describe('state income tax', () => {
  it('Texas has none, and lookups ignore case', () => {
    expect(getStateTaxRate('TX')).toBe(0)
    expect(getStateTaxRate('ca')).toBe(0.093)
    expect(NO_INCOME_TAX_STATES).toContain('TX')
  })
  it('an unknown code is treated as no state tax', () => {
    expect(getStateTaxRate('ZZ')).toBe(0)
  })
})
