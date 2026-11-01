// #32 · Live debt overlay (PR #30): Debt Payoff shows Live / Manual / Stale tags.
import { describe, expect, it } from 'vitest'
import type { DebtAccount } from '@/lib/financial-data'
import {
  overlayLiveDebts, last4, MANUAL_STALE_DAYS, LIVE_MAX_AGE_DAYS,
  type LiveAccountRow, type LiveLiabilityRow, type ManualDebt, type ActivePromo,
} from '@/lib/finance/liveDebts'

const TODAY = new Date('2026-10-26T15:00:00Z')
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString()
const decide = (_notes: string | null, rate: number): DebtAccount['decision'] => (rate > 10 ? 'roll' : 'keep')

const manual = (debt: Partial<DebtAccount> & Pick<DebtAccount, 'name' | 'balance'>, updatedDaysAgo = 1): ManualDebt => ({
  debt: { rate: 0, min: 25, decision: 'keep', category: 'Credit Card', ...debt },
  updatedAt: daysAgo(updatedDaysAgo),
})
const live = (row: Partial<LiveAccountRow> & Pick<LiveAccountRow, 'name'>, ageDays = 0): LiveAccountRow => ({
  type: 'credit card', institution: null, balance: 0, updated_at: daysAgo(ageDays), ...row,
})
const run = (m: ManualDebt[], l: LiveAccountRow[], liab: LiveLiabilityRow[] = [], promos: ActivePromo[] = []) =>
  overlayLiveDebts(m, l, liab, promos, decide, TODAY)

describe('last4', () => {
  it('reads the trailing account digits in the formats banks and people use', () => {
    expect(last4('Chase Freedom (4628)')).toBe('4628')
    expect(last4('American Express Platinum Card ···3002')).toBe('3002')
    expect(last4('Citi Diamond 4205')).toBe('4205')
    expect(last4('Mortgage')).toBeNull()
  })
})

describe('overlayLiveDebts', () => {
  it('tags a linked card Live with the bank balance and keeps the manual name', () => {
    const [d] = run([manual({ name: 'Chase Freedom (4628)', balance: 1200 })], [live({ name: 'Chase Freedom ···4628', balance: 1500 })])
    expect(d).toMatchObject({ name: 'Chase Freedom (4628)', balance: 1500, source: 'live', stale: false, asOf: '2026-10-26', manualBalance: 1200 })
  })

  it('omits manualBalance when the bank agrees within $1', () => {
    const [d] = run([manual({ name: 'Card 1111', balance: 500 })], [live({ name: 'Card ···1111', balance: 500.4 })])
    expect(d.manualBalance).toBeUndefined()
  })

  it('tags an unlinked manual row Manual, and Stale once it is older than the threshold', () => {
    const out = run([
      manual({ name: 'Dad loan', balance: 5000, category: 'Personal Loan' }, MANUAL_STALE_DAYS),
      manual({ name: 'Citi Best Buy 9999', balance: 800 }, MANUAL_STALE_DAYS + 1),
    ], [])
    expect(out.find(d => d.name === 'Dad loan')).toMatchObject({ source: 'manual', stale: false })
    expect(out.find(d => d.name.startsWith('Citi'))).toMatchObject({ source: 'manual', stale: true })
  })

  it('ignores bank balances older than the live window (falls back to Manual)', () => {
    const [d] = run([manual({ name: 'Card 2222', balance: 300 })], [live({ name: 'Card ···2222', balance: 999 }, LIVE_MAX_AGE_DAYS + 1)])
    expect(d).toMatchObject({ source: 'manual', balance: 300 })
  })

  it('drops a matched debt the bank reports as paid off', () => {
    expect(run([manual({ name: 'Card 3333', balance: 300 })], [live({ name: 'Card ···3333', balance: 0.5 })])).toEqual([])
  })

  it('matches the single mortgage / HELOC without account digits', () => {
    const out = run(
      [manual({ name: 'BofA Mortgage', balance: 498000, rate: 3.375, category: 'Mortgage' }),
        manual({ name: 'CUTX HELOC', balance: 150000, rate: 6.85, category: 'HELOC' })],
      [live({ name: 'Home Loan', type: 'mortgage', balance: 497500 }),
        live({ name: 'Home Equity Line', type: 'line of credit', balance: 151000 })],
    )
    expect(out.map(d => [d.name, d.source, d.balance])).toEqual([
      ['CUTX HELOC', 'live', 151000],
      ['BofA Mortgage', 'live', 497500],
    ])
  })

  it('switches a lapsed 0% card to the bank purchase APR, but not while a promo is active', () => {
    const liab: LiveLiabilityRow[] = [{ account_name: 'Card ···4444', minimum_payment: 40, interest_rate: null, aprs: [{ apr_type: 'purchase_apr', apr_percentage: 27.99 }] }]
    const m = [manual({ name: 'Card 4444', balance: 2000, rate: 0, decision: 'promo' })]
    const l = [live({ name: 'Card ···4444', balance: 2000 })]

    const [lapsed] = run(m, l, liab)
    expect(lapsed).toMatchObject({ rate: 27.99, decision: 'roll', min: 40 })

    const [onPromo] = run(m, l, liab, [{ account_name: 'Card 4444', name: 'BT promo', expires: '2027-03-01' }])
    expect(onPromo).toMatchObject({ rate: 0, decision: 'promo' })

    const [expired] = run(m, l, liab, [{ account_name: 'Card 4444', name: 'BT promo', expires: '2026-10-01' }])
    expect(expired.rate).toBe(27.99)
  })

  it('adds a linked debt with no manual row, flagging an unknown rate', () => {
    const [d] = run([], [live({ name: 'Bank of America Customized Cash ···5555', balance: 13000 })])
    expect(d).toMatchObject({ source: 'live', rate: 0, rateUnknown: true, decision: 'keep', category: 'Credit Card' })
  })

  it('cleans bank names (trademark marks, doubled issuer)', () => {
    const [d] = run([], [live({ name: 'American American Express Platinum Card® ···3002', balance: 100 })])
    expect(d.liveName).toBe('American Express Platinum Card ···3002')
  })

  it('never treats checking / savings as debt', () => {
    expect(run([], [live({ name: 'Chase Checking ···0001', type: 'checking', balance: 4000 })])).toEqual([])
  })

  it('sorts smallest balance first (snowball order)', () => {
    const out = run([manual({ name: 'A 1000', balance: 900 }), manual({ name: 'B 2000', balance: 100 })], [])
    expect(out.map(d => d.balance)).toEqual([100, 900])
  })
})
