import { describe, it, expect } from 'vitest'
import {
  parseMasterPlan, planIndexAt, monthEnd, reconcile, pace, deadlineStatus, chartSeries, milestoneStatus,
  cardTracker, nextCardToClear, ledgerView, monthTable, headline, clearedMonth, reachedMonth,
  type MasterPlan, type LiveDebt, type CashLedger,
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
    // the fixture's card series never reaches $0, so the stated month stands
    expect(m[0]).toMatchObject({ done: false, target: '2028-03', monthsLeft: 16, note: '$1,750 left on promo cards' })
  })
  it('chart starts at the plan start and marks today’s actual', () => {
    const c = chartSeries(plan, 3250, '2026-11-07')
    expect(c[0]).toEqual({ month: '2026-11', A: 3000, B: 3000, C: 3000, actual: 3250 })
    expect(c).toHaveLength(3)
  })
})

// ── v16: card tracker, cash ledger, month table, headline ───────────────────

const ledger: CashLedger = {
  cases: { a: 'Gift late', b: 'Gift early' },
  start: { date: '2026-11-15', balance: 2000 },
  rows: [
    { date: '2026-11-21', item: 'Loan', a: -300, a_balance: 1700, b: -300, b_balance: 1700 },
    { date: '2026-11-27', item: 'Gift (B only)', a: 0, a_balance: 1700, b: 15000, b_balance: 16700 },
    { date: '2026-11-30', item: 'Paycheck', a: 6750, a_balance: 8450, b: 6750, b_balance: 23450 },
    { date: '2026-12-15', item: 'Mortgage', a: -8000, a_balance: 450, b: -8000, b_balance: 15450 },
    { date: '2026-12-31', item: 'Paycheck', a: 6750, a_balance: 7200, b: 6750, b_balance: 22200 },
  ],
}

const v16: MasterPlan = {
  ...plan,
  kpis: { spare_month_2027: { A: 813, B: 1696, C: 259 }, savings_target: 10000, heloc_limit: 2000, heloc_payment: 2182, heloc_payment_from: '2028-04-01' },
  cash_ledger: ledger,
  milestones: [
    { key: 'cards_cleared', label: 'All promo cards cleared', target: '2027-10' },
    { key: 'card_a_cleared', label: 'Card A paid', target: '2027-06', kind: 'accounts', accounts: ['card_a'] },
    { key: 'savings_1k', label: 'Savings $1,000', target: '2029-12', savings: 1000 },
    { key: 'heloc_paid', label: 'HELOC paid off', target: '2030-08' },
  ],
  projection: {
    A: { ...proj([2500, 1500], { card_a: [0, 0], card_b: [500, 0], heloc: [1500, 1500] }), cards: [500, 0], savings: [500, 1000],
      checking: [4000, 4000], inflows: [13000, 13500], outflows: [11000, 11500], extra: [0, 900], card_mins: [50, 0] },
    B: proj([2400, 1900], { card_a: [0, 0], card_b: [400, 300], heloc: [1500, 0] }),
    C: proj([2900, 2800], {}),
  },
}

describe('v16 plan data', () => {
  it('parse keeps kpis and the ledger, and drops a malformed ledger', () => {
    const p = parseMasterPlan({ version: 16, master_plan: v16 })
    expect(p?.kpis?.spare_month_2027?.A).toBe(813)
    expect(p?.cash_ledger?.rows).toHaveLength(5)
    expect(parseMasterPlan({ master_plan: { ...v16, cash_ledger: { rows: 'x' } } })?.cash_ledger).toBeUndefined()
  })
  it('finds the month a balance clears or a level is reached', () => {
    expect(clearedMonth([500, 0], v16.months)).toBe('2027-01')
    expect(clearedMonth([500, 400], v16.months)).toBeNull()
    expect(reachedMonth([500, 1000], v16.months, 1000)).toBe('2027-01')
  })
})

