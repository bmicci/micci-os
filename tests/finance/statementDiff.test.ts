// #32 · Statements pipeline (PR #29): a parsed card statement → reviewed promo findings.
// Covers the diff only; the live Claude read of a real PDF still needs Brandon.
import { describe, expect, it } from 'vitest'
import {
  diffStatementAgainstPromos, promosForAccount,
  type PromoRow, type StatementExtraction, type StatementSegment,
} from '@/lib/finance/statementDiff'

const seg = (s: Partial<StatementSegment>): StatementSegment => ({
  type: 'balance_transfer', description: 'Balance transfer', balance: 0, apr: 0,
  promo_end_date: null, deferred_interest: null, transfer_date: null, ...s,
})
const statement = (s: Partial<StatementExtraction>): StatementExtraction => ({
  is_card_statement: true, issuer: 'Bank of America', account_name: 'Customized Cash', account_last4: '5555',
  closing_date: '2026-10-15', new_balance: null, minimum_payment: null, payment_due_date: null,
  credit_limit: null, interest_charged: 0, fees_charged: 0, segments: [], notes: null, ...s,
})
const promo = (p: Partial<PromoRow>): PromoRow => ({
  id: 'p1', name: 'BofA BT 5555', account_name: 'BofA Customized Cash (5555)', balance: 13000,
  expires: '2027-06-15', deferred_interest: null, status: 'active', note: null, ...p,
})
const ctx = { accountMask: '5555', accountName: 'BofA Customized Cash (5555)' }

describe('promosForAccount', () => {
  it('matches on the last 4 digits and needs a real mask', () => {
    const ps = [promo({ id: 'a' }), promo({ id: 'b', name: 'Citi 4205', account_name: 'Citi Diamond 4205' })]
    expect(promosForAccount(ps, 'xxxx5555').map(p => p.id)).toEqual(['a'])
    expect(promosForAccount(ps, null)).toEqual([])
    expect(promosForAccount(ps, '55')).toEqual([])
  })
})

describe('diffStatementAgainstPromos', () => {
  it('returns nothing for a non-card document', () => {
    expect(diffStatementAgainstPromos(statement({ is_card_statement: false, segments: [seg({ balance: 5 })] }), [promo({})], ctx)).toEqual([])
  })

  it('proposes balance + expiry updates for a matched promo', () => {
    const out = diffStatementAgainstPromos(
      statement({ segments: [seg({ balance: 12500, promo_end_date: '2027-06-20' })] }), [promo({})], ctx)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'update_promo', promo_id: 'p1', proposed: { balance: 12500, expires: '2027-06-20' } })
  })

  it('stays quiet when the statement agrees with the tracked promo', () => {
    const out = diffStatementAgainstPromos(
      statement({ segments: [seg({ balance: 13000.5, promo_end_date: '2027-06-15' })] }), [promo({})], ctx)
    expect(out).toEqual([])
  })

  it('marks a promo paid when its segment shows $0', () => {
    const out = diffStatementAgainstPromos(
      statement({ segments: [seg({ balance: 0, promo_end_date: '2027-06-15' })] }), [promo({})], ctx)
    expect(out).toEqual([expect.objectContaining({ kind: 'promo_paid', promo_id: 'p1', proposed: { status: 'paid' } })])
  })

  it('proposes a new promo for an unknown 0% segment with an end date', () => {
    const out = diffStatementAgainstPromos(
      statement({ segments: [seg({ balance: 4000, promo_end_date: '2027-12-01', description: 'BT Oct 2026' })] }), [], ctx)
    expect(out[0]).toMatchObject({
      kind: 'new_promo', proposed: { balance: 4000, expires: '2027-12-01', name: 'BofA Customized Cash (5555) — BT Oct 2026' },
    })
  })

  it('flags (info only) a 0% segment with no printed end date', () => {
    const out = diffStatementAgainstPromos(statement({ segments: [seg({ balance: 4000 })] }), [], ctx)
    expect(out[0]).toMatchObject({ kind: 'info', proposed: null })
  })

  it('asks to close a tracked promo the statement no longer lists, only when segments were read', () => {
    const tracked = [promo({ expires: '2026-10-01' })]
    const listed = diffStatementAgainstPromos(statement({ segments: [seg({ type: 'purchase', apr: 24.99, balance: 50 })] }), tracked, ctx)
    expect(listed).toEqual([expect.objectContaining({ kind: 'promo_paid', title: expect.stringContaining('past its expiry') })])
    expect(diffStatementAgainstPromos(statement({ segments: [] }), tracked, ctx)).toEqual([])
  })

  it('ignores paid / closed promos and reports interest charged', () => {
    const out = diffStatementAgainstPromos(
      statement({ segments: [seg({ type: 'purchase', apr: 24.99, balance: 50 })], interest_charged: 12.34 }),
      [promo({ status: 'paid' })], ctx)
    expect(out).toEqual([expect.objectContaining({ kind: 'info', title: expect.stringContaining('$12.34 interest') })])
  })

  it('matches two promos on one card by end date, not by order', () => {
    const ps = [promo({ id: 'early', expires: '2027-01-15', balance: 3000 }), promo({ id: 'late', expires: '2027-09-15', balance: 9000 })]
    const out = diffStatementAgainstPromos(statement({
      segments: [seg({ balance: 8500, promo_end_date: '2027-09-15' }), seg({ balance: 2500, promo_end_date: '2027-01-15' })],
    }), ps, ctx)
    expect(out.map(f => [f.promo_id, f.proposed?.balance])).toEqual([['late', 8500], ['early', 2500]])
  })
})
