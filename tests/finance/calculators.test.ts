// Calculators section: engines checked against Strategic Financial Plan v5's own numbers.
import { describe, expect, it } from 'vitest'
import { carLoan, monthlyPayment, balanceAfter } from '@/lib/finance/calculators/loan'
import { simulatePayoff } from '@/lib/finance/calculators/payoff'
import { k401Calc, SCHWAB_DEFAULTS } from '@/lib/finance/calculators/k401'
import { subscriptionSaving, totalMonthlySavings } from '@/lib/finance/calculators/savings'

const car = (price: number, ins: number, term = 60) => carLoan({
  price, tradeIn: 8000, cashDown: 0, salesTaxPct: 6.25, fees: 500, aprPct: 3.99, termMonths: term,
  insuranceIncrease: ins, valueAfter3yPct: 55,
})

describe('car loan (plan v5 section 7)', () => {
  it('finances $45,125 / $71,688 / $98,250 for the three tiers', () => {
    expect(Math.round(car(50000, 125).financed)).toBe(45125)
    expect(Math.round(car(75000, 200).financed)).toBe(71688)
    expect(Math.round(car(100000, 275).financed)).toBe(98250)
  })
  it('60-month payments are $831 / $1,320 / $1,809', () => {
    expect(Math.round(car(50000, 125).payment)).toBe(831)
    expect(Math.round(car(75000, 200).payment)).toBe(1320)
    expect(Math.round(car(100000, 275).payment)).toBe(1809)
  })
  it('72-month payment on the $50K car is about $706', () => {
    expect(Math.round(car(50000, 125, 72).payment)).toBe(706)
  })
  it('3-year numbers match the plan ($19,135 balance, ~$34,000 cost)', () => {
    const r = car(50000, 125)
    expect(Math.round(r.balanceAfter3y)).toBe(19135)
    expect(Math.round(r.valueAfter3y)).toBe(27500)
    expect(Math.abs(r.threeYearCost - 34000)).toBeLessThan(150)
    expect(Math.round(r.totalInterest)).toBe(4726)
  })
  it('amortization helpers agree', () => {
    expect(balanceAfter(10000, 5, 60, 60)).toBeCloseTo(0, 4)
    expect(monthlyPayment(1200, 0, 12)).toBe(100)
  })
})

describe('debt payoff simulator', () => {
  const d = (id: string, balance: number, apr: number, minPayment: number) => ({ id, name: id, balance, apr, minPayment })
  it('pays a 0% debt in balance / payment months', () => {
    const r = simulatePayoff({ debts: [d('a', 1000, 0, 100)], extraMonthly: 0, strategy: 'avalanche' })
    expect(r.months).toBe(10)
    expect(r.totalInterest).toBe(0)
  })
  it('avalanche targets the highest APR and costs less interest than snowball here', () => {
    const debts = [d('big-low', 5000, 5, 100), d('small-high', 1000, 25, 50)]
    const av = simulatePayoff({ debts, extraMonthly: 200, strategy: 'avalanche' })
    const sn = simulatePayoff({ debts, extraMonthly: 200, strategy: 'snowball' })
    expect(av.order[0]).toBe('small-high')
    expect(av.totalInterest).toBeLessThanOrEqual(sn.totalInterest)
  })
  it('extra payments and lump sums shorten the payoff and cut interest', () => {
    const debts = [d('card', 10000, 20, 250)]
    const base = simulatePayoff({ debts, extraMonthly: 0, strategy: 'avalanche' })
    const extra = simulatePayoff({ debts, extraMonthly: 300, strategy: 'avalanche' })
    const lump = simulatePayoff({ debts, extraMonthly: 0, strategy: 'avalanche', lumps: [{ month: 3, amount: 5000 }] })
    expect(extra.months!).toBeLessThan(base.months!)
    expect(lump.months!).toBeLessThan(base.months!)
    expect(extra.totalInterest).toBeLessThan(base.totalInterest)
  })
  it('reports null when minimums never cover interest', () => {
    const r = simulatePayoff({ debts: [d('stuck', 100000, 30, 100)], extraMonthly: 0, strategy: 'avalanche', maxMonths: 120 })
    expect(r.months).toBeNull()
  })
  it('frees up a paid-off minimum for the next debt (roll-over)', () => {
    const r = simulatePayoff({ debts: [d('a', 500, 0, 100), d('b', 2000, 0, 100)], extraMonthly: 0, strategy: 'snowball' })
    expect(r.payoffMonth.a).toBe(5)
    expect(r.months).toBe(13) // 5 months at 200 total, then b at 200/mo: 2000 - 500 = 1500 left → 8 more months → hits 13
  })
})

