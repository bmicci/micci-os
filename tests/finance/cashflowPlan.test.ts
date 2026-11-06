import { describe, it, expect } from 'vitest'
import { generatePaydays, projectCashFlowPlan, debtPaymentLines, livingLines } from '@/lib/finance/cashflowPlan'
import type { DebtAccount } from '@/lib/financial-data'

describe('generatePaydays', () => {
  it('semi-monthly: 15th and last day, starting at the first payday', () => {
    expect(generatePaydays('2026-11-30', 24, '2027-02-28')).toEqual([
      '2026-11-30', '2026-12-15', '2026-12-31', '2027-01-15', '2027-01-31', '2027-02-15', '2027-02-28',
    ])
  })
  it('biweekly: every 14 days', () => {
    expect(generatePaydays('2026-11-27', 26, '2026-12-31')).toEqual(['2026-11-27', '2026-12-11', '2026-12-25'])
  })
})

describe('projectCashFlowPlan', () => {
  const base = {
    todayIso: '2026-11-05',
    startingCash: 8276,
    paydays: generatePaydays('2026-11-30', 24, '2027-12-31'),
    netPerCheck: 6736,
    grossPerCheck: 10000,
    ssPerCheck: 620,
    ssWageBase: 184500,
    monthlyDebtPayments: 3000,
    monthlyLiving: 6000,
    events: [{ date: '2026-12-31', amount: -15000, label: 'Property tax' }],
  }

  it('first month is prorated and gets one check; the low point lands just before payday', () => {
    const p = projectCashFlowPlan({ ...base, events: [] })
    const nov = p.months[0]
    expect(nov.partial).toBe(true)
    expect(nov.checks).toBe(1)
    expect(nov.living).toBeCloseTo(6000 * 26 / 30, 0)
    expect(p.lowPoint.date).toBe('2026-11-29')
    expect(p.lowPoint.cash).toBeCloseTo(8276 - 9000 * 25 / 30, 0)
  })

  it('applies dated events in their month', () => {
    const dec = projectCashFlowPlan(base).months[1]
    expect(dec.checks).toBe(2)
    expect(dec.oneTime).toBe(-15000)
    expect(dec.eventLabels).toEqual(['Property tax'])
    expect(dec.net).toBeCloseTo(2 * 6736 - 9000 - 15000, 0)
  })

  it('adds Social Security back once the year passes the wage base', () => {
    const months = projectCashFlowPlan(base).months
    // 2027: check 19 (Oct 15) crosses $184.5K with 55% of it over; Oct 31 onward fully over
    const sep = months.find(m => m.key === '2027-09')!
    const oct = months.find(m => m.key === '2027-10')!
    expect(sep.income).toBeCloseTo(2 * 6736, 0)
    expect(oct.income).toBeCloseTo(2 * 6736 + 620 * 1.55, 0)
  })
})

describe('plan lines', () => {
  const d = (name: string, balance: number, min: number | null, extra: Partial<DebtAccount> = {}): DebtAccount =>
    ({ name, balance, rate: 0, min, decision: 'keep', category: 'Credit Card', ...extra })
  it('debt minimums skip paid-off, pay-in-full and no-minimum accounts', () => {
    const lines = debtPaymentLines([
      d('Mortgage', 490000, 2487, { category: 'Mortgage' }),
      d('Gold', 4000, 115, { payInFull: true }),
      d('Old card', 0, 40),
      d('PayPal', 510, null),
      d('Citi', 11411, 114),
    ])
    expect(lines.map(l => l.label)).toEqual(['Mortgage', 'Citi'])
  })
  it('living costs exclude the Debt Service category', () => {
    expect(livingLines([{ cat: 'Debt Service', monthly: 2754 }, { cat: 'Food & Dining', monthly: 1974.4 }]))
      .toEqual([{ id: 'cat:Food & Dining', label: 'Food & Dining', amount: 1974 }])
  })
})

import { applySpendExclusions, parseSpendExclusions } from '@/lib/finance/txnAggregate'
describe('spend exclusions', () => {
  const rows = [
    { transaction_date: '2026-08-13', amount: 1332.64, category: 'Business Services', merchant: 'BMW' },
    { transaction_date: '2026-09-02', amount: 80, category: 'Transportation', merchant: 'BMW' },
    { transaction_date: '2026-10-01', amount: 456.66, category: 'Business Services', merchant: 'Blue Cross Blue Shield' },
    { transaction_date: '2026-10-02', amount: 12, category: 'Food & Dining', merchant: 'Cafe' },
  ]
  it('drops ended bills everywhere and one-offs only on their dates', () => {
    const rules = parseSpendExclusions([{ match: 'blue cross blue shield' }, { match: 'BMW', dates: ['2026-08-13'] }, { match: 'x' }, null])
    expect(rules).toHaveLength(2)
    expect(applySpendExclusions(rows, rules).map(r => r.merchant + ' ' + r.transaction_date))
      .toEqual(['BMW 2026-09-02', 'Cafe 2026-10-02'])
  })
})

import { estimateNetWorthGrowth } from '@/lib/finance/netWorth'
describe('net-worth growth', () => {
  it('is left-over cash plus principal inside amortizing minimums', () => {
    const debts = [
      { name: 'Mortgage', balance: 480000, rate: 3, min: 2400, decision: 'keep', category: 'Mortgage' },  // 1,200 interest → 1,200 principal
      { name: 'HELOC', balance: 186000, rate: 6.85, min: 974, decision: 'keep', category: 'HELOC' },      // payment < interest → 0
      { name: 'Gold', balance: 4000, rate: 27, min: 115, decision: 'keep', category: 'Credit Card', payInFull: true },
    ] as Parameters<typeof estimateNetWorthGrowth>[0]
    const burn = { hasData: true, monthlyOutflow: 11000 } as Parameters<typeof estimateNetWorthGrowth>[1]
    const offers = [{ offer: { status: 'accepted' }, monthlyNetAvg: 13758 }] as Parameters<typeof estimateNetWorthGrowth>[2]
    expect(estimateNetWorthGrowth(debts, burn, offers)).toEqual({ monthly: 3958, surplus: 2758, principal: 1200, takeHome: 13758, outflow: 11000 })
  })
})
