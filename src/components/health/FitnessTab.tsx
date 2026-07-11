'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import type { Workout, BodyMetric } from './types'

// ── helpers ────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WORKOUT_TYPES = [
  'Strength', 'Cardio', 'HIIT', 'Yoga', 'Pilates', 'ClassPass',
  'Cycling', 'Running', 'Swimming', 'Sauna', 'Stretching', 'Other',
]

function getWorkoutDate(w: Workout): string {
  return w.workout_date ?? w.date ?? ''
}

function getWorkoutType(w: Workout): string {
  return w.workout_type ?? w.type ?? 'Other'
}

function getWorkoutDuration(w: Workout): number | null {
  return w.duration_minutes ?? w.duration_mins ?? null
}

function getWeekDates(): { label: string; iso: string }[] {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      label: DAYS[(dow - 6 + i + 14) % 7] || DAYS[i === 0 ? 1 : (i + 1) % 7],
      iso: d.toISOString().split('T')[0],
    }
  })
}

function calcWorkoutStreak(workouts: Workout[]): number {
  const dates = new Set(workouts.map(w => getWorkoutDate(w)).filter(Boolean))
  let streak = 0
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - 1)
  for (let i = 0; i < 90; i++) {
    if (dates.has(cursor.toISOString().split('T')[0])) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else break
  }
  return streak
}

// ── Log Workout Form ───────────────────────────────────────────────────────

function LogWorkoutForm({ onAdded }: { onAdded: (w: Workout) => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    workout_date: new Date().toISOString().split('T')[0],
    workout_type: 'Strength',
    duration_minutes: '',
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        workout_date: form.workout_date,
        workout_type: form.workout_type,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        notes: form.notes || null,
        completed: true,
      })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      onAdded(data as Workout)
      setOpen(false)
      setForm({ workout_date: new Date().toISOString().split('T')[0], workout_type: 'Strength', duration_minutes: '', notes: '' })
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}>
        + Log Workout
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit}
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,212,255,0.25)' }}>
      <p className="text-sm font-semibold text-[var(--text-primary)]">Log Workout</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Date</label>
          <input type="date" value={form.workout_date} onChange={e => setForm(p => ({ ...p, workout_date: e.target.value }))}
            required style={inputStyle} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Type</label>
          <select value={form.workout_type} onChange={e => setForm(p => ({ ...p, workout_type: e.target.value }))}
            style={{ ...inputStyle, appearance: 'none' }}>
            {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Duration (min)</label>
          <input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}
            style={inputStyle} placeholder="60" />
        </div>
      </div>
      <div>
        <label className="text-xs text-[var(--text-muted)] block mb-1">Notes</label>
        <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          style={inputStyle} placeholder="e.g. ClassPass — Cyclebar, Row 3" />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="btn btn-primary">
          {saving ? 'Saving…' : 'Log It'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  )
}

// ── Log Body Metric Form ───────────────────────────────────────────────────