describe('card tracker', () => {
  it('orders cards by when the plan clears them and compares live with plan', () => {
    const r = reconcile(v16, live, 'A', '2026-11-20')
    const t = cardTracker(v16, r, 'A', '2026-11-20')
    expect(t.map(x => x.key)).toEqual(['card_a', 'card_b'])
    expect(t[0]).toMatchObject({ planCleared: '2026-12', planClearsLate: false, daysLeft: 19, actual: 1000, status: 'on_track' })
    // Card B's promo runs to Jun 2027 and the plan clears it in January
    expect(t[1]).toMatchObject({ planCleared: '2027-01', planClearsLate: false, status: 'on_track' })
    expect(nextCardToClear(t)?.key).toBe('card_a')
  })
  it('flags a card still carrying a balance after its plan month, and one above plan', () => {
    const r = reconcile(v16, live, 'A', '2027-01-10')
    const t = cardTracker(v16, r, 'A', '2027-01-10')
    expect(t[0].status).toBe('overdue')           // plan had Card A at $0 by Dec 31
    expect(t[1].status).toBe('on_track')          // $450 live vs $500 planned
    const high = reconcile(v16, live.map(x => x.name.includes('2222') ? { ...x, balance: 900 } : x), 'A', '2027-01-10')
    expect(cardTracker(v16, high, 'A', '2027-01-10')[1].status).toBe('behind')
  })
  it('a paid card is cleared, and a plan that clears after the promo says so', () => {
    const paid = reconcile(v16, live.filter(x => !x.name.includes('1111')), 'B', '2026-11-20')
    const t = cardTracker(v16, paid, 'B', '2026-11-20')
    expect(t.find(x => x.key === 'card_a')?.status).toBe('cleared')
    expect(t.find(x => x.key === 'card_b')).toMatchObject({ planCleared: null, planClearsLate: true })
    expect(nextCardToClear(t)?.key).toBe('card_b')
  })
})

describe('cash ledger', () => {
  it('splits at today, tracks the planned balance and the low point ahead', () => {
    const v = ledgerView(ledger, 'a', '2026-11-22', 1500)
    expect(v.lines).toHaveLength(4)                 // the B-only gift line is left out of case A
    expect(v.planToday).toBe(1700)
    expect(v.diff).toBe(-200)
    expect(v.next).toMatchObject({ date: '2026-11-30', amount: 6750 })
    expect(v.low).toEqual({ date: '2026-12-15', balance: 450 })
    expect(v.finished).toBe(false)
  })
  it('case B includes the gift; before the first row the start balance applies', () => {
    const v = ledgerView(ledger, 'b', '2026-11-16', null)
    expect(v.lines).toHaveLength(5)
    expect(v.planToday).toBe(2000)
    expect(v.diff).toBeNull()
    expect(v.low?.balance).toBe(1700)
  })
  it('is finished after the last row', () => {
    const v = ledgerView(ledger, 'a', '2027-02-01', 7000)
    expect(v).toMatchObject({ finished: true, planToday: 7200, next: null, low: null, diff: -200 })
  })
})

describe('month table and headline', () => {
  it('one row per month with debt paid down from the month before', () => {
    const m = monthTable(v16, 'A', '2026-12-10')
    expect(m[0]).toMatchObject({ month: '2026-12', paidDown: 500, inflows: 13000, extra: 0, checking: 4000, current: true, past: false })
    expect(m[1]).toMatchObject({ month: '2027-01', paidDown: 1000, cards: 0, savings: 1000, current: false })
    expect(monthTable(v16, 'C', '2027-01-10')[0]).toMatchObject({ inflows: null, checking: null, past: true })
  })
  it('headline carries spare cash, savings, HELOC room and payoff month', () => {
    const r = reconcile(v16, live, 'A', '2026-11-20')
    expect(headline(v16, r, 'A', { checking: 1500, savings: 250 })).toMatchObject({
      spareMonth: 813, savingsTarget: 10000, savingsNow: 250, helocBalance: 1500, helocRoom: 500,
      helocPaidOff: '2030-08', helocPayment: 2182, helocPaymentFrom: '2028-04',
    })
    // B's projection reaches $0 inside the window; C has no date
    expect(headline(v16, reconcile(v16, live, 'B', '2026-11-20'), 'B').helocPaidOff).toBe('2027-01')
    expect(headline(v16, reconcile(v16, live, 'C', '2026-11-20'), 'C').helocPaidOff).toBeNull()
  })
  it('milestones take their month from the projection and savings from the live figure', () => {
    const r = reconcile(v16, live, 'A', '2026-11-20')
    const m = milestoneStatus(v16, r, 'A', '2026-11-20', { checking: 1500, savings: 1200 })
    expect(m.find(x => x.key === 'cards_cleared')).toMatchObject({ target: '2027-01', monthsLeft: 2, done: false })
    expect(m.find(x => x.key === 'card_a_cleared')).toMatchObject({ target: '2026-12', done: false, note: '$1,000 left' })
    expect(m.find(x => x.key === 'savings_1k')).toMatchObject({ target: '2027-01', done: true })
    expect(m.find(x => x.key === 'heloc_paid')).toMatchObject({ target: '2030-08', done: false })
  })
})
