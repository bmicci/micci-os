// #32 · Health Overview (PR #31): KPIs, 7-day grid, weight trend with InBody scans.
import { describe, expect, it } from 'vitest'
import { computeHealthOverview, NICOTINE_QUIT_DATE, type BodyMetricRow, type HealthDailyRow } from '@/lib/health/overview'

const TODAY = '2026-10-26'
const day = (d: string, r: Partial<HealthDailyRow> = {}): HealthDailyRow => ({
  day: d, sleep_hours_self: null, energy_level: null, lifted: null, session_type: null, sauna: null, walk: null,
  peloton: null, lights_out_on_time: null, game_off_on_time: null, journal: null, nicotine_free: null,
  weight_self: null, recovery_score: null, hrv_ms: null, rhr_bpm: null, day_strain: null,
  sleep_performance_pct: null, sleep_hours_device: null, ...r,
})
const body = (d: string, source: string | null, r: Partial<BodyMetricRow> = {}): BodyMetricRow => ({
  metric_date: d, source, weight_lbs: null, skeletal_muscle_lbs: null, body_fat_pct: null, body_fat_percent: null, ...r,
})

describe('computeHealthOverview', () => {
  it('builds a 7-day window ending today, oldest first', () => {
    const o = computeHealthOverview([], [], TODAY)
    expect(o.days).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'])
  })

  it('scores done / missed / none per habit and counts check-ins', () => {
    const o = computeHealthOverview([
      day('2026-10-26', { lifted: true, sauna: false, energy_level: 7 }),
      day('2026-10-24', { lifted: false }),
      day('2026-10-10', { lifted: true }), // outside the window
    ], [], TODAY)
    const lift = o.scorecard.find(r => r.key === 'lifted')!
    expect(lift.cells).toEqual(['none', 'none', 'none', 'none', 'missed', 'none', 'done'])
    expect(lift).toMatchObject({ hits: 1, logged: 2 })
    expect(o.checkinsLast7).toBe(2)
    expect(o.loggedToday).toBe(true)
  })

  it('reports loggedToday false with no row today', () => {
    expect(computeHealthOverview([day('2026-10-25', { walk: true })], [], TODAY).loggedToday).toBe(false)
  })

  it('prefers device sleep over self-reported, and takes the latest recovery', () => {
    const o = computeHealthOverview([
      day('2026-10-25', { recovery_score: 40, sleep_hours_self: 6 }),
      day('2026-10-26', { recovery_score: 72, sleep_hours_device: 7.4, sleep_performance_pct: 88 }),
    ], [], TODAY)
    expect(o.recovery).toEqual({ value: 72, day: '2026-10-26' })
    expect(o.sleep).toEqual({ hours: 7.4, performance: 88, source: 'whoop' })
    expect(o.hasDevice).toBe(true)
  })

  it('falls back to self-reported sleep without a device', () => {
    const o = computeHealthOverview([day('2026-10-26', { sleep_hours_self: 6.5 })], [], TODAY)
    expect(o.sleep).toEqual({ hours: 6.5, performance: null, source: 'self' })
    expect(o.hasDevice).toBe(false)
  })

  it('counts nicotine-free days from the quit date, restarting after a slip', () => {
    expect(computeHealthOverview([], [], NICOTINE_QUIT_DATE).nicotineFreeDays).toBe(1)
    expect(computeHealthOverview([], [], '2026-09-23').nicotineFreeDays).toBe(10)
    expect(computeHealthOverview([day('2026-10-20', { nicotine_free: false })], [], TODAY).nicotineFreeDays).toBe(6)
  })

  it('keeps one weight per day, preferring InBody over manual, and lists scans in order', () => {
    const o = computeHealthOverview([], [
      body('2026-10-01', 'manual', { weight_lbs: 196 }),
      body('2026-10-01', 'inbody', { weight_lbs: 195.2, skeletal_muscle_lbs: 88.1, body_fat_pct: 18.4 }),
      body('2026-08-15', 'inbody', { weight_lbs: 198, skeletal_muscle_lbs: 87, body_fat_percent: 20.1 }),
      body('2026-10-20', 'manual', { weight_lbs: 194 }),
      body('2026-10-21', 'manual', {}), // no weight → skipped
    ], TODAY)
    expect(o.trends.weight).toEqual([
      { day: '2026-08-15', weight: 198, source: 'inbody' },
      { day: '2026-10-01', weight: 195.2, source: 'inbody' },
      { day: '2026-10-20', weight: 194, source: 'manual' },
    ])
    expect(o.trends.scans).toEqual([
      { day: '2026-08-15', weight: 198, smm: 87, bodyFat: 20.1 },
      { day: '2026-10-01', weight: 195.2, smm: 88.1, bodyFat: 18.4 },
    ])
  })

  it('averages HRV over the last 7 days only', () => {
    const o = computeHealthOverview([
      day('2026-10-01', { hrv_ms: 10 }), day('2026-10-25', { hrv_ms: 50 }), day('2026-10-26', { hrv_ms: 61 }),
    ], [], TODAY)
    expect(o.hrv).toEqual({ value: 61, avg7: 55.5 })
  })
})
