import { describe, it, expect } from 'vitest'
import {
  parseMasterPlan, planIndexAt, monthEnd, reconcile, pace, deadlineStatus, chartSeries, milestoneStatus,
  type MasterPlan, type LiveDebt,
} from '@/lib/finance/masterPlan'

const proj = (debt: number[], accounts: Record<string, number[]>) => ({ debt, cards: debt, savings: debt.map(() => 0), interest: debt.map(() => 0), accounts })

const plan: MasterPlan = {
  base_case: { strategy: 'A' },
  start: { date: '2026-11-30', non_mortgage_debt: 3000 },
  milestones: [
    { key: 'cards_cleared', label: 'All promo cards cleared', target: '2028-03' },
    { key: 'heloc_paid', label: 'HELOC paid off', target: '2033-10' },
  ],
  deadlines: [
    { date: '2026-12-09', what: 'Card A promo ends', amount: 1000, account: 'card_a', kind: 'promo' },
    { date: '2027-06-18', what: 'Card B promo ends', amount: 500, account: 'card_b', kind: 'promo' },
    { date: '2026-11-01', what: 'Already past' },
  ],
  tradeoffs: [], next_60_days: [], risks: [],
  excluded_accounts: [{ match: { last4: '5007' }, reason: 'Paid in full' }],
  months: ['2026-12', '2027-01'],
  accounts: [
    { key: 'card_a', label: 'Card A ···1111', match: { last4: '1111' }, start: 1000, promo_ends: '2026-12-09' },
    { key: 'card_b', label: 'Card B ···2222', match: { last4: '2222' }, start: 500, promo_ends: '2027-06-18' },
    { key: 'heloc', label: 'HELOC', match: { category: 'HELOC' }, start: 1500 },
  ],
  projection: {
    A: proj([2500, 2000], { card_a: [0, 0], card_b: [500, 400], heloc: [1500, 1500] }),
    B: proj([2400, 1900], {}),
    C: proj([2900, 2800], {}),
  },
}

const live: LiveDebt[] = [
  { name: 'Chase CREDIT CARD ···1111', balance: 1000, category: 'Credit Card', source: 'live', asOf: '2026-11-06' },
  { name: 'Card B (2222)', balance: 450, category: 'Credit Card', source: 'manual', stale: true },
  { name: 'Texas CU HELOC', balance: 1500, category: 'HELOC', source: 'manual' },
  { name: 'Amex Gold ···5007', balance: 4000, category: 'Credit Card', source: 'live' },
  { name: 'New BT card ···9999', balance: 300, category: 'Credit Card', source: 'live' },
  { name: 'Mortgage', balance: 400000, category: 'Mortgage' },
]

describe('parseMasterPlan', () => {
  it('reads a v8 plan and rejects one without a projection (v5)', () => {
    expect(parseMasterPlan({ version: 8, master_plan: plan })?.months).toEqual(['2026-12', '2027-01'])
    expect(parseMasterPlan({ version: 5, assumptions: {} })).toBeNull()
    expect(parseMasterPlan({ master_plan: { ...plan, projection: { A: { debt: [1] } } } })).toBeNull()
  })
})

describe('plan timing', () => {
  it('uses the latest month-end on or before today', () => {
    expect(monthEnd('2027-02')).toBe('2027-02-28')
    expect(planIndexAt(plan, '2026-11-07')).toBe(-1)
    expect(planIndexAt(plan, '2026-12-31')).toBe(0)
    expect(planIndexAt(plan, '2027-01-15')).toBe(0)
    expect(planIndexAt(plan, '2027-03-01')).toBe(1)
  })
})

describe('reconcile', () => {
  it('before the first month-end, compares live balances with the start balances', () => {
    const r = reconcile(plan, live, 'A', '2026-11-07')
    expect(r.asOfPlan).toBe('2026-11-30')
    expect(r.planTotal).toBe(3000)
    expect(r.rows.find(x => x.key === 'card_a')).toMatchObject({ plan: 1000, actual: 1000, diff: 0, source: 'live' })
    expect(r.rows.find(x => x.key === 'card_b')).toMatchObject({ plan: 500, actual: 450, stale: true })
    expect(r.excluded.map(e => e.debt.name)).toEqual(['Amex Gold ···5007'])
    expect(r.unplanned.map(d => d.name)).toEqual(['New BT card ···9999'])
    // 1000 + 450 + 1500 + 300 (unplanned) ; mortgage and pay-in-full left out
    expect(r.actualTotal).toBe(3250)
    expect(r.diff).toBe(250)
  })
  it('after a month-end, uses that month’s plan balances', () => {
    const r = reconcile(plan, live, 'A', '2027-01-05')
    expect(r.planTotal).toBe(2500)
    expect(r.rows.find(x => x.key === 'card_a')?.plan).toBe(0)
  })
  it('pace has a ±$500 band', () => {
    expect(pace(250)).toBe('on_track')
    expect(pace(-900)).toBe('ahead')
    expect(pace(900)).toBe('behind')
  })
})

describe('deadlines and milestones', () => {
  const r = reconcile(plan, live, 'A', '2026-11-07')
  it('flags near promo deadlines with a balance as urgent and sorts by date', () => {
    expect(deadlineStatus(plan, r, '2026-11-07').map(x => x.status)).toEqual(['past', 'upcoming', 'upcoming'])
    const d = deadlineStatus(plan, r, '2026-11-20')
    expect(d.map(x => x.status)).toEqual(['past', 'urgent', 'upcoming'])
    expect(d[1]).toMatchObject({ daysLeft: 19, liveBalance: 1000 })
  })
  it('a promo card already at $0 shows as cleared', () => {
    const paid = reconcile(plan, live.map(x => x.name.includes('1111') ? { ...x, balance: 0 } : x), 'A', '2026-11-07')
    expect(deadlineStatus(plan, paid, '2026-11-07').find(x => x.account === 'card_a')?.status).toBe('cleared')
  })
  it('cards-cleared milestone counts promo cards plus unplanned cards', () => {
    const m = milestoneStatus(plan, r, 'A', '2026-11-07')
    expect(m[0]).toMatchObject({ done: false, monthsLeft: 16, note: '$1,750 left on promo cards' })
  })
  it('chart starts at the plan start and marks today’s actual', () => {
    const c = chartSeries(plan, 3250, '2026-11-07')
    expect(c[0]).toEqual({ month: '2026-11', A: 3000, B: 3000, C: 3000, actual: 3250 })
    expect(c).toHaveLength(3)
  })
})
