'use client'

// Daily check-in — one screen, big toggles, one tap to save. Replaces the old
// "6 AM Protocol" artifact. Writes health_checkins (and weigh-ins to
// body_metrics) via /api/health/checkin.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react'

type Checkin = {
  lifted: boolean; session_type: string | null; sauna: boolean; walk: boolean; peloton: boolean
  lights_out_on_time: boolean; game_off_on_time: boolean; journal: boolean; nicotine_free: boolean
  sleep_hours: number | null; energy_level: number | null; cardio_minutes: number | null
  weight_lbs: string; pain_notes: string; notes: string
}

const EMPTY: Checkin = {
  lifted: false, session_type: null, sauna: false, walk: false, peloton: false,
  lights_out_on_time: false, game_off_on_time: false, journal: false, nicotine_free: false,
  sleep_hours: 7, energy_level: null, cardio_minutes: null, weight_lbs: '', pain_notes: '', notes: '',
}

const HABITS: { key: keyof Checkin; label: string }[] = [
  { key: 'sauna', label: 'Sauna' },
  { key: 'walk', label: 'Walk' },
  { key: 'peloton', label: 'Peloton' },
  { key: 'lights_out_on_time', label: 'Lights out on time' },
  { key: 'game_off_on_time', label: 'Game off on time' },
  { key: 'journal', label: 'Journal' },
  { key: 'nicotine_free', label: 'Nicotine-free' },
]
const SESSIONS = ['push', 'pull', 'legs', 'upper', 'lower', 'full', 'rest']

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const label = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className="flex items-center justify-between gap-3 w-full rounded-xl px-4 py-3.5 text-[14px] font-medium transition-all"
      style={{
        background: on ? 'rgba(var(--accent-rgb), 0.14)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${on ? 'rgba(var(--accent-rgb), 0.55)' : 'rgba(255,255,255,0.1)'}`,
        color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}>
      {children}
      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ background: on ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)' }}>
        {on && <Check size={14} color="#050505" strokeWidth={3} />}
      </span>
    </button>
  )
}

