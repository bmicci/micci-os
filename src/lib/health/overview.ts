// Health Overview derivations — pure functions over health_daily +
// body_metrics. Components render; they never calculate.

import { shiftDay } from './dates'

export const NICOTINE_QUIT_DATE = '2026-09-14'

export interface HealthDailyRow {
  day: string
  sleep_hours_self: number | null
  energy_level: number | null
  lifted: boolean | null
  session_type: string | null
  sauna: boolean | null
  walk: boolean | null
  peloton: boolean | null
  lights_out_on_time: boolean | null
  game_off_on_time: boolean | null
  journal: boolean | null
  nicotine_free: boolean | null
  weight_self: number | null
  recovery_score: number | null
  hrv_ms: number | null
  rhr_bpm: number | null
  day_strain: number | null
  sleep_performance_pct: number | null
  sleep_hours_device: number | null
}

export interface BodyMetricRow {
  metric_date: string
  source: string | null
  weight_lbs: number | null
  skeletal_muscle_lbs: number | null
  body_fat_pct: number | null
  body_fat_percent: number | null
}

export const SCORECARD_ROWS = [
  { key: 'lifted', label: 'Lift' },
  { key: 'sauna', label: 'Sauna' },
  { key: 'walk', label: 'Walk' },
  { key: 'lights_out_on_time', label: 'Lights out' },
  { key: 'game_off_on_time', label: 'Game off' },
  { key: 'journal', label: 'Journal' },
  { key: 'nicotine_free', label: 'Nicotine-free' },
] as const
type HabitKey = (typeof SCORECARD_ROWS)[number]['key']

export type Cell = 'done' | 'missed' | 'none'
export interface ScorecardRow { key: HabitKey; label: string; cells: Cell[]; hits: number; logged: number }

export interface HealthOverview {
  days: string[]                    // last 7, oldest → newest
  scorecard: ScorecardRow[]
  checkinsLast7: number
  loggedToday: boolean
  recovery: { value: number | null; day: string | null }
  hrv: { value: number | null; avg7: number | null }
  sleep: { hours: number | null; performance: number | null; source: 'whoop' | 'self' | null }
  nicotineFreeDays: number
  hasDevice: boolean
  trends: {
    daily: { day: string; recovery: number | null; hrv: number | null; sleep: number | null }[]
    weight: { day: string; weight: number; source: string }[]
    scans: { day: string; weight: number | null; smm: number | null; bodyFat: number | null }[]
  }
}

const n = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null
}

export function computeHealthOverview(daily: HealthDailyRow[], body: BodyMetricRow[], today: string): HealthOverview {
  const byDay = new Map(daily.map(r => [r.day, r]))
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6))
  const checkedIn = (r: HealthDailyRow | undefined) =>
    !!r && SCORECARD_ROWS.some(s => r[s.key] != null || r.energy_level != null || r.sleep_hours_self != null)

  const scorecard: ScorecardRow[] = SCORECARD_ROWS.map(s => {
    const cells: Cell[] = days.map(d => {
      const r = byDay.get(d)
      if (!checkedIn(r)) return 'none'
      return r![s.key] ? 'done' : 'missed'
    })
    return { key: s.key, label: s.label, cells, hits: cells.filter(c => c === 'done').length, logged: cells.filter(c => c !== 'none').length }
  })

  // Latest values (most recent day that has them)
  const desc = [...daily].sort((a, b) => b.day.localeCompare(a.day))
  const latest = <K extends keyof HealthDailyRow>(k: K) => desc.find(r => n(r[k]) != null)
  const rec = latest('recovery_score')
  const sleepDev = latest('sleep_hours_device')
  const sleepSelf = latest('sleep_hours_self')
  const last7 = daily.filter(r => r.day >= days[0])

  // Nicotine-free streak: from the quit date, restarting after any check-in that says otherwise
  const slip = desc.find(r => r.day >= NICOTINE_QUIT_DATE && r.nicotine_free === false)
  const streakStart = slip ? shiftDay(slip.day, 1) : NICOTINE_QUIT_DATE
  const nicotineFreeDays = Math.max(0, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${streakStart}T12:00:00Z`)) / 86_400_000) + 1)

  const scans = body
    .filter(b => b.source === 'inbody')
    .map(b => ({ day: b.metric_date, weight: n(b.weight_lbs), smm: n(b.skeletal_muscle_lbs), bodyFat: n(b.body_fat_pct ?? b.body_fat_percent) }))
    .sort((a, b) => a.day.localeCompare(b.day))

  return {
    days,
    scorecard,
    checkinsLast7: days.filter(d => checkedIn(byDay.get(d))).length,
    loggedToday: checkedIn(byDay.get(today)),
    recovery: { value: n(rec?.recovery_score), day: rec?.day ?? null },
    hrv: { value: n(latest('hrv_ms')?.hrv_ms), avg7: avg(last7.map(r => n(r.hrv_ms))) },
    sleep: sleepDev
      ? { hours: n(sleepDev.sleep_hours_device), performance: n(sleepDev.sleep_performance_pct), source: 'whoop' }
      : sleepSelf ? { hours: n(sleepSelf.sleep_hours_self), performance: null, source: 'self' } : { hours: null, performance: null, source: null },
    nicotineFreeDays,
    hasDevice: daily.some(r => r.recovery_score != null || r.sleep_hours_device != null),
    trends: {
      daily: [...daily].sort((a, b) => a.day.localeCompare(b.day)).map(r => ({
        day: r.day, recovery: n(r.recovery_score), hrv: n(r.hrv_ms), sleep: n(r.sleep_hours_device) ?? n(r.sleep_hours_self),
      })),
      // One weight per day; prefer scale/scan readings over manual entries
      weight: Object.values(
        body.filter(b => n(b.weight_lbs) != null).reduce<Record<string, { day: string; weight: number; source: string }>>((acc, b) => {
          const rank = (s: string | null) => (s === 'inbody' ? 3 : s === 'withings' ? 2 : 1)
          const prev = acc[b.metric_date]
          if (!prev || rank(b.source) > rank(prev.source)) acc[b.metric_date] = { day: b.metric_date, weight: n(b.weight_lbs)!, source: b.source ?? 'manual' }
          return acc
        }, {}),
      ).sort((a, b) => a.day.localeCompare(b.day)),
      scans,
    },
  }
}
