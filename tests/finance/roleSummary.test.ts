import { describe, it, expect } from 'vitest'
import { offerPaycheck, type JobOffer } from '@/lib/finance/jobIncome'
import { roleSummary, payCadenceLabel } from '@/lib/finance/roleSummary'

const schwab: JobOffer = {
  id: 'schwab',
  employer: 'Charles Schwab',
  title: 'Director, Legal Operating Model, AI & Transformation',
  kind: 'salary',
  employment: 'w2',
  annualSalary: 240000,
  bonusPct: 0,
  payFrequency: 26,
  startDate: '2026-11-16',
  firstPayday: '2026-12-04',
  filingStatus: 'single',
  contribution401kAnnual: 12000,
  healthPremiumPerCheck: 205.7,
  status: 'accepted',
}
const pay = offerPaycheck(schwab)

describe('payCadenceLabel', () => {
  it('names the weekday for biweekly and weekly pay', () => {
    expect(payCadenceLabel(26, '2026-12-04')).toBe('Every other Friday')
    expect(payCadenceLabel(52, '2026-12-04')).toBe('Every Friday')
  })
  it('semi-monthly and monthly', () => {
    expect(payCadenceLabel(24, '2026-11-30')).toBe('Twice a month')
    expect(payCadenceLabel(12, '2026-11-30')).toBe('Monthly')
  })
})

describe('roleSummary', () => {
  it('a week into the role: first check still ahead', () => {
    const r = roleSummary(pay, '2026-11-24')
    expect(r.employer).toBe('Charles Schwab')
    expect(r.title).toBe('Director, Legal Operating Model, AI & Transformation')
    expect(r.started).toBe(true)
    expect(r.dayInRole).toBe(9)
    expect(r.weekInRole).toBe(2)
    expect(r.nextPayday).toBe('2026-12-04')
    expect(r.daysToPayday).toBe(10)
    expect(r.firstCheck).toBe(true)
    expect(r.payLabel).toBe('Every other Friday')
    expect(r.annualGross).toBe(240000)
    expect(r.netPerCheck).toBe(pay.netPerCheckEarly)
    expect(r.k401Annual).toBe(12000)
    expect(r.k401Pct).toBe(5)
  })

  it('start date is day 1, week 1', () => {
    const r = roleSummary(pay, '2026-11-16')
    expect(r.dayInRole).toBe(1)
    expect(r.weekInRole).toBe(1)
  })

  it('payday itself counts as the next payday', () => {
    const r = roleSummary(pay, '2026-12-04')
    expect(r.nextPayday).toBe('2026-12-04')
    expect(r.daysToPayday).toBe(0)
  })

  it('after the first check it rolls to the following one', () => {
    const r = roleSummary(pay, '2026-12-05')
    expect(r.nextPayday).toBe('2026-12-18')
    expect(r.daysToPayday).toBe(13)
    expect(r.firstCheck).toBe(false)
  })

  it('before the start date it counts down', () => {
    const r = roleSummary(pay, '2026-11-10')
    expect(r.started).toBe(false)
    expect(r.dayInRole).toBe(-6)
    expect(r.weekInRole).toBe(0)
  })

  it('no title and no 401(k) stay empty', () => {
    const r = roleSummary(offerPaycheck({ ...schwab, title: '  ', contribution401kAnnual: 0 }), '2026-11-24')
    expect(r.title).toBeNull()
    expect(r.k401Annual).toBe(0)
    expect(r.k401Pct).toBeNull()
  })
})
