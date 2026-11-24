// The Money brief's compact inputs: what's due, big charges, pace, next payday.
import { describe, expect, it } from 'vitest'
import { buildMoneyBriefInputs, nextPayday, renderMoneyBriefInputs, type MoneyBriefSource } from '@/lib/finance/moneyBrief'

const TODAY = '2026-11-23'

const src = (over: Partial<MoneyBriefSource> = {}): MoneyBriefSource => ({
  assets: { cash: 3000, savings: 2000 },
  runwayProjection: {
    cashOutDate: null,
    shortfall: null,
    employment: { employer: 'Schwab', firstPayday: '2026-11-30', netPerCheck: 4000, monthlySurplus: 900, lowPointCash: 1200, lowPointDate: '2026-11-29' },
  } as unknown as MoneyBriefSource['runwayProjection'],
  upcoming: [
    { date: '2026-12-15', daysAway: 22, kind: 'bill', label: 'Too far', amount: 50, urgent: false },
    { date: '2026-11-25', daysAway: 2, kind: 'bill', label: 'Electric', amount: 140, urgent: true },
    { date: '2026-12-01', daysAway: 8, kind: 'bill', label: 'Rent', amount: 2100, urgent: false },
  ] as MoneyBriefSource['upcoming'],
  burnAnalysis: { hasData: true, monthlySpend: 3000 },
  promos: [],
  debts: [{ name: 'Car loan', stale: true, asOf: '2026-09-01' }, { name: 'Card', stale: false }],
  actionItems: [],
  ...over,
})

describe('nextPayday', () => {
  it('returns the first payday when it is still ahead', () => {
    expect(nextPayday('2026-11-30', 14, TODAY)).toBe('2026-11-30')
  })
  it('steps forward by the pay period once it has passed', () => {
    expect(nextPayday('2026-11-02', 14, TODAY)).toBe('2026-11-30')
    expect(nextPayday('2026-11-09', 14, TODAY)).toBe('2026-11-23')
  })
})

describe('buildMoneyBriefInputs', () => {
  const recent = [
    { transaction_date: '2026-11-22', amount: 600, category: 'Shopping', merchant: 'Big Store' },
    { transaction_date: '2026-11-21', amount: 300, category: 'Transfer', merchant: 'To savings' },
    { transaction_date: '2026-11-10', amount: 900, category: 'Shopping', merchant: 'Too old' },
    { transaction_date: '2026-11-20', amount: 40, category: 'Dining', merchant: 'Cafe' },
  ]
  const i = buildMoneyBriefInputs(src(), recent, TODAY)

  it('keeps only the next 14 days, soonest first', () => {
    expect(i.dueSoon.map(u => u.label)).toEqual(['Electric', 'Rent'])
    expect(i.dueSoonTotal).toBe(2240)
  })
  it('flags recent big charges but not transfers or old ones', () => {
    expect(i.bigCharges.map(c => c.merchant)).toEqual(['Big Store'])
  })
  it('works out cash, payday, pace and stale balances', () => {
    expect(i.cash.liquid).toBe(5000)
    expect(i.income?.nextPayday).toBe('2026-11-30')
    expect(i.typicalWeek).toBe(700)
    expect(i.staleBalances).toEqual(['Car loan (2026-09-01)'])
  })
  it('renders a short summary', () => {
    const md = renderMoneyBriefInputs(i)
    expect(md).toContain('Electric')
    expect(md).toContain('Big Store')
    expect(md.length).toBeLessThan(2000)
  })
})
