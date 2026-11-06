import { describe, it, expect } from 'vitest'
import { leasePayment, leaseVsBuy, type LeaseVsBuyInputs } from '@/lib/finance/calculators/lease'

describe('leasePayment', () => {
  it('depreciation + finance charge', () => {
    const p = leasePayment({ price: 50000, msrp: 50000, tradeIn: 0, salesTaxPct: 0, leaseTermMonths: 36, residualPct: 60, moneyFactor: 0.0025, capReduction: 0, acquisitionFee: 0 })
    // (50,000 − 30,000)/36 = 555.56 ; (50,000 + 30,000) × 0.0025 = 200
    expect(p.payment).toBeCloseTo(755.56, 2)
  })
  it('Texas lease tax is on the full price and rolled in; trade-in and cash down reduce the cap cost', () => {
    const p = leasePayment({ price: 50000, msrp: 50000, tradeIn: 8000, salesTaxPct: 6.25, leaseTermMonths: 36, residualPct: 60, moneyFactor: 0, capReduction: 2000, acquisitionFee: 995 })
    expect(p.tax).toBe(3125)
    expect(p.adjCap).toBe(50000 + 3125 + 995 - 2000 - 8000)
  })
})

describe('leaseVsBuy', () => {
  const base: LeaseVsBuyInputs = {
    price: 50000, msrp: 50000, tradeIn: 0, salesTaxPct: 0,
    leaseTermMonths: 36, residualPct: 60, moneyFactor: 0.0025, capReduction: 0,
    acquisitionFee: 0, dispositionFee: 400, milesPerYearAllowed: 12000, milesPerYearDriven: 15000, overagePerMile: 0.25,
    aprPct: 0, loanTermMonths: 60, loanCashDown: 0, loanFees: 0, valueAtEndPct: 60,
  }
  it('compares net cost over the lease term', () => {
    const r = leaseVsBuy(base)
    // lease: 36 × 755.56 + 400 turn-in + 3,000 mi/yr × 3 yrs × $0.25 = 27,200 + 400 + 2,250
    expect(r.lease.overageCost).toBe(2250)
    expect(r.lease.netCost).toBeCloseTo(755.5556 * 36 + 400 + 2250, 0)
    // buy at 0%: 36 × 833.33 paid, 20,000 still owed, car worth 30,000 → net 30,000 − 10,000 equity
    expect(r.buy.payment).toBeCloseTo(833.33, 2)
    expect(r.buy.balanceAtEnd).toBeCloseTo(20000, 0)
    expect(r.buy.netCost).toBeCloseTo(30000 - 10000, 0)
    expect(r.cheaper).toBe('buy')
    expect(r.monthlyPaymentGap).toBeCloseTo(833.33 - 755.56, 1)
  })
  it('trade-in counts as given up on both sides', () => {
    const a = leaseVsBuy(base), b = leaseVsBuy({ ...base, tradeIn: 8000 })
    expect(b.lease.netCost - b.buy.netCost).toBeCloseTo(
      (b.lease.totalOutOfPocket + 8000) - (b.buy.totalOutOfPocket + 8000 - b.buy.equityAtEnd), 6)
    expect(b.lease.payment).toBeLessThan(a.lease.payment)
  })
})
