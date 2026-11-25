// HELOC math (heloc.ts) and the drawdown plan (helocPlan.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculateConsolidationSavings, calculateMonthlyInterest, getNextDeadline, projectBalance,
  shouldRollToHeloc, HELOC_RATE,
} from '@/lib/finance/heloc'
import { buildHelocPlan } from '@/lib/finance/helocPlan'
import type { DebtAccount, PromoDeadline } from '@/lib/financial-data'

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 25, 12)) })
afterEach(() => { vi.useRealTimers() })

describe('HELOC interest', () => {
  it('interest-only payment on $185,950 at 6.85% is $1,061.46', () => {
    expect(calculateMonthlyInterest(185_950, HELOC_RATE)).toBe(1_061.46)
  })
  it('zero balance owes nothing', () => {
    expect(calculateMonthlyInterest(0, HELOC_RATE)).toBe(0)
  })
})

describe('projectBalance', () => {
  it('an interest-only payment keeps the balance flat', () => {
    const p = projectBalance(100_000, 0.06, 500, 3)
    expect(p.map(m => m.balance)).toEqual([100_000, 100_000, 100_000, 100_000])
    expect(p[1].interestPaid).toBe(500)
    expect(p[1].principalPaid).toBe(0)
  })
  it('a payment above interest pays principal down', () => {
    const p = projectBalance(100_000, 0.06, 1_500, 1)
    expect(p[1].principalPaid).toBe(1_000)
    expect(p[1].balance).toBe(99_000)
  })
  it('applies a scheduled draw in its month and notes it', () => {
    const p = projectBalance(100_000, 0.06, 500, 2, [{ monthOffset: 1, amount: 3_534, label: 'Chase BT4' }])
    expect(p[1].events).toEqual(['+$3,534 — Chase BT4'])
    expect(p[1].balance).toBeCloseTo(103_534 + 103_534 * 0.005 - 500, 2)
  })
  it('month 0 is today: no interest, no payment', () => {
    expect(projectBalance(50_000, 0.06, 1_000, 0)).toEqual([
      expect.objectContaining({ month: 0, balance: 50_000, interestPaid: 0, principalPaid: 0 }),
    ])
  })
  it('never goes below zero', () => {
    expect(projectBalance(100, 0.06, 1_000, 1)[1].balance).toBe(0)
  })
})

describe('consolidation and roll decisions', () => {
  it('rolling a 26% card onto the line saves the rate gap', () => {
    const s = calculateConsolidationSavings([{ balance: 10_000, monthlyPayment: 300, rate: 26 }], 0.0685)
    expect(s.newMonthlyInterest).toBe(57.08)
    expect(s.monthlyRelief).toBe(242.92)
    expect(s.annualRelief).toBe(2_915.04)
    expect(s.totalInterestSavedYear1).toBe(1_915)
  })
  it('rolls only debts that cost more than the HELOC rate', () => {
    expect(shouldRollToHeloc(26.24)).toBe(true)
    expect(shouldRollToHeloc(3.99)).toBe(false)
    expect(shouldRollToHeloc(6.85)).toBe(false)
  })
})

describe('getNextDeadline', () => {
  const accounts = [
    { name: 'Past', promoExpiry: '2026-10-09', balance: 6_447 },
    { name: 'Diamond', promoExpiry: '2027-06-18', balance: 11_411 },
    { name: 'Freedom', promoExpiry: '2026-12-12', balance: 2_684 },
    { name: 'Best Buy', promoExpiry: '2027-03-01', deferredExpiry: '2026-12-27', balance: 610, penaltyApr: 29.99 },
    { name: 'No promo', balance: 500 },
  ]
  it('picks the nearest future deadline and skips past ones', () => {
    const d = getNextDeadline(accounts)
    expect(d?.accountName).toBe('Freedom')
    expect(d?.balance).toBe(2_684)
    expect(d?.penaltyApr).toBeNull()
  })
  it('a deferred-interest date wins over the promo date on the same account', () => {
    const d = getNextDeadline(accounts.filter(a => a.name === 'Best Buy'))
    expect(d?.deadline.toISOString().slice(0, 10)).toBe('2026-12-27')
    expect(d?.penaltyApr).toBe(29.99)
  })
  it('returns null when nothing is ahead', () => {
    expect(getNextDeadline([{ name: 'Past', promoExpiry: '2026-01-01', balance: 1 }])).toBeNull()
  })
})

