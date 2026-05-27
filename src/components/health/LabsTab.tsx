'use client'

import { useState } from 'react'
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

function getFlag(value: number, low: number | null, high: number | null) {
  if (!low && !high) return 'unknown'
  if (low && value < low) return 'low'
  if (high && value > high) return 'high'
  // borderline: within 10% of boundary
  const borderLow = low ? value < low * 1.1 : false
  const borderHigh = high ? value > high * 0.9 : false
  if (borderLow || borderHigh) return 'borderline'
  return 'normal'
}

const FLAG_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  normal:     { label: 'Normal',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  borderline: { label: 'Borderline', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  low:        { label: 'Low',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high:       { label: 'High',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  unknown:    { label: '—',          color: 'var(--text-muted)', bg: 'transparent' },
}

function RangeBar({ value, low, high }: { value: number; low: number | null; high: number | null }) {
  if (!low || !high) return null
  const pct = Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100))
  const flag = getFlag(value, low, high)
  const color = flag === 'normal' ? '#22c55e' : flag === 'borderline' ? '#f59e0b' : '#ef4444'

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

  const flag = getFlag(latest.value, latest.reference_low, latest.reference_high)
  const { label: flagLabel, color: flagColor, bg: flagBg } = FLAG_STYLE[flag]

  const chartData = sorted.map(e => ({
    date: new Date(e.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: e.value,
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
              {latest.value}
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{latest.unit}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {new Date(latest.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {entries.length > 1 && <span className="ml-2">· {entries.length} readings</span>}
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
            style={{ background: flagBg, color: flagColor, border: `1px solid ${flagColor}40` }}>
            {flagLabel}
          </span>
        </div>

        <RangeBar value={latest.value} low={latest.reference_low} high={latest.reference_high} />
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
                  contentStyle={{ background: '#0a0e27', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                  itemStyle={{ color: '#00d4ff' }}
                />
                {latest.reference_low && (
                  <ReferenceLine y={latest.reference_low} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" />
                )}
                {latest.reference_high && (
                  <ReferenceLine y={latest.reference_high} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" />
                )}
                <Line
                  type="monotone" dataKey="value"
                  stroke="#00d4ff" strokeWidth={2}
                  dot={{ fill: '#00d4ff', r: 4 }}
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
        style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}>
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
      style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,212,255,0.25)' }}>
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
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #1e90ff)', color: '#000' }}>
          {saving ? 'Saving…' : 'Save Result'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
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

  // Group by marker name
  const grouped: Record<string, LabMarker[]> = {}
  for (const m of markers) {
    grouped[m.marker_name] = [...(grouped[m.marker_name] ?? []), m]
  }

  // Sort by most recent test date
  const markerNames = Object.keys(grouped).sort((a, b) => {
    const latA = grouped[a].reduce((acc, m) => m.test_date > acc ? m.test_date : acc, '')
    const latB = grouped[b].reduce((acc, m) => m.test_date > acc ? m.test_date : acc, '')
    return latB.localeCompare(latA)
  })

  const outOfRange = markerNames.filter(name => {
    const latest = grouped[name].sort((a, b) => b.test_date.localeCompare(a.test_date))[0]
    return latest && getFlag(latest.value, latest.reference_low, latest.reference_high) !== 'normal'
  })

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Lab Results</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {markerNames.length} markers tracked
            {outOfRange.length > 0 && (
              <span className="ml-2 text-red-400">· {outOfRange.length} out of range</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {markerNames.map(name => (
            <LabCard
              key={name}
              markerName={name}
              entries={grouped[name]}
              isExpanded={expanded === name}
              onToggle={() => setExpanded(prev => prev === name ? null : name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
