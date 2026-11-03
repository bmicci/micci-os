// Data reconciliation: flags numbers the planner shouldn't trust.
// Fixtures mirror the real Nov 2026 data that was wrong.
import { describe, expect, it } from 'vitest'
import { formatReconcile, reconcileDebts } from '@/lib/finance/reconcile'
import type { DebtAccount, PromoDeadline } from '@/lib/financial-data'

const debt = (d: Partial<DebtAccount>): DebtAccount => ({
  name: 'Card', balance: 0, rate: 0, min: null, decision: 'promo', category: 'Credit Card', source: 'live', ...d,
})
const promo = (p: Partial<PromoDeadline>): PromoDeadline => ({
  name: 'BT', balance: 0, expires: '2026-12-09', risk: null, acct: 'Card', note: '', ...p,
})

describe('reconcileDebts', () => {
  it('flags promos that total more than the card owes (Freedom Unlimited)', () => {
    const issues = reconcileDebts(
      [debt({ name: 'Chase Freedom Unlimited (7117)', balance: 3574 })],
      [
        promo({ name: 'BT3', balance: 6446.73, acct: 'Chase Freedom Unlim (7117)' }),
        promo({ name: 'BT4', balance: 3985.8, acct: 'Chase Freedom Unlim (7117)' }),
      ])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ severity: 'error', kind: 'promo_exceeds_balance' })
    expect(issues[0].message).toMatch(/\$10,432\.53.*\$3,574\.00/)
  })

  it('accepts promos that fit within the card balance (small rounding allowed)', () => {
    const issues = reconcileDebts(
      [debt({ name: 'Bank of America BankAmericard ···1205', balance: 13413.06 })],
      [promo({ balance: 13413, acct: 'Bank of America BankAmericard Platinum Plus ···1205' })])
    expect(issues).toEqual([])
  })

  it('matches the bank name when the manual name differs', () => {
    const issues = reconcileDebts(
      [debt({ name: 'Chase Prime Visa (9313)', liveName: 'Chase CREDIT CARD ···9313', balance: 1161.09 })],
      [promo({ balance: 1250, acct: 'Chase CREDIT CARD ···9313' })])
    expect(issues[0]?.kind).toBe('promo_exceeds_balance')
  })

  it('flags stale manual balances; HELOC and big balances are errors', () => {
    const issues = reconcileDebts([
      debt({ name: 'Credit Union of Texas HELOC', category: 'HELOC', balance: 152473.32, source: 'manual', stale: true, asOf: '2026-07-07' }),
      debt({ name: 'Citi Best Buy (4802)', balance: 917.96, source: 'manual', stale: true, asOf: '2026-07-07' }),
    ], [])
    const stale = issues.filter(i => i.kind === 'stale_balance')
    expect(stale.map(i => [i.subject, i.severity])).toEqual([
      ['Credit Union of Texas HELOC', 'error'], ['Citi Best Buy (4802)', 'warn'],
    ])
  })

  it('does not flag live balances as stale and lists $0 manual accounts once', () => {
    const issues = reconcileDebts([
      debt({ name: 'Mortgage', category: 'Mortgage', balance: 490148.56, source: 'live', stale: false }),
      debt({ name: 'VACU Personal Loan', category: 'Personal Loan', balance: 0, source: 'manual' }),
      debt({ name: 'Best Buy Visa (5498)', balance: 0, source: 'manual' }),
    ], [])
    expect(issues).toHaveLength(1)
    expect(issues[0].kind).toBe('zero_active')
    expect(issues[0].message).toMatch(/2 account/)
  })

  it('warns about promos it cannot tie to a card', () => {
    const issues = reconcileDebts([debt({ name: 'Some Card (1111)', balance: 100 })], [promo({ name: 'Mystery', balance: 50, acct: 'Unknown' })])
    expect(issues[0]).toMatchObject({ severity: 'warn', kind: 'promo_unmatched' })
  })
})

describe('formatReconcile', () => {
  it('says so when everything is consistent', () => {
    expect(formatReconcile([]).join('\n')).toMatch(/No inconsistencies/)
  })
  it('lists errors before warnings', () => {
    const out = formatReconcile([
      { severity: 'warn', kind: 'zero_active', subject: 'x', message: 'W' },
      { severity: 'error', kind: 'stale_balance', subject: 'y', message: 'E' },
    ])
    expect(out.indexOf('- ⛔ E')).toBeLessThan(out.indexOf('- ⚠ W'))
  })
})