describe('buildHelocPlan', () => {
  const heloc: DebtAccount = { name: 'CUTX HELOC', balance: 185_950, rate: 6.85, min: 974, decision: 'keep', category: 'HELOC' }
  const card = (over: Partial<DebtAccount>): DebtAccount => ({ name: 'Card', balance: 1_000, rate: 25, min: 40, decision: 'promo', category: 'Credit Card', ...over })
  const promo = (over: Partial<PromoDeadline>): PromoDeadline => ({ name: 'Promo', balance: 1_000, expires: '2026-12-09', risk: null, acct: '', note: '', ...over })
  const asOf = new Date(2026, 10, 25)

  it('starts from the live HELOC balance and draws 2026 promos in their expiry month', () => {
    const plan = buildHelocPlan([promo({ name: 'Chase BT4', balance: 3_534, expires: '2026-12-09' })], [heloc], asOf)
    expect(plan.startBalance).toBe(185_950)
    const dec = plan.months.find(m => m.key === '2026-12')!
    expect(dec.draws.map(d => d.label)).toEqual(['Chase BT4'])
    expect(dec.endBalance).toBe(189_484)
    expect(dec.remainingLine).toBe(516)
    expect(plan.fits).toBe(true)
  })
  it('defers 2027 promos to cash flow instead of the line', () => {
    const plan = buildHelocPlan([promo({ name: 'Citi Diamond', balance: 11_411, expires: '2027-06-18' })], [heloc], asOf)
    expect(plan.totalPlannedDraws).toBe(0)
    expect(plan.excluded[0]).toMatchObject({ label: 'Citi Diamond', amount: 11_411 })
  })
  it('shows an overflow when draws exceed the $190K limit', () => {
    const plan = buildHelocPlan([promo({ balance: 6_000 })], [heloc], asOf)
    expect(plan.fits).toBe(false)
    expect(plan.lineAfterPlan).toBe(190_000 - 191_950)
  })
  it('skips promos that look paid and lands past-due ones in the current month', () => {
    const plan = buildHelocPlan([
      promo({ name: 'Looks paid', expires: '2026-10-09', likelyPaid: true }),
      promo({ name: 'Past due', balance: 200, expires: '2026-10-09' }),
    ], [heloc], asOf)
    const nov = plan.months.find(m => m.key === '2026-11')!
    expect(nov.draws.map(d => d.label)).toEqual(['Past due'])
    expect(plan.totalPlannedDraws).toBe(200)
  })
  it('rolls high-rate roll debts now, keeps keep debts off the line', () => {
    const plan = buildHelocPlan([], [
      heloc,
      card({ name: 'Old card', balance: 500, rate: 24, decision: 'roll' }),
      card({ name: 'Amex', balance: 7_000, rate: 27.49, decision: 'roll', payInFull: true }),
      { name: 'Dad loan', balance: 17_280, rate: 8.5, min: 325, decision: 'keep', category: 'Personal Loan' },
    ], asOf)
    expect(plan.months[0].draws.map(d => d.label)).toEqual(['Roll Old card (24%)'])
    expect(plan.excluded.map(e => e.label)).toEqual(['Dad loan'])
  })
  it('interest at the peak uses the 6.85% rate', () => {
    const plan = buildHelocPlan([], [heloc], asOf)
    expect(plan.peakInterestMo).toBeCloseTo(185_950 * 0.0685 / 12, 2)
    expect(plan.months.at(-1)!.key).toBe('2027-06')
  })
})
