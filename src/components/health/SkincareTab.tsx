'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SkinCareStep } from './types'

// ── helpers ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  cleanser: '🧼', toner: '💧', serum: '💉', moisturizer: '🧴', spf: '☀️',
  treatment: '⚗️', mask: '🎭', eye_cream: '👁️', lip: '💋', body: '🧖',
}

const FREQUENCIES: Record<string, string> = {
  daily: 'Daily', every_other_day: 'Every other day',
  weekly: 'Weekly', as_needed: 'As needed',
}

// ── Add Step Form ──────────────────────────────────────────────────────────

function AddStepForm({ timeOfDay, onAdded }: { timeOfDay: 'am' | 'pm'; onAdded: (s: SkinCareStep) => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    step_name: '',
    product_name: '',
    product_brand: '',
    category: 'cleanser',
    frequency: 'daily',
    notes: '',
    est_replacement_date: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Get current max step_order for this time_of_day
    const { data: existing } = await supabase
      .from('skincare_routine')
      .select('step_order')
      .eq('time_of_day', timeOfDay)
      .order('step_order', { ascending: false })
      .limit(1)

    const nextOrder = existing?.[0]?.step_order ? existing[0].step_order + 1 : 1

    const { data, error } = await supabase
      .from('skincare_routine')
      .insert({
        user_id: user.id,
        step_name: form.step_name,
        product_name: form.product_name || null,
        product_brand: form.product_brand || null,
        time_of_day: timeOfDay,
        frequency: form.frequency,
        category: form.category,
        step_order: nextOrder,
        notes: form.notes || null,
        est_replacement_date: form.est_replacement_date || null,
        is_active: true,
      })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      onAdded(data as SkinCareStep)
      setOpen(false)
      setForm({ step_name: '', product_name: '', product_brand: '', category: 'cleanser', frequency: 'daily', notes: '', est_replacement_date: '' })
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
        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
        + Add Step
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit}
      className="mt-3 rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}>
      <p className="text-xs font-semibold text-[var(--text-primary)]">
        Add {timeOfDay.toUpperCase()} Step
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Step Name *</label>
          <input value={form.step_name} onChange={e => setForm(p => ({ ...p, step_name: e.target.value }))}
            required style={inputStyle} placeholder="e.g. Vitamin C Serum" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Category</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            style={{ ...inputStyle, appearance: 'none' }}>
            {['cleanser','toner','serum','moisturizer','spf','treatment','mask','eye_cream','lip','body'].map(c => (
              <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, x => x.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Product Name</label>
          <input value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))}
            style={inputStyle} placeholder="e.g. SkinCeuticals C E Ferulic" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Brand</label>
          <input value={form.product_brand} onChange={e => setForm(p => ({ ...p, product_brand: e.target.value }))}
            style={inputStyle} placeholder="e.g. SkinCeuticals" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Frequency</label>
          <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}
            style={{ ...inputStyle, appearance: 'none' }}>
            {Object.entries(FREQUENCIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Est. Replacement</label>
          <input type="date" value={form.est_replacement_date} onChange={e => setForm(p => ({ ...p, est_replacement_date: e.target.value }))}
            style={inputStyle} />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="btn btn-primary">
          {saving ? 'Saving…' : 'Add Step'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  )
}

// ── Routine section ────────────────────────────────────────────────────────

function RoutineSection({
  title,
  icon,
  steps,
  timeOfDay,
  onAdded,
}: {
  title: string
  icon: string
  steps: SkinCareStep[]
  timeOfDay: 'am' | 'pm'
  onAdded: (s: SkinCareStep) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order)

  // Reorder alert: within 14 days
  const needsReorder = sortedSteps.filter(s => {
    if (!s.est_replacement_date) return false
    const daysLeft = Math.round((new Date(s.est_replacement_date).getTime() - new Date(today).getTime()) / 86400000)
    return daysLeft <= 14
  })

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {icon} {title}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {sortedSteps.length} step{sortedSteps.length !== 1 ? 's' : ''}
            {needsReorder.length > 0 && (
              <span className="ml-2 text-amber-400">· {needsReorder.length} need reorder</span>
            )}
          </p>
        </div>
        <AddStepForm timeOfDay={timeOfDay} onAdded={onAdded} />
      </div>

      {/* Steps */}
      {sortedSteps.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[var(--text-muted)] text-sm">No steps added yet. Click &quot;+ Add Step&quot; to build your routine.</p>
        </div>
      ) : (
        <div>
          {sortedSteps.map((step, i) => {
            const daysLeft = step.est_replacement_date
              ? Math.round((new Date(step.est_replacement_date).getTime() - new Date(today).getTime()) / 86400000)
              : null
            const needsReorderFlag = daysLeft !== null && daysLeft <= 14
            const catIcon = step.category ? CATEGORY_ICONS[step.category] ?? '•' : '•'

            return (
              <div key={step.id}
                className="px-5 py-4 flex items-center gap-4 hover:bg-white/3 transition-colors"
                style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                {/* Step number */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                  style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--accent-cyan)' }}>
                  {i + 1}
                </div>

                {/* Category icon */}
                <span className="text-lg shrink-0">{catIcon}</span>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{step.step_name}</span>
                    {step.frequency !== 'daily' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                        {FREQUENCIES[step.frequency] ?? step.frequency}
                      </span>
                    )}
                  </div>
                  {step.product_name && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {step.product_brand ? `${step.product_brand} — ` : ''}{step.product_name}
                    </p>
                  )}
                  {step.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5">{step.notes}</p>}
                </div>

                {/* Reorder alert */}
                {daysLeft !== null && (
                  <div className="shrink-0 text-right">
                    {needsReorderFlag ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                        {daysLeft <= 0 ? 'Order now' : `${daysLeft}d left`}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">{daysLeft}d</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SkincareTab({ skincare: initialSkincare }: { skincare: SkinCareStep[] }) {
  const [skincare, setSkincare] = useState<SkinCareStep[]>(initialSkincare)

  const amSteps = skincare.filter(s => s.time_of_day === 'am' || s.time_of_day === 'both')
  const pmSteps = skincare.filter(s => s.time_of_day === 'pm' || s.time_of_day === 'both')

  function addStep(s: SkinCareStep) {
    setSkincare(prev => [...prev, s])
  }

  const totalNeedsReorder = skincare.filter(s => {
    if (!s.est_replacement_date) return false
    const daysLeft = Math.round((new Date(s.est_replacement_date).getTime() - Date.now()) / 86400000)
    return daysLeft <= 14
  }).length

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Skincare & Grooming</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {skincare.length} total steps
            {totalNeedsReorder > 0 && <span className="ml-2 text-amber-400">· {totalNeedsReorder} products need reorder</span>}
          </p>
        </div>
      </div>

      {/* AM Routine */}
      <RoutineSection
        title="Morning Routine"
        icon="🌅"
        steps={amSteps}
        timeOfDay="am"
        onAdded={addStep}
      />

      {/* PM Routine */}
      <RoutineSection
        title="Evening Routine"
        icon="🌙"
        steps={pmSteps}
        timeOfDay="pm"
        onAdded={addStep}
      />

      {/* Reorder alerts summary */}
      {totalNeedsReorder > 0 && (
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <p className="text-sm font-semibold text-amber-400 mb-2">⚠️ Products Running Low</p>
          <div className="space-y-1">
            {skincare
              .filter(s => {
                if (!s.est_replacement_date) return false
                const d = Math.round((new Date(s.est_replacement_date).getTime() - Date.now()) / 86400000)
                return d <= 14
              })
              .sort((a, b) => (a.est_replacement_date ?? '').localeCompare(b.est_replacement_date ?? ''))
              .map(s => {
                const d = Math.round((new Date(s.est_replacement_date!).getTime() - Date.now()) / 86400000)
                return (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      {s.product_name ?? s.step_name}
                    </span>
                    <span className="text-amber-400 font-medium text-xs">
                      {d <= 0 ? 'Order now' : `${d} days left`}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