function LogMetricForm({ onAdded }: { onAdded: (m: BodyMetric) => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    metric_date: new Date().toISOString().split('T')[0],
    weight_lbs: '', body_fat_pct: '', notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('body_metrics')
      .insert({
        metric_date: form.metric_date,
        weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        notes: form.notes || null,
      })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      onAdded(data as BodyMetric)
      setOpen(false)
      setForm({ metric_date: new Date().toISOString().split('T')[0], weight_lbs: '', body_fat_pct: '', notes: '' })
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
        + Log Metrics
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit}
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,212,255,0.25)' }}>
      <p className="text-sm font-semibold text-[var(--text-primary)]">Log Body Metrics</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Date</label>
          <input type="date" value={form.metric_date} onChange={e => setForm(p => ({ ...p, metric_date: e.target.value }))}
            required style={inputStyle} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Weight (lbs)</label>
          <input type="number" step="0.1" value={form.weight_lbs} onChange={e => setForm(p => ({ ...p, weight_lbs: e.target.value }))}
            style={inputStyle} placeholder="185.0" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Body Fat %</label>
          <input type="number" step="0.1" value={form.body_fat_pct} onChange={e => setForm(p => ({ ...p, body_fat_pct: e.target.value }))}
            style={inputStyle} placeholder="16.5" />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="btn btn-primary">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function FitnessTab({
  workouts: initialWorkouts,
  bodyMetrics: initialMetrics,
}: {
  workouts: Workout[]
  bodyMetrics: BodyMetric[]
}) {
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts)
  const [metrics, setMetrics] = useState<BodyMetric[]>(initialMetrics)

  const streak = calcWorkoutStreak(workouts)
  const thisWeek = getWeekDates()
  const workoutsByDate: Record<string, Workout[]> = {}
  for (const w of workouts) {
    const d = getWorkoutDate(w)
    if (d) workoutsByDate[d] = [...(workoutsByDate[d] ?? []), w]
  }

  // Weekly workouts this week
  const weekHits = thisWeek.filter(d => workoutsByDate[d.iso]).length

  // Body metrics chart data (last 20 entries, ascending)
  const metricChart = [...metrics]
    .filter(m => m.weight_lbs || m.body_fat_pct)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .slice(-20)
    .map(m => ({
      date: new Date(m.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: m.weight_lbs,
      bf: m.body_fat_pct,
    }))

  const latestMetric = metrics.sort((a, b) => b.metric_date.localeCompare(a.metric_date))[0]
  const recentWorkouts = [...workouts].sort((a, b) => getWorkoutDate(b).localeCompare(getWorkoutDate(a))).slice(0, 10)

  return (
    <div className="space-y-8 max-w-[900px] mx-auto">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Workout Streak', value: streak, unit: streak === 1 ? 'day' : 'days' },
          { label: 'This Week', value: `${weekHits}/7`, unit: 'days' },
          { label: 'Weight', value: latestMetric?.weight_lbs ? `${latestMetric.weight_lbs}` : '—', unit: 'lbs' },
          { label: 'Body Fat', value: latestMetric?.body_fat_pct ? `${latestMetric.body_fat_pct}` : '—', unit: '%' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {k.value}
              {k.unit && <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{k.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly calendar */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">This Week</h2>
        <div className="grid grid-cols-7 gap-2">
          {thisWeek.map(({ label, iso }, i) => {
            const isToday = iso === new Date().toISOString().split('T')[0]
            const dayWorkouts = workoutsByDate[iso] ?? []
            const done = dayWorkouts.length > 0

            return (
              <div key={iso}
                className="rounded-xl p-3 text-center transition-all"
                style={{
                  background: done ? 'rgba(0,212,255,0.1)' : isToday ? 'rgba(255,255,255,0.06)' : 'var(--card-bg)',
                  border: `1px solid ${done ? 'rgba(0,212,255,0.35)' : isToday ? 'rgba(255,255,255,0.15)' : 'var(--card-border)'}`,
                }}>
                <p className="text-[10px] text-[var(--text-muted)] mb-1">{DAYS[i + 1 > 6 ? 0 : i + 1] || label}</p>
                <p className="text-xs font-semibold mb-2"
                  style={{ color: isToday ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                  {new Date(iso + 'T12:00:00').getDate()}
                </p>
                {done ? (
                  <div>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1"
                      style={{ background: 'rgba(0,212,255,0.2)' }}>
                      <span className="text-[10px] text-[var(--accent-cyan)]">✓</span>
                    </div>
                    <p className="text-[9px] text-[var(--text-muted)] leading-tight">
                      {getWorkoutType(dayWorkouts[0])}
                    </p>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full mx-auto"
                    style={{ background: 'rgba(255,255,255,0.06)' }} />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <LogWorkoutForm onAdded={w => setWorkouts(prev => [w, ...prev])} />
        <LogMetricForm onAdded={m => setMetrics(prev => [m, ...prev])} />
      </div>

      {/* Body metrics chart */}
      {metricChart.length >= 2 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Body Metrics Trend</h2>
          <div className="rounded-xl p-5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metricChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: '#0a0e27', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <Line type="monotone" dataKey="weight" name="Weight (lbs)" stroke="#00d4ff" strokeWidth={2}
                  dot={{ fill: '#00d4ff', r: 3 }} connectNulls />
                <Line type="monotone" dataKey="bf" name="Body Fat %" stroke="#1e90ff" strokeWidth={2}
                  dot={{ fill: '#1e90ff', r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Recent workouts */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recent Workouts</h2>
        {recentWorkouts.length === 0 ? (
          <div className="rounded-xl p-8 text-center"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <p className="text-3xl mb-2">💪</p>
            <p className="text-[var(--text-primary)] font-semibold mb-1">No workouts logged yet</p>
            <p className="text-sm text-[var(--text-muted)]">Use the button above to log your first session.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map(w => {
              const dur = getWorkoutDuration(w)
              return (
                <div key={w.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(0,212,255,0.12)' }}>
                    <span className="text-sm">
                      {getWorkoutType(w) === 'Strength' ? '🏋️' :
                       getWorkoutType(w) === 'Cardio' ? '🏃' :
                       getWorkoutType(w) === 'Sauna' ? '🧖' :
                       getWorkoutType(w) === 'Yoga' ? '🧘' : '💪'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{getWorkoutType(w)}</p>
                    {w.notes && <p className="text-xs text-[var(--text-muted)]">{w.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--text-secondary)]">
                      {getWorkoutDate(w) ? new Date(getWorkoutDate(w) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </p>
                    {dur && <p className="text-xs text-[var(--text-muted)]">{dur}m</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
