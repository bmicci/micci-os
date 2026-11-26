// Paycheck calculator, checked against the Schwab offer ($240K, every other
// Friday, 5% 401(k), $205.70 of benefits per check, single, Texas).
import { describe, expect, it } from 'vitest'
import { calculateNetPay, DEFAULT_PAYCHECK_INPUTS } from '@/lib/finance/paycheck'
import { LIMIT_401K_2026 } from '@/lib/tax/brackets'

const schwab = DEFAULT_PAYCHECK_INPUTS

describe('calculateNetPay — Schwab defaults', () => {
  const r = calculateNetPay(schwab)

  it('splits $240K into 26 checks of $9,230.77', () => {
    expect(r.grossPay).toBe(9_230.77)
    expect(r.grossAnnual).toBe(240_000)
  })
  it('takes the 5% 401(k) ($461.54) and $205.70 of benefits each check', () => {
    expect(r.contribution401k).toBe(461.54)
    expect(r.contribution401kAnnual).toBe(12_000)
    expect(r.healthPremium).toBe(205.7)
  })
  it('withholds about $1,637 of federal tax a check, matching the Tax Center plan', () => {
    expect(r.federalTaxAnnual).toBe(42_552.58)
    expect(r.federalTax).toBe(1_636.64)
    expect(r.marginalBracket).toBe(0.32)
  })
  it('caps Social Security at the 2026 wage base, on check 20', () => {
    expect(r.ssCapPeriod).toBe(20)
    expect(r.socialSecurityAnnual).toBeCloseTo(184_500 * 0.062, 0) // $11,439
  })
  it('adds the 0.9% Medicare surtax on the $40K above $200K', () => {
    expect(r.medicareAdditional).toBeCloseTo(360, 0)
    expect(r.medicareAnnual).toBeCloseTo(240_000 * 0.0145 + 360, 0)
  })
  it('charges no Texas state tax', () => {
    expect(r.stateTax).toBe(0)
    expect(r.stateTaxAnnual).toBe(0)
  })
  it('counts the 5% match as a benefit, not a deduction', () => {
    expect(r.employerMatchAnnual).toBe(12_000)
    expect(r.employerMatch).toBe(461.54)
  })
  it('net pay is gross minus every deduction, averaged over the year', () => {
    const deductions = r.federalTax + r.socialSecurity + r.medicare + r.stateTax
      + r.contribution401k + r.hsaContribution + r.healthPremium + r.otherPreTax
    expect(r.netPay).toBeCloseTo(r.grossPay - deductions, 1)
    expect(r.netPayAnnual).toBeCloseTo(r.netPay * 26, 1)
    // Average check, Social Security spread over the year: about $6,300
    expect(r.netPay).toBeGreaterThan(6_200)
    expect(r.netPay).toBeLessThan(6_400)
  })
})

describe('calculateNetPay — rules', () => {
  it('caps the 401(k) at the 2026 limit', () => {
    const r = calculateNetPay({ ...schwab, contribution401k: 40_000 })
    expect(r.contribution401kAnnual).toBe(LIMIT_401K_2026)
  })
  it('a bigger 401(k) lowers federal tax by the marginal rate', () => {
    const base = calculateNetPay(schwab)
    const more = calculateNetPay({ ...schwab, contribution401k: 13_000 })
    expect(base.federalTaxAnnual - more.federalTaxAnnual).toBeCloseTo(1_000 * 0.32, 2)
  })
  it('a bonus percent raises gross pay', () => {
    expect(calculateNetPay({ ...schwab, bonusPercent: 10 }).grossAnnual).toBe(264_000)
  })
  it('the manual rate method applies a flat rate to taxable income', () => {
    const r = calculateNetPay({ ...schwab, taxMethod: 'manual_rate', manualEffectiveRate: 20 })
    expect(r.federalTaxAnnual).toBeCloseTo(206_551.8 * 0.2, 2)
    expect(r.marginalBracket).toBe(0.2)
  })
  it('the employer match is the lower of the match and the cap', () => {
    const r = calculateNetPay({ ...schwab, employerMatchPct: 6, employerMatchCap: 4 })
    expect(r.employerMatchAnnual).toBe(240_000 * 0.04)
  })
  it('a state with income tax applies its flat rate to taxable income', () => {
    const r = calculateNetPay({ ...schwab, state: 'CA' })
    expect(r.stateTaxAnnual).toBeCloseTo(206_551.8 * 0.093, 2)
  })
  it('semi-monthly pay splits the same salary into 24 checks', () => {
    expect(calculateNetPay({ ...schwab, payFrequency: 24 }).grossPay).toBe(10_000)
  })
})
