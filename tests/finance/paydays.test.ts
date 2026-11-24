// Paydays on a weekend or bank holiday land the business day before
// (Schwab's calendar pays the Jan 1, 2027 check on Dec 31, 2026; plan v17).
import { describe, expect, it } from 'vitest'
import { bankHolidays, payOnBusinessDay } from '@/lib/finance/paydays'
import { cashFlowPayFrequency, ssCapCheck } from '@/lib/finance/cashflow'

describe('payOnBusinessDay', () => {
  it('keeps an ordinary Friday', () => {
    expect(payOnBusinessDay('2026-12-04')).toBe('2026-12-04')
  })
  it("pays New Year's Day the day before, across the year end", () => {
    expect(payOnBusinessDay('2027-01-01')).toBe('2026-12-31')
  })
  it('pays Christmas Friday on Thursday', () => {
    expect(payOnBusinessDay('2026-12-25')).toBe('2026-12-24')
  })
  it('moves a Saturday or Sunday back to Friday', () => {
    expect(payOnBusinessDay('2027-01-30')).toBe('2027-01-29')
    expect(payOnBusinessDay('2027-01-31')).toBe('2027-01-29')
  })
  it('treats the Monday after a Sunday holiday as closed', () => {
    // Jul 4, 2027 is a Sunday, observed Monday Jul 5
    expect(payOnBusinessDay('2027-07-05')).toBe('2027-07-02')
  })
})

describe('bankHolidays', () => {
  it('lists the 2026 floating holidays', () => {
    const h = bankHolidays(2026)
    for (const d of ['2026-01-19', '2026-02-16', '2026-05-25', '2026-09-07', '2026-10-12', '2026-11-26']) {
      expect(h.has(d)).toBe(true)
    }
  })
})

describe('Cash Flow pay schedule', () => {
  it("uses the offer's checks per year, every two weeks when unknown", () => {
    expect(cashFlowPayFrequency(26)).toBe(26)
    expect(cashFlowPayFrequency(24)).toBe(24)
    expect(cashFlowPayFrequency(undefined)).toBe(26)
  })
  it('finds the check that reaches the Social Security wage base', () => {
    expect(ssCapCheck(240000, 26)).toBe(20) // $9,230.77 a check
    expect(ssCapCheck(240000, 24)).toBe(19) // $10,000 a check
    expect(ssCapCheck(150000, 26)).toBeNull()
    expect(ssCapCheck(0, 26)).toBe(20)
  })
})
