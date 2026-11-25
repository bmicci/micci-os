// Subscription and bill detection over imported transactions (recurring.ts).
import { describe, expect, it } from 'vitest'
import { detectRecurring, merchantKey, EMPTY_RECURRING } from '@/lib/finance/recurring'
import type { TxnRow } from '@/lib/finance/txnAggregate'

const tx = (date: string, amount: number, merchant: string, category = 'Entertainment'): TxnRow =>
  ({ transaction_date: date, amount, merchant, category })

// Monthly charges on the given day, from a start month for n months
function monthly(merchant: string, amount: number | ((i: number) => number), start: [number, number], n: number, day = 5, category?: string): TxnRow[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(start[0], start[1] - 1 + i, day))
    return tx(d.toISOString().slice(0, 10), typeof amount === 'function' ? amount(i) : amount, merchant, category)
  })
}

describe('merchantKey', () => {
  it('strips processor prefixes, phone numbers and padding', () => {
    expect(merchantKey('TST* JOES PIZZA   DALLAS TX')).toBe('JOES PIZZA')
    expect(merchantKey('NETFLIX.COM 866-579-7172 CA')).toBe('NETFLIX COM CA')
    expect(merchantKey('PAYPAL *SPOTIFY')).toBe('SPOTIFY')
  })
  it('keeps at most four words', () => {
    expect(merchantKey('ONE TWO THREE FOUR FIVE')).toBe('ONE TWO THREE FOUR')
  })
})

describe('detectRecurring', () => {
  it('returns the empty result with no usable rows', () => {
    expect(detectRecurring([])).toEqual(EMPTY_RECURRING)
  })

  it('finds a steady monthly subscription and prices it per month', () => {
    const r = detectRecurring(monthly('UBER ONE', 9.99, [2026, 5], 6, 3, 'Travel'))
    expect(r.active).toHaveLength(1)
    expect(r.active[0]).toMatchObject({ key: 'UBER ONE', name: 'Uber One', cadence: 'monthly', monthlyCost: 9.99, kind: 'subscription', status: 'active', count: 6 })
    expect(r.subsMonthlyTotal).toBe(9.99)
  })

  it('ignores restaurants, groceries, card payments and refunds', () => {
    const r = detectRecurring([
      ...monthly('CHIPOTLE', 14, [2026, 5], 6, 3, 'Food & Dining'),
      ...monthly('KROGER', 120, [2026, 5], 6, 3, 'Groceries'),
      ...monthly('CHASE AUTOPAY', 500, [2026, 5], 6, 3, 'Card Payment'),
      ...monthly('REFUND CO', -10, [2026, 5], 6, 3),
    ])
    expect(r.active).toEqual([])
  })

  it('ignores interest and fees that look recurring', () => {
    expect(detectRecurring(monthly('INTEREST CHARGE ON PURCHASES', 61, [2026, 5], 6)).active).toEqual([])
  })

  it('does not count an irregular merchant as recurring', () => {
    const rows = ['2026-05-01', '2026-05-09', '2026-06-20', '2026-06-23', '2026-08-30'].map(d => tx(d, 40, 'SHELL OIL', 'Auto & Transport'))
    expect(detectRecurring(rows).active).toEqual([])
  })

  it('does not count a merchant whose amount swings widely', () => {
    const r = detectRecurring(monthly('AMAZON MKTPL', i => [12, 90, 33, 150, 8, 61][i], [2026, 5], 6, 3, 'Shopping'))
    expect(r.active).toEqual([])
  })

  it('classifies utilities and insurance as bills, by category or by name', () => {
    const r = detectRecurring([
      ...monthly('TXU ENERGY', 180, [2026, 5], 6, 10, 'Other'),
      ...monthly('NETFLIX', 24.99, [2026, 5], 6, 12),
    ])
    const kinds = Object.fromEntries(r.active.map(c => [c.key, c.kind]))
    expect(kinds).toEqual({ 'TXU ENERGY': 'bill', NETFLIX: 'subscription' })
    expect(r.billsMonthlyTotal).toBe(180)
  })

  it('marks a charge lapsed when it stops, and counts recent stops as savings', () => {
    const r = detectRecurring([
      ...monthly('HULU', 17.99, [2026, 3], 4, 8),          // Mar–Jun, then stops
      ...monthly('SPOTIFY', 11.99, [2026, 3], 8, 8),       // runs through Oct
    ])
    expect(r.lapsed.map(c => c.key)).toEqual(['HULU'])
    expect(r.active.map(c => c.key)).toEqual(['SPOTIFY'])
    expect(r.lapsedMonthlySavings).toBe(17.99)
  })

  it('flags price creep on the last three charges', () => {
    const r = detectRecurring(monthly('YOUTUBE PREMIUM', i => (i < 4 ? 13.99 : 15.99), [2026, 3], 8, 15))
    expect(r.active[0].priceChangePct).toBeCloseTo(14.3, 1)
    expect(r.creepCount).toBe(1)
  })

  it('flags a zombie: on the cancel list but still charging', () => {
    const r = detectRecurring(monthly('PARAMOUNT PLUS', 12.99, [2026, 5], 6), ['Paramount+'])
    expect(r.active[0].zombie).toBe(true)
    expect(r.zombieCount).toBe(1)
  })

  it('treats an annual renewal at the same price as recurring, per month', () => {
    const r = detectRecurring([tx('2025-03-01', 99, 'AMAZON PRIME'), tx('2026-03-01', 99, 'AMAZON PRIME'), tx('2026-10-01', 9.99, 'OTHER SUB'), tx('2026-11-01', 9.99, 'OTHER SUB')])
    const prime = [...r.active, ...r.lapsed].find(c => c.key === 'AMAZON PRIME')
    expect(prime).toMatchObject({ cadence: 'annual', monthlyCost: 8.25 })
  })

  it('two visits a year apart at different prices are not a renewal', () => {
    const r = detectRecurring([tx('2025-03-01', 99, 'HOTEL STAY'), tx('2026-03-01', 240, 'HOTEL STAY')])
    expect([...r.active, ...r.lapsed]).toEqual([])
  })

  it('collapses same-day split charges into one', () => {
    const rows = monthly('GOOGLE ONE', 1.99, [2026, 5], 6, 20)
    rows.push(tx(rows[2].transaction_date, 1.99, 'GOOGLE ONE'))
    const r = detectRecurring(rows)
    expect(r.active[0].count).toBe(6)
  })

  it('skips rows with no date', () => {
    const r = detectRecurring([...monthly('NTTA', 40, [2026, 5], 6, 2, 'Auto & Transport'), tx('', 40, 'NTTA')])
    expect(r.active[0].count).toBe(6)
  })
})
