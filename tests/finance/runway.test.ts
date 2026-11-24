// Nov 2026 audit: the runway walk reported a cash-out on a short dip before
// a paycheck even when the job's pay covers spend, and re-paid paydays that
// had already happened. A dip that recovers is a gap to bridge, not a cash-out.
import { describe, expect, it } from 'vitest'
import { computeRunwayProjection, type PaycheckSchedule } from '@/lib/finance/txnAggregate'

const TODAY = new Date('2026-11-16T00:00:00')
const job = (over: Partial<PaycheckSchedule> = {}): PaycheckSchedule => ({
  employer: 'Schwab', firstPayday: '2026-11-30', periodDays: 14, netPerCheck: 4000, monthlyNet: 8667, ...over,
})

describe('computeRunwayProjection', () => {
  it('no income: cash runs out when spend eats it', () => {
    const r = computeRunwayProjection(6000, 6000, 0, null, TODAY)
    expect(r.cashOutDate).toBe('2026-12-16')
    expect(r.shortfall).toBeNull()
  })

  it('income covers spend and nothing is dated: never runs out', () => {
    const r = computeRunwayProjection(1000, 5000, 6000, null, TODAY)
    expect(r.cashOutDate).toBeNull()
  })

  it('income cliff: burn steps up the day benefits stop', () => {
    const r = computeRunwayProjection(6000, 6000, 6000, '2026-12-01', TODAY)
    expect(r.phase).toBe('pre-cliff')
    expect(r.cashOutDate).toBe('2026-12-31')
  })

  it('job with enough cash to reach the first check: low point, no gap', () => {
    const r = computeRunwayProjection(5000, 6000, 0, null, TODAY, job())
    expect(r.cashOutDate).toBeNull()
    expect(r.shortfall).toBeNull()
    expect(r.employment?.lowPointCash).toBeGreaterThan(0)
    expect(r.employment?.lowPointDate).toBe('2026-11-29')
  })

  it('job, but cash dips below $0 just before the first check: a gap, not a cash-out', () => {
    const r = computeRunwayProjection(2000, 6000, 0, null, TODAY, job())
    expect(r.cashOutDate).toBeNull()
    expect(r.shortfall).toMatchObject({ recoveredDate: '2026-11-30' })
    expect(r.shortfall!.startDate < '2026-11-30').toBe(true)
    expect(r.shortfall!.deepestCash).toBeLessThan(0)
    expect(r.shortfall!.days).toBeGreaterThan(0)
    expect(r.employment!.lowPointCash).toBe(r.shortfall!.deepestCash)
  })

  it('a dated payment that pushes cash negative is a gap when pay covers spend', () => {
    const r = computeRunwayProjection(5000, 6000, 0, null, TODAY, job(), [
      { date: '2026-12-31', amount: -9000, label: 'Property tax' },
    ])
    expect(r.cashOutDate).toBeNull()
    expect(r.shortfall?.startDate).toBe('2026-12-31')
    expect(r.shortfall!.recoveredDate > '2026-12-31').toBe(true)
  })

  it('job that does not cover spend: the dip is a real cash-out', () => {
    const r = computeRunwayProjection(2000, 6000, 0, null, TODAY, job({ netPerCheck: 2000, monthlyNet: 4333 }))
    expect(r.cashOutDate).not.toBeNull()
    expect(r.shortfall).toBeNull()
  })

  it('paydays before today are not paid again', () => {
    // First check was 4 weeks ago; next ones land Nov 16 (today) and Nov 30.
    const started = computeRunwayProjection(5000, 6000, 0, null, TODAY, job({ firstPayday: '2026-10-19' }))
    const fresh = computeRunwayProjection(5000, 6000, 0, null, TODAY, job({ firstPayday: '2026-11-16' }))
    expect(started.employment!.lowPointCash).toBe(fresh.employment!.lowPointCash)
    expect(started.cashOutDate).toBeNull()
  })
})

describe('computeRunwayProjection — paydays on business days', () => {
  it('the Jan 1, 2027 check lands Dec 31, ahead of a Dec 31 property-tax payment', () => {
    const r = computeRunwayProjection(
      1000, 0, 0, null, new Date('2026-11-22T00:00:00'),
      job({ firstPayday: '2026-12-04', payFrequency: 26, netPerCheck: 5000, monthlyNet: 10833 }),
      [{ date: '2026-12-31', amount: -12000, label: 'Property tax' }],
    )
    // Dec 4 + Dec 18 + Dec 31 checks (15,000) cover the 12,000 payment, so cash never dips
    expect(r.shortfall).toBeNull()
    expect(r.employment?.lowPointCash).toBe(1000)
    expect(r.employment?.payFrequency).toBe(26)
  })
})