export default function CheckinPage() {
  const [today, setToday] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [form, setForm] = useState<Checkin>(EMPTY)
  const [logged, setLogged] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWeekly, setShowWeekly] = useState(false)

  const load = useCallback(async (d?: string) => {
    const res = await fetch(`/api/health/checkin${d ? `?date=${d}` : ''}`)
    if (!res.ok) { setError('Could not load check-in'); return }
    const data = await res.json()
    setToday(data.today)
    setDate(data.date)
    setLogged(data.loggedLast7)
    const c = data.checkin
    setForm(c ? {
      ...EMPTY, ...Object.fromEntries(Object.entries(c).filter(([, v]) => v !== null)),
      weight_lbs: c.weight_lbs != null ? String(c.weight_lbs) : '',
      pain_notes: c.pain_notes ?? '', notes: c.notes ?? '',
    } as Checkin : EMPTY)
    // Weekly weigh-in section opens itself on Sundays
    setShowWeekly(new Date(`${data.date}T12:00:00Z`).getUTCDay() === 0 || (c?.weight_lbs != null))
    setSaved(false)
  }, [])

  useEffect(() => { load() }, [load])

  const set = <K extends keyof Checkin>(k: K, v: Checkin[K]) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  async function save() {
    if (!date) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/health/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, checkin_date: date, weight_lbs: form.weight_lbs === '' ? null : Number(form.weight_lbs) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setSaved(true)
      const r = await fetch('/api/health/checkin')
      if (r.ok) setLogged((await r.json()).loggedLast7)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!date || !today) {
    return <div className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>{error ?? 'Loading…'}</div>
  }
  const canBack = date > shift(today, -7)
  const canFwd = date < today

  return (
    <div className="max-w-lg mx-auto w-full px-4 pt-5 pb-28">
      <div className="flex items-center justify-between mb-4">
        <Link href="/health" className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Health
        </Link>
        {logged != null && (
          <span className="text-[11px] px-2 py-1 rounded-lg" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent-cyan)' }}>
            {logged} of last 7 days logged
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold gradient-text">Daily check-in</h1>
      <div className="flex items-center gap-2 mt-1 mb-5">
        <button onClick={() => canBack && load(shift(date, -1))} disabled={!canBack} aria-label="Previous day"
          className="px-2 py-1 rounded-lg text-[12px]" style={{ color: canBack ? 'var(--text-secondary)' : 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}>‹</button>
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{date === today ? `Today · ${label(date)}` : label(date)}</span>
        <button onClick={() => canFwd && load(shift(date, 1))} disabled={!canFwd} aria-label="Next day"
          className="px-2 py-1 rounded-lg text-[12px]" style={{ color: canFwd ? 'var(--text-secondary)' : 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}>›</button>
      </div>

      {/* Training */}
      <section className="mb-5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Training</h2>
        <Toggle on={form.lifted} onClick={() => set('lifted', !form.lifted)}>Lifted</Toggle>
        {form.lifted && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SESSIONS.map(s => (
              <button key={s} type="button" onClick={() => set('session_type', form.session_type === s ? null : s)}
                className="px-3 py-1.5 rounded-full text-[12px] capitalize"
                style={{
                  background: form.session_type === s ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                  color: form.session_type === s ? '#050505' : 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.1)', fontWeight: form.session_type === s ? 600 : 400,
                }}>{s}</button>
            ))}
          </div>
        )}
      </section>

      {/* Habits */}
      <section className="mb-5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Habits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HABITS.map(h => (
            <Toggle key={h.key} on={Boolean(form[h.key])} onClick={() => set(h.key, !form[h.key] as never)}>{h.label}</Toggle>
          ))}
        </div>
      </section>

      {/* Sleep + energy */}
      <section className="mb-5 grid grid-cols-1 gap-4">
        <div className="glass-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Sleep (hours)</div>
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Less sleep" onClick={() => set('sleep_hours', Math.max(0, (form.sleep_hours ?? 7) - 0.5))}
              className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}><Minus size={18} /></button>
            <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)' }}>{(form.sleep_hours ?? 7).toFixed(1)}</span>
            <button type="button" aria-label="More sleep" onClick={() => set('sleep_hours', Math.min(16, (form.sleep_hours ?? 7) + 0.5))}
              className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}><Plus size={18} /></button>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Energy (1–10)</div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" onClick={() => set('energy_level', n)}
                className="h-10 rounded-lg text-[13px] font-semibold"
                style={{
                  background: form.energy_level === n ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                  color: form.energy_level === n ? '#050505' : 'var(--text-secondary)',
                }}>{n}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly */}
      <section className="mb-5">
        <button type="button" onClick={() => setShowWeekly(v => !v)} className="text-[12px] mb-2"
          style={{ color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer' }}>
          {showWeekly ? '− ' : '+ '}Weekly weigh-in & notes
        </button>
        {showWeekly && (
          <div className="glass-card p-4 flex flex-col gap-3">
            <label className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Weight (lb)
              <input inputMode="decimal" value={form.weight_lbs} onChange={e => set('weight_lbs', e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="207.8" className="mt-1 w-full rounded-lg px-3 py-2.5 text-[15px] outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-line)', color: 'var(--text-primary)' }} />
            </label>
            <label className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Pain / soreness
              <textarea value={form.pain_notes} onChange={e => set('pain_notes', e.target.value)} rows={2}
                className="mt-1 w-full rounded-lg px-3 py-2 text-[14px] outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-line)', color: 'var(--text-primary)' }} />
            </label>
            <label className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Notes
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="mt-1 w-full rounded-lg px-3 py-2 text-[14px] outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-line)', color: 'var(--text-primary)' }} />
            </label>
          </div>
        )}
      </section>

      {error && <p className="text-[12px] mb-3" style={{ color: '#ef4444' }}>{error}</p>}

      {/* Sticky save (above the mobile tab bar) */}
      <div className="fixed left-0 right-0 bottom-16 md:bottom-4 px-4 z-20">
        <div className="max-w-lg mx-auto">
          <button onClick={save} disabled={saving}
            className="w-full rounded-xl py-3.5 text-[15px] font-semibold shadow-lg"
            style={{ background: saved ? '#22c55e' : 'var(--accent-gradient)', color: '#050505', border: 'none', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save check-in'}
          </button>
        </div>
      </div>
    </div>
  )
}
