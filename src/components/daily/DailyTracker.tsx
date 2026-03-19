'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DbRoutine } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  initialRoutines: DbRoutine[]
  initialCompletedIds: string[]
  initialDate: string
}

type ViewMode = 'daily' | 'weekly'

type NewRoutineForm = {
  title: string
  description: string
  category: DbRoutine['category']
  time_of_day: DbRoutine['time_of_day']
  frequency: DbRoutine['frequency']
  days_of_week: string[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const TIME_GROUPS: { key: DbRoutine['time_of_day']; icon: string; label: string }[] = [
  { key: 'morning', icon: '☀️', label: 'Morning' },
  { key: 'midday',  icon: '🏋️', label: 'Midday'  },
  { key: 'evening', icon: '🌙', label: 'Evening'  },
  { key: 'anytime', icon: '⏰', label: 'Anytime'  },
]

const CATEGORY_COLORS: Record<DbRoutine['category'], string> = {
  morning:         '#f59e0b',
  evening:         '#8b5cf6',
  health_protocol: '#ec4899',
  supplement:      '#06b6d4',
  skincare:        '#f472b6',
  fitness:         '#10b981',
  spiritual:       '#a78bfa',
  personal:        '#60a5fa',
  work:            '#f97316',
  custom:          '#6b7280',
}

const CATEGORY_OPTIONS: DbRoutine['category'][] = [
  'morning', 'evening', 'health_protocol', 'supplement', 'skincare',
  'fitness', 'spiritual', 'personal', 'work', 'custom',
]

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY_ABBR  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Helpers ────────────────────────────────────────────────────────────────

function isScheduledForDate(routine: DbRoutine, date: Date): boolean {
  const dayName = DAY_NAMES[date.getDay()]
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  switch (routine.frequency) {
    case 'daily':    return true
    case 'weekdays': return !isWeekend
    case 'weekends': return isWeekend
    case 'weekly':
    case 'custom':   return (routine.days_of_week ?? []).includes(dayName)
    default:         return true
  }
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

function getWeekStart(d: Date): Date {
  const s = new Date(d)
  s.setDate(s.getDate() - s.getDay()) // Sunday
  return s
}

function streakLabel(n: number): string {
  if (n === 0) return ''
  if (n < 3)   return `${n}d`
  if (n < 7)   return `🔥 ${n}d`
  if (n < 14)  return `🔥 ${n}d`
  if (n < 30)  return `🔥🔥 ${n}d`
  return `🔥🔥🔥 ${n}d`
}

function streakColor(n: number): string {
  if (n >= 30) return 'text-amber-400'
  if (n >= 14) return 'text-orange-400'
  if (n >= 7)  return 'text-orange-300'
  if (n >= 3)  return 'text-yellow-400'
  return 'text-[var(--text-muted)]'
}

// ── Add Routine Modal ──────────────────────────────────────────────────────

function AddRoutineModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (r: NewRoutineForm) => Promise<void>
}) {
  const [form, setForm] = useState<NewRoutineForm>({
    title: '', description: '', category: 'personal',
    time_of_day: 'morning', frequency: 'daily', days_of_week: [],
  })
  const [saving, setSaving] = useState(false)

  const toggleDay = (d: string) =>
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter(x => x !== d)
        : [...f.days_of_week, d],
    }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] p-6 space-y-4"
        style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Add Routine</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="Routine title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as DbRoutine['category'] }))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/12 text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c} style={{ background: '#0a0e27' }}>
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Time of day</label>
              <select
                value={form.time_of_day}
                onChange={e => setForm(f => ({ ...f, time_of_day: e.target.value as DbRoutine['time_of_day'] }))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/12 text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50"
              >
                {TIME_GROUPS.map(t => (
                  <option key={t.key} value={t.key} style={{ background: '#0a0e27' }}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Frequency</label>
            <div className="flex gap-2 flex-wrap">
              {(['daily', 'weekdays', 'weekends', 'weekly', 'custom'] as const).map(f => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setForm(prev => ({ ...prev, frequency: f }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                    form.frequency === f
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:bg-white/10'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {(form.frequency === 'weekly' || form.frequency === 'custom') && (
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Days</label>
              <div className="flex gap-1.5">
                {DAY_NAMES.map((d, i) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`w-8 h-8 rounded-full text-xs font-medium border cursor-pointer transition-all ${
                      form.days_of_week.includes(d)
                        ? 'bg-cyan-500/25 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:bg-white/10'
                    }`}
                  >
                    {DAY_ABBR[i][0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm border border-white/12 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50"
              style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
              {saving ? 'Saving…' : 'Add Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Weekly Grid ────────────────────────────────────────────────────────────

function WeeklyGrid({
  routines,
  weekStart,
  weekCompletions,
}: {
  routines: DbRoutine[]
  weekStart: Date
  weekCompletions: Record<string, string[]>
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = toDateStr(new Date())

  // Only show routines scheduled for at least one day this week
  const weekRoutines = routines.filter(r => days.some(d => isScheduledForDate(r, d)))

  // Column totals for compliance %
  const colTotals = days.map(d => {
    const dateStr = toDateStr(d)
    const scheduled = routines.filter(r => isScheduledForDate(r, d))
    const completed = (weekCompletions[dateStr] ?? []).filter(id => scheduled.some(r => r.id === id))
    return scheduled.length > 0 ? Math.round((completed.length / scheduled.length) * 100) : null
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[600px]">
        <thead>
          <tr>
            <th className="text-left py-2 pr-3 text-[var(--text-muted)] font-medium w-40">Routine</th>
            {days.map((d, i) => {
              const dateStr = toDateStr(d)
              const isToday = dateStr === today
              return (
                <th key={i} className={`text-center py-2 px-1 font-medium w-12 ${isToday ? 'text-cyan-400' : 'text-[var(--text-muted)]'}`}>
                  <div>{DAY_ABBR[d.getDay()]}</div>
                  <div className={`text-[10px] mt-0.5 ${isToday ? 'text-cyan-300' : 'text-[var(--text-muted)] opacity-60'}`}>
                    {d.getDate()}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {weekRoutines.map(r => {
            const catColor = CATEGORY_COLORS[r.category]
            return (
              <tr key={r.id} className="border-t border-white/5 hover:bg-white/2">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: catColor }} />
                    <span className="text-[var(--text-secondary)] truncate max-w-[140px]">{r.title}</span>
                  </div>
                </td>
                {days.map((d, i) => {
                  const dateStr = toDateStr(d)
                  const scheduled = isScheduledForDate(r, d)
                  const completed = (weekCompletions[dateStr] ?? []).includes(r.id)
                  const isPast = dateStr < today
                  const isToday = dateStr === today
                  return (
                    <td key={i} className="text-center py-2 px-1">
                      {!scheduled ? (
                        <span className="text-white/15">—</span>
                      ) : completed ? (
                        <span className="text-emerald-400 text-sm">✓</span>
                      ) : isPast ? (
                        <span className="text-red-400/60 text-sm">✗</span>
                      ) : isToday ? (
                        <span className="text-cyan-500/40">○</span>
                      ) : (
                        <span className="text-white/15">○</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/10">
            <td className="py-2 pr-3 text-[var(--text-muted)] font-medium">Day %</td>
            {colTotals.map((pct, i) => (
              <td key={i} className="text-center py-2 px-1">
                {pct === null ? (
                  <span className="text-white/15">—</span>
                ) : (
                  <span className={`font-semibold ${pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-cyan-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {pct}%
                  </span>
                )}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function DailyTracker({ initialRoutines, initialCompletedIds, initialDate }: Props) {
  const [routines, setRoutines] = useState<DbRoutine[]>(initialRoutines)
  const [date, setDate] = useState<Date>(() => {
    const d = new Date(initialDate + 'T12:00:00')
    return d
  })
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds))
  const [view, setView] = useState<ViewMode>('daily')
  const [weekCompletions, setWeekCompletions] = useState<Record<string, string[]>>({})
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const dateStr = toDateStr(date)
  const todayStr = toDateStr(new Date())
  const isToday = dateStr === todayStr
  const isFuture = dateStr > todayStr

  // Filter + group routines for selected date
  const todayRoutines = routines.filter(r => isScheduledForDate(r, date))
  const groups = Object.fromEntries(
    TIME_GROUPS.map(t => [t.key, todayRoutines.filter(r => r.time_of_day === t.key).sort((a, b) => a.sort_order - b.sort_order)])
  ) as Record<DbRoutine['time_of_day'], DbRoutine[]>

  const total = todayRoutines.length
  const done  = todayRoutines.filter(r => completedIds.has(r.id)).length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  // Week stats for footer
  const activeStreaks = routines.filter(r => r.streak_current >= 3).length
  const bestStreak    = Math.max(0, ...routines.map(r => r.streak_best))
  const bestRoutine   = routines.find(r => r.streak_best === bestStreak)

  // Fetch completions when date changes
  useEffect(() => {
    if (dateStr === initialDate) return
    fetch(`/api/routines/completions?date=${dateStr}`)
      .then(r => r.json())
      .then((data: { routine_id: string; skipped: boolean }[]) => {
        setCompletedIds(new Set(data.filter(c => !c.skipped).map(c => c.routine_id)))
      })
      .catch(console.error)
  }, [dateStr, initialDate])

  // Fetch week completions when switching to weekly view
  useEffect(() => {
    if (view !== 'weekly') return
    const ws  = getWeekStart(date)
    const we  = addDays(ws, 6)
    const s   = toDateStr(ws)
    const e   = toDateStr(we)
    fetch(`/api/routines/completions?start=${s}&end=${e}`)
      .then(r => r.json())
      .then((data: { routine_id: string; completed_date: string; skipped: boolean }[]) => {
        const map: Record<string, string[]> = {}
        for (const c of data) {
          if (c.skipped) continue
          if (!map[c.completed_date]) map[c.completed_date] = []
          map[c.completed_date].push(c.routine_id)
        }
        setWeekCompletions(map)
      })
      .catch(console.error)
  }, [view, dateStr])

  const toggleCompletion = useCallback(async (routineId: string) => {
    if (isFuture) return

    const wasDone = completedIds.has(routineId)
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (wasDone) next.delete(routineId)
      else next.add(routineId)
      return next
    })
    setTogglingId(routineId)

    try {
      const res = await fetch('/api/routines/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routine_id: routineId, date: dateStr }),
      })
      if (!res.ok) throw new Error('Failed')
      const result = await res.json() as { action: string; streak_current: number; streak_best: number }
      setRoutines(prev => prev.map(r =>
        r.id === routineId
          ? { ...r, streak_current: result.streak_current, streak_best: result.streak_best }
          : r
      ))
    } catch {
      setCompletedIds(prev => {
        const next = new Set(prev)
        if (wasDone) next.add(routineId)
        else next.delete(routineId)
        return next
      })
    } finally {
      setTogglingId(null)
    }
  }, [completedIds, dateStr, isFuture])

  const handleSeed = useCallback(async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/routines/seed', { method: 'POST' })
      const data = await res.json() as { seeded?: number; message?: string }
      if (data.seeded) {
        const r = await fetch('/api/routines')
        const fresh = await r.json() as DbRoutine[]
        setRoutines(fresh)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSeeding(false)
    }
  }, [])

  const handleAddRoutine = useCallback(async (form: NewRoutineForm) => {
    const res = await fetch('/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json() as DbRoutine
    setRoutines(prev => [...prev, data])
    setShowAdd(false)
  }, [])

  const handleDeleteRoutine = useCallback(async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/routines/${id}`, { method: 'DELETE' })
    setRoutines(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
  }, [])

  const weekStart = getWeekStart(date)

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-6 py-4 flex items-start justify-between gap-4"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}
      >
        <div>
          <h1 className="text-lg font-bold gradient-text">⚡ Daily Command</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Date nav + view toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setDate(d => addDays(d, -1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-all text-sm"
          >◀</button>
          {!isToday && (
            <button
              onClick={() => setDate(new Date())}
              className="px-2.5 py-1 rounded-lg text-xs bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 cursor-pointer hover:bg-cyan-500/25 transition-all"
            >Today</button>
          )}
          <button
            onClick={() => setDate(d => addDays(d, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-all text-sm"
          >▶</button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={() => setView(v => v === 'daily' ? 'weekly' : 'daily')}
            className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-all ${
              view === 'weekly'
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:bg-white/10'
            }`}
          >
            {view === 'daily' ? '📋 Week' : '📋 Day'}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Progress bar — daily only */}
        {view === 'daily' && total > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {done}/{total} complete
              </span>
              <span className={`text-base font-bold ${
                pct === 100 ? 'text-emerald-400' : pct >= 80 ? 'text-cyan-400' : pct >= 50 ? 'text-amber-400' : 'text-[var(--text-muted)]'
              }`}>
                {pct}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct === 100
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'var(--accent-gradient)',
                }}
              />
            </div>
            {pct === 100 && (
              <p className="text-xs text-emerald-400 mt-2 text-center font-medium">
                🎉 Perfect day! All routines complete.
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {routines.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-4xl">⚡</p>
            <p className="text-[var(--text-primary)] font-medium">No routines yet</p>
            <p className="text-sm text-[var(--text-muted)]">Seed your default routines to get started</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50"
              style={{ background: 'var(--accent-gradient)', color: '#050505' }}
            >
              {seeding ? 'Seeding…' : '🌱 Load My Default Routines'}
            </button>
          </div>
        )}

        {/* ── DAILY VIEW ─────────────────────────────────────────── */}
        {view === 'daily' && routines.length > 0 && (
          <div className="space-y-4">
            {TIME_GROUPS.map(({ key, icon, label }) => {
              const items = groups[key]
              if (items.length === 0) return null
              const groupDone = items.filter(r => completedIds.has(r.id)).length

              return (
                <div key={key} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
                  {/* Group header */}
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">{label}</span>
                    </div>
                    <span className={`text-xs font-semibold ${groupDone === items.length ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                      {groupDone}/{items.length}
                    </span>
                  </div>

                  {/* Routine rows */}
                  <div className="divide-y divide-white/4">
                    {items.map(r => {
                      const isDone    = completedIds.has(r.id)
                      const isLoading = togglingId === r.id
                      const catColor  = CATEGORY_COLORS[r.category]
                      const streak    = r.streak_current

                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                            isFuture ? 'opacity-50' : 'cursor-pointer hover:bg-white/3'
                          }`}
                          onClick={() => toggleCompletion(r.id)}
                        >
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center border-2 transition-all ${
                            isDone
                              ? 'border-cyan-400 bg-cyan-500/20'
                              : 'border-white/20 bg-transparent'
                          } ${isLoading ? 'opacity-40 scale-90' : ''}`}>
                            {isDone && <span className="text-cyan-400 text-[10px] font-bold">✓</span>}
                          </div>

                          {/* Category dot */}
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: catColor }} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium transition-colors ${
                              isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                            }`}>
                              {r.title}
                            </p>
                            {r.description && !isDone && (
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate leading-relaxed">
                                {r.description}
                              </p>
                            )}
                          </div>

                          {/* Streak + delete */}
                          <div className="flex items-center gap-2 shrink-0">
                            {streak > 0 && (
                              <span className={`text-xs font-medium ${streakColor(streak)}`}>
                                {streakLabel(streak)}
                              </span>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); handleDeleteRoutine(r.id) }}
                              className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all cursor-pointer text-xs"
                              disabled={deletingId === r.id}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Future day notice */}
            {isFuture && (
              <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                Future day — preview only. Navigate back to complete routines.
              </div>
            )}

            {/* Add routine */}
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-3 rounded-xl border border-dashed border-white/15 text-xs text-[var(--text-muted)] hover:border-cyan-500/30 hover:text-[var(--accent-cyan)] transition-all cursor-pointer"
            >
              + Add routine
            </button>
          </div>
        )}

        {/* ── WEEKLY VIEW ────────────────────────────────────────── */}
        {view === 'weekly' && routines.length > 0 && (
          <div className="space-y-4">
            {/* Week label */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Week of {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                {' – '}
                {addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDate(d => addDays(d, -7))}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer px-2 py-1">
                  ◀ Prev week
                </button>
                <button onClick={() => setDate(d => addDays(d, 7))}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer px-2 py-1">
                  Next week ▶
                </button>
              </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
              <WeeklyGrid
                routines={routines}
                weekStart={weekStart}
                weekCompletions={weekCompletions}
              />
            </div>
          </div>
        )}

        {/* ── Stats footer ──────────────────────────────────────── */}
        {routines.length > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Active streaks </span>
              <span className="font-semibold text-orange-400">{activeStreaks} 🔥</span>
            </div>
            {bestStreak > 0 && bestRoutine && (
              <div>
                <span className="text-[var(--text-muted)]">Best streak </span>
                <span className="font-semibold text-amber-400">{bestStreak}d</span>
                <span className="text-[var(--text-muted)]"> ({bestRoutine.title})</span>
              </div>
            )}
            <div>
              <span className="text-[var(--text-muted)]">Total routines </span>
              <span className="font-semibold text-[var(--text-primary)]">{routines.length}</span>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="ml-auto text-[var(--accent-cyan)] hover:underline cursor-pointer"
            >+ Add</button>
          </div>
        )}
      </div>

      {/* ── Add Modal ─────────────────────────────────────────────── */}
      {showAdd && (
        <AddRoutineModal onClose={() => setShowAdd(false)} onSave={handleAddRoutine} />
      )}
    </div>
  )
}
