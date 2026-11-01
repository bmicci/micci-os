'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import HealthDocumentsCard from './HealthDocumentsCard'
import { KEY_MARKERS, LAB_CATEGORIES, labCategory, labDate, markerFlag, reportedValue } from '@/lib/health/labs'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import type { LabMarker } from './types'

// Key labs to display even when empty
const KEY_LABS = [
  'Testosterone (Total)', 'Testosterone (Free)', 'Estradiol (E2)', 'SHBG',
  'Hematocrit', 'PSA', 'LDL', 'HDL', 'Triglycerides', 'Total Cholesterol',
  'Vitamin D', 'B12', 'Ferritin', 'TSH',
]

const FLAG_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  normal:     { label: 'Normal',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  borderline: { label: 'Borderline', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  low:        { label: 'Low',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high:       { label: 'High',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  unknown:    { label: '—',          color: 'var(--text-muted)', bg: 'transparent' },
}

function RangeBar({ value, low, high, flag }: { value: number; low: number | null; high: number | null; flag: string }) {
  if (low == null || high == null || high <= low) return null
  const pct = Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100))
  const color = flag === 'normal' ? '#22c55e' : '#ef4444'

  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
        <span>{low}</span>
        <span>Reference range</span>
        <span>{high}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
          }}
        />
      </div>
    </div>
  )
}

interface LabCardProps {
  markerName: string
  entries: LabMarker[]
  isExpanded: boolean
  onToggle: () => void
}