describe('401(k) calculator (Schwab rules)', () => {
  it('5% of base earns the full $12,250 match (5% + $250 kicker)', () => {
    const r = k401Calc({ ...SCHWAB_DEFAULTS, basePct: 5 })
    expect(r.baseDeferral).toBe(12000)
    expect(r.match).toBe(12250)
  })
  it('contributions above 5% earn no extra match and stop at the limit', () => {
    const r = k401Calc({ ...SCHWAB_DEFAULTS, basePct: 20, limit: 25500 })
    expect(r.baseDeferral).toBe(25500)
    expect(r.match).toBe(12250)
  })
  it('a bonus deferral is matched too (bonus years)', () => {
    const r = k401Calc({ ...SCHWAB_DEFAULTS, bonusPct: 25, basePct: 5, bonusDeferPct: 5 })
    expect(r.match).toBe(15250)
  })
  it('contributing more lowers take-home by less than the extra deferral (tax saving)', () => {
    const lo = k401Calc({ ...SCHWAB_DEFAULTS, basePct: 5 })
    const hi = k401Calc({ ...SCHWAB_DEFAULTS, basePct: 10.6 })
    const extra = hi.totalDeferral - lo.totalDeferral
    const cashCost = lo.netAnnual - hi.netAnnual
    expect(cashCost).toBeGreaterThan(0)
    expect(cashCost).toBeLessThan(extra)
  })
  it('early-year base check is near the plan (~$6,257 at 5%)', () => {
    const r = k401Calc({ ...SCHWAB_DEFAULTS, basePct: 5 })
    expect(r.netPerCheckEarly).toBeGreaterThan(6100)
    expect(r.netPerCheckEarly).toBeLessThan(6450)
  })
})

describe('bill / subscription savings', () => {
  it('cancel saves the full amount, switch saves the difference, keep saves nothing', () => {
    expect(subscriptionSaving(15, 'cancel')).toBe(15)
    expect(subscriptionSaving(247, 'switch', 28)).toBe(219)
    expect(subscriptionSaving(17, 'keep')).toBe(0)
  })
  it('sums only the items switched on', () => {
    expect(totalMonthlySavings([
      { id: 'a', name: 'a', monthly: 10, savings: 10, on: true },
      { id: 'b', name: 'b', monthly: 20, savings: 20, on: false },
    ])).toBe(10)
  })
})

import { estimateReturn, TAX_PLAN_2026_FALLBACK } from '@/lib/tax/estimate'
describe('2026 tax estimate (plan v5 section 13)', () => {
  it('Dec 31 property-tax payment: ~$9,700 refund on $91,152 taxable', () => {
    const r = estimateReturn(TAX_PLAN_2026_FALLBACK, true)
    expect(r.agi).toBe(137457)
    expect(r.withheld).toBe(24470)
    expect(r.itemized).toBe(46295)
    expect(Math.round(r.tax)).toBeGreaterThan(14700)
    expect(Math.round(r.tax)).toBeLessThan(14800)
    expect(Math.round(r.refund / 100) * 100).toBe(9700)
  })
  it('waiting until January: ~$6,400 refund', () => {
    const r = estimateReturn(TAX_PLAN_2026_FALLBACK, false)
    expect(Math.round(r.refund / 100) * 100).toBe(6400)
  })
})

import { plannedCashEvents } from '@/lib/finance/cashEvents'
import { computeRunwayProjection } from '@/lib/finance/txnAggregate'
import type { DebtAccount, PromoDeadline } from '@/lib/financial-data'
describe('runway: dated one-time outflows', () => {
  const card = (name: string, balance: number): DebtAccount => ({ name, balance, rate: 0, min: 40, decision: 'promo', category: 'Credit Card', source: 'live' })
  const promo = (name: string, acct: string, balance: number, expires: string): PromoDeadline => ({ name, acct, balance, expires, risk: null, note: '' })
  it('includes the property tax and soon-due promos, capped at the card balance', () => {
    const ev = plannedCashEvents(
      [promo('FU BT4', 'Chase Freedom Unlim (7117)', 3985.8, '2026-12-09'), promo('Citi Diamond', 'Citi Diamond (4205)', 11411, '2027-06-18')],
      [card('Chase Freedom Unlimited (7117)', 3574), card('Citi Diamond 4205', 11411)],
      { plan_amount: 15000, pay_by: '2026-12-31', taxes_paid: false },
      '2026-11-05')
    expect(ev).toEqual([
      { date: '2026-12-09', amount: -3574, label: 'Pay off FU BT4' },
      { date: '2026-12-31', amount: -15000, label: 'Property tax (planned payment)' },
    ])
  })
  it('a big dated payment can push the cash-out date even with a job', () => {
    const pay = { employer: 'Schwab', firstPayday: '2026-11-30', periodDays: 14, netPerCheck: 6257, monthlyNet: 13557 }
    const today = new Date(2026, 10, 5)
    const without = computeRunwayProjection(9000, 9800, 0, null, today, pay)
    const withTax = computeRunwayProjection(9000, 9800, 0, null, today, pay, [{ date: '2026-12-31', amount: -15000, label: 'Property tax' }])
    expect(without.cashOutDate).toBeNull()
    expect(withTax.cashOutDate).toBe('2026-12-31')
  })
})
