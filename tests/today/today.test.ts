// /today daily log (ROADMAP Phase 3): top 3 actions, money this week,
// next payday, evening check-in streak.
import { describe, expect, it } from 'vitest'
import type { ActionItem } from '@/lib/financial-data'
import type { UpcomingItem } from '@/lib/finance/upcoming'
import type { RunwayEmployment } from '@/lib/finance/txnAggregate'
import type { HealthDailyRow } from '@/lib/health/overview'
import { checkinStatus, daysBetween, dueThisWeek, isCheckedIn, nextPayday, pickTopActions, whenLabel } from '@/lib/today'

const TODAY = '2026-11-24' // a Tuesday

const action = (title: string, r: Partial<ActionItem> = {}): ActionItem => ({
  priority: 'blue', title, detail: '', status: 'active', ...r,
})

const up = (label: string, date: string, r: Partial<UpcomingItem> = {}): UpcomingItem => ({
  kind: 'bill', label, detail: '', date, daysAway: 999, amount: null, urgent: false, ...r,
})

const day = (d: string, r: Partial<HealthDailyRow> = {}): HealthDailyRow => ({
  day: d, sleep_hours_self: null, energy_level: null, lifted: null, session_type: null, sauna: null, walk: null,
  peloton: null, lights_out_on_time: null, game_off_on_time: null, journal: null, nicotine_free: null,
  weight_self: null, recovery_score: null, hrv_ms: null, rhr_bpm: null, day_strain: null,
  sleep_performance_pct: null, sleep_hours_device: null, ...r,
})

const EMP: RunwayEmployment = {
  employer: 'Schwab', firstPayday: '2026-12-04', daysUntilFirstCheck: 10, netPerCheck: 5000,
  monthlyNet: 10833, monthlySurplus: 1000, lowPointCash: 1200, lowPointDate: '2026-12-03',
}

describe('daysBetween', () => {
  it('counts calendar days across a month end', () => {
    expect(daysBetween(TODAY, '2026-12-04')).toBe(10)
    expect(daysBetween(TODAY, '2026-11-20')).toBe(-4)
    expect(daysBetween(TODAY, TODAY)).toBe(0)
  })
})

describe('pickTopActions', () => {
  it('puts overdue first, then due today, red, due this week, amber, the rest', () => {
    const top = pickTopActions([
      action('undated blue'),
      action('amber undated', { priority: 'amber' }),
      action('due in 5', { dueDate: '2026-11-29' }),
      action('red undated', { priority: 'red' }),
      action('due today', { dueDate: TODAY }),
      action('overdue', { dueDate: '2026-11-20' }),
    ], TODAY, 6)
    expect(top.map(a => a.title)).toEqual(['overdue', 'due today', 'red undated', 'due in 5', 'amber undated', 'undated blue'])
    expect(top[0].daysAway).toBe(-4)
    expect(top.at(-1)!.daysAway).toBeNull()
  })

  it('keeps three by default and skips done or dismissed items', () => {
    const top = pickTopActions([
      action('done', { status: 'done', dueDate: '2026-11-01' }),
      action('dismissed', { status: 'dismissed', priority: 'red' }),
      action('a', { dueDate: '2026-11-25' }),
      action('b', { dueDate: '2026-11-26' }),
      action('c', { dueDate: '2026-11-27' }),
      action('d', { dueDate: '2026-11-28' }),
    ], TODAY)
    expect(top.map(a => a.title)).toEqual(['a', 'b', 'c'])
  })

  it('reads a timestamp due date by its day', () => {
    const [a] = pickTopActions([action('x', { dueDate: '2026-11-24T18:00:00Z' })], TODAY)
    expect(a.daysAway).toBe(0)
  })
})

describe('dueThisWeek', () => {
  it('keeps bills and promos due within 7 days, recounted from today, and drops actions', () => {
    const due = dueThisWeek([
      up('Netflix', '2026-11-28'),
      up('Rent-ish', '2026-12-02'),          // 8 days: out
      up('Old bill', '2026-11-20'),          // past bill: out
      up('Promo past', '2026-11-10', { kind: 'promo', urgent: true }), // unresolved promo stays
      up('Action', '2026-11-25', { kind: 'action' }),
      up('Promo soon', '2026-12-01', { kind: 'promo', urgent: true }),
    ], TODAY)
    expect(due.map(u => u.label)).toEqual(['Promo past', 'Netflix', 'Promo soon'])
    expect(due.map(u => u.daysAway)).toEqual([-14, 4, 7])
  })
})

describe('nextPayday', () => {
  it('is the first check before it lands', () => {
    expect(nextPayday(EMP, TODAY)).toEqual({ employer: 'Schwab', date: '2026-12-04', daysAway: 10, netPerCheck: 5000, first: true })
  })

  it('steps every 14 days after the first check', () => {
    expect(nextPayday(EMP, '2026-12-05')).toMatchObject({ date: '2026-12-18', daysAway: 13, first: false })
    expect(nextPayday(EMP, '2026-12-18')).toMatchObject({ date: '2026-12-18', daysAway: 0 })
  })

  it('is null without a job', () => {
    expect(nextPayday(null, TODAY)).toBeNull()
  })
})

describe('checkinStatus', () => {
  it('counts a streak ending today', () => {
    const s = checkinStatus([
      day('2026-11-20', { lifted: true }),
      day('2026-11-22', { energy_level: 6 }),
      day('2026-11-23', { journal: false }),
      day('2026-11-24', { sleep_hours_self: 7 }),
    ], TODAY)
    expect(s).toEqual({ loggedToday: true, streak: 3, last7: 4, lastLogged: '2026-11-24' })
  })

  it('keeps yesterday’s streak alive while tonight is still open', () => {
    const s = checkinStatus([day('2026-11-22', { walk: true }), day('2026-11-23', { walk: true })], TODAY)
    expect(s).toMatchObject({ loggedToday: false, streak: 2, last7: 2 })
  })

  it('resets after a missed day and ignores device-only rows', () => {
    const s = checkinStatus([
      day('2026-11-21', { lifted: true }),
      day('2026-11-22', { recovery_score: 60 }), // WHOOP only, no check-in
      day('2026-11-23', { sauna: true }),
    ], TODAY)
    expect(s).toMatchObject({ streak: 1, last7: 2, lastLogged: '2026-11-23' })
    expect(isCheckedIn(day('2026-11-22', { recovery_score: 60 }))).toBe(false)
  })

  it('is zero with no check-ins', () => {
    expect(checkinStatus([], TODAY)).toEqual({ loggedToday: false, streak: 0, last7: 0, lastLogged: null })
  })
})

describe('whenLabel', () => {
  it('says today, tomorrow, a weekday this week, then days', () => {
    expect(whenLabel(TODAY, TODAY)).toBe('today')
    expect(whenLabel('2026-11-25', TODAY)).toBe('tomorrow')
    expect(whenLabel('2026-11-27', TODAY)).toBe('Fri')
    expect(whenLabel('2026-12-04', TODAY)).toBe('in 10d')
    expect(whenLabel('2026-11-22', TODAY)).toBe('2d overdue')
  })
})