function LabCard({ markerName, entries, isExpanded, onToggle }: LabCardProps) {
  const sorted = [...entries].sort((a, b) => a.test_date.localeCompare(b.test_date))
  const latest = sorted[sorted.length - 1]
  if (!latest) return null

  const latestValue = Number(latest.value)
  const flag = markerFlag(latestValue, latest.reference_low, latest.reference_high, latest.flag, latest.notes)
  const { label: flagLabel, color: flagColor, bg: flagBg } = FLAG_STYLE[flag]

  const chartData = sorted.map(e => ({
    date: labDate(e.test_date),
    value: Number(e.value),
  }))

  return (
    <div
      className="rounded-xl overflow-hidden transition-all cursor-pointer"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{markerName}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: flagColor }}>
              {reportedValue(latestValue, latest.notes)}
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{latest.unit}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {labDate(latest.test_date)}
              {latest.source && <span className="ml-1">· {latest.source}</span>}
              {entries.length > 1 && <span className="ml-2">· {entries.length} readings</span>}
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
            style={{ background: flagBg, color: flagColor, border: `1px solid ${flagColor}40` }}>
            {flagLabel}
          </span>
        </div>

        <RangeBar value={latestValue} low={latest.reference_low} high={latest.reference_high} flag={flag} />
      </div>

      {/* Expanded chart */}
      {isExpanded && chartData.length > 1 && (
        <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="pt-4">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-line)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                  itemStyle={{ color: '#5ee6ff' }}
                />
                {latest.reference_low != null && latest.reference_low > 0 && (
                  <ReferenceLine y={latest.reference_low} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" />
                )}
                {latest.reference_high != null && (
                  <ReferenceLine y={latest.reference_high} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" />
                )}
                <Line
                  type="monotone" dataKey="value"
                  stroke="#5ee6ff" strokeWidth={2}
                  dot={{ fill: '#5ee6ff', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add result form ────────────────────────────────────────────────────────

function AddLabForm({ onAdded }: { onAdded: (m: LabMarker) => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    marker_name: '', test_date: new Date().toISOString().split('T')[0],
    value: '', unit: '', reference_low: '', reference_high: '', notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('lab_markers')
      .insert({
        marker_name: form.marker_name,
        test_date: form.test_date,
        value: parseFloat(form.value),
        unit: form.unit,
        reference_low: form.reference_low ? parseFloat(form.reference_low) : null,
        reference_high: form.reference_high ? parseFloat(form.reference_high) : null,
        notes: form.notes || null,
      })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      onAdded(data as LabMarker)
      setOpen(false)
      setForm({ marker_name: '', test_date: new Date().toISOString().split('T')[0], value: '', unit: '', reference_low: '', reference_high: '', notes: '' })
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(var(--accent-rgb), 0.3)' }}>
        + Add Lab Result
      </button>
    )
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

  return (
    <form onSubmit={handleSubmit}
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-line)' }}>
      <p className="text-sm font-semibold text-[var(--text-primary)]">Add Lab Result</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Test Name</label>
          <input list="lab-names" value={form.marker_name} onChange={e => setForm(p => ({ ...p, marker_name: e.target.value }))}
            required style={inputStyle} placeholder="e.g. Testosterone (Total)" />
          <datalist id="lab-names">
            {KEY_LABS.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Date</label>
          <input type="date" value={form.test_date} onChange={e => setForm(p => ({ ...p, test_date: e.target.value }))}
            required style={inputStyle} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Value</label>
          <input type="number" step="any" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
            required style={inputStyle} placeholder="850" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Unit</label>
          <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
            required style={inputStyle} placeholder="ng/dL" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Ref Min</label>
          <input type="number" step="any" value={form.reference_low} onChange={e => setForm(p => ({ ...p, reference_low: e.target.value }))}
            style={inputStyle} placeholder="300" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Ref Max</label>
          <input type="number" step="any" value={form.reference_high} onChange={e => setForm(p => ({ ...p, reference_high: e.target.value }))}
            style={inputStyle} placeholder="1000" />
        </div>
      </div>
      <div>
        <label className="text-xs text-[var(--text-muted)] block mb-1">Notes</label>
        <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          style={inputStyle} placeholder="Optional notes" />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="btn btn-primary">
          {saving ? 'Saving…' : 'Save Result'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function LabsTab({ labMarkers: initialMarkers }: { labMarkers: LabMarker[] }) {
  const [markers, setMarkers] = useState<LabMarker[]>(initialMarkers)
  const [expanded, setExpanded] = useState<string | null>(null)
  const router = useRouter()
  // Saved uploads refresh the server data; keep local state in step with it
  useEffect(() => { setMarkers(initialMarkers) }, [initialMarkers])

  const [query, setQuery] = useState('')
  const [onlyFlagged, setOnlyFlagged] = useState(false)

  // Group by marker name
  const grouped: Record<string, LabMarker[]> = {}
  for (const m of markers) {
    grouped[m.marker_name] = [...(grouped[m.marker_name] ?? []), m]
  }
  const latestOf = (name: string) => [...grouped[name]].sort((a, b) => b.test_date.localeCompare(a.test_date))[0]
  const isFlagged = (name: string) => {
    const l = latestOf(name)
    const f = markerFlag(Number(l.value), l.reference_low, l.reference_high, l.flag, l.notes)
    return f === 'high' || f === 'low'
  }

  const markerNames = Object.keys(grouped)
  const outOfRange = markerNames.filter(isFlagged)
  const q = query.trim().toLowerCase()
  const visible = markerNames.filter(n => (!q || n.toLowerCase().includes(q)) && (!onlyFlagged || isFlagged(n)))
  const keyVisible = KEY_MARKERS.filter(n => visible.includes(n))
  const sections = [...LAB_CATEGORIES.map(c => ({ id: c.id, label: c.label })), { id: 'other', label: 'Other' }]
    .map(sec => ({
      ...sec,
      names: visible.filter(n => labCategory(n) === sec.id && !(keyVisible.includes(n) && !q && !onlyFlagged)).sort(),
    }))
    .filter(sec => sec.names.length > 0)
  const draws = new Set(markers.map(m => m.test_date)).size

  const renderCards = (names: string[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {names.map(name => (
        <LabCard
          key={name}
          markerName={name}
          entries={grouped[name]}
          isExpanded={expanded === name}
          onToggle={() => setExpanded(prev => prev === name ? null : name)}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <HealthDocumentsCard kind="lab" onSaved={() => router.refresh()} />
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Lab Results</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {markerNames.length} markers · {draws} draws
            {outOfRange.length > 0 && (
              <span className="ml-2 text-red-400">· {outOfRange.length} out of range on the latest draw</span>
            )}
          </p>
        </div>
        <AddLabForm onAdded={m => setMarkers(prev => [m, ...prev])} />
      </div>

      {/* Cards */}
      {markerNames.length === 0 ? (
        <div className="rounded-xl p-10 text-center"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <p className="text-4xl mb-3">🔬</p>
          <p className="text-[var(--text-primary)] font-semibold mb-1">No lab results yet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Add your first result with the button above, or upload a lab report in the Import tab.
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {KEY_LABS.slice(0, 8).map(l => (
              <div key={l} className="text-xs text-[var(--text-muted)] px-2 py-1.5 rounded-lg text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search markers (e.g. testosterone, LDL)"
              aria-label="Search markers" className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-[13px] outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-line)', color: 'var(--text-primary)' }} />
            <button onClick={() => setOnlyFlagged(v => !v)} aria-pressed={onlyFlagged}
              className="text-[12px] px-3 py-2 rounded-lg"
              style={{
                background: onlyFlagged ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                color: onlyFlagged ? '#ef4444' : 'var(--text-secondary)',
                border: `1px solid ${onlyFlagged ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
              }}>
              Out of range only
            </button>
          </div>
          {keyVisible.length > 0 && !q && !onlyFlagged && (
            <section className="space-y-3">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Key markers</h3>
              {renderCards(keyVisible)}
            </section>
          )}
          {sections.map(sec => (
            <section key={sec.id} className="space-y-3">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{sec.label} · {sec.names.length}</h3>
              {renderCards(sec.names)}
            </section>
          ))}
          {visible.length === 0 && <p className="text-sm text-[var(--text-muted)]">No markers match.</p>}
        </>
      )}
    </div>
  )
}
