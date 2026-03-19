'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type {
  DbHouseProject, DbHouseProjectMilestone,
  DbHouseMaterial, DbHousePayment, DbHouseContractor,
} from '@/types/database'

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_STATUS_OPTIONS: { value: DbHouseProject['status']; label: string; color: string }[] = [
  { value: 'idea',        label: 'Idea',        color: '#6b7280' },
  { value: 'planned',     label: 'Planned',     color: '#60a5fa' },
  { value: 'in_progress', label: 'In Progress', color: '#00d4ff' },
  { value: 'on_hold',     label: 'On Hold',     color: '#f59e0b' },
  { value: 'done',        label: 'Done',        color: '#10b981' },
  { value: 'cancelled',   label: 'Cancelled',   color: '#ef4444' },
]

const PRIORITY_OPTIONS: { value: DbHouseProject['priority']; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: '#6b7280' },
  { value: 'medium', label: 'Medium', color: '#60a5fa' },
  { value: 'high',   label: 'High',   color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
]

const ORDER_STATUS_OPTIONS = ['need_to_buy','ordered','shipped','delivered','installed','returned'] as const
const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  need_to_buy: { label: 'Need to Buy', color: '#6b7280' },
  ordered:     { label: 'Ordered',     color: '#60a5fa' },
  shipped:     { label: 'Shipped',     color: '#f59e0b' },
  delivered:   { label: 'Delivered',   color: '#a78bfa' },
  installed:   { label: 'Installed',   color: '#10b981' },
  returned:    { label: 'Returned',    color: '#ef4444' },
}

const PAYMENT_TYPES = ['materials','labor','permit','delivery','tax','deposit','final_payment','other'] as const

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  project: DbHouseProject
  initialMaterials: DbHouseMaterial[]
  initialMilestones: DbHouseProjectMilestone[]
  initialPayments: DbHousePayment[]
  contractors: Pick<DbHouseContractor, 'id' | 'name' | 'company' | 'trade' | 'phone' | 'email'>[]
}

type Tab = 'overview' | 'materials' | 'budget' | 'timeline'

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({ project, contractors, onUpdate }: {
  project: DbHouseProject
  contractors: Props['contractors']
  onUpdate: (patch: Partial<DbHouseProject>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...project })

  async function save() {
    const patch = {
      title: form.title, description: form.description, status: form.status,
      priority: form.priority, start_date: form.start_date, target_date: form.target_date,
      estimated_budget: form.estimated_budget, primary_contractor_id: form.primary_contractor_id,
      notes: form.notes,
    }
    await fetch(`/api/house/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    onUpdate(patch)
    setEditing(false)
  }

  const sc = ALL_STATUS_OPTIONS.find(s => s.value === project.status)
  const pc = PRIORITY_OPTIONS.find(p => p.value === project.priority)
  const contractor = contractors.find(c => c.id === project.primary_contractor_id)

  if (editing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="label-sm">Title</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input-field text-sm" />
        </div>
        <div>
          <label className="label-sm">Description</label>
          <textarea rows={4} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="input-field text-sm resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-sm">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DbHouseProject['status'] }))}
              className="input-field text-xs">
              {ALL_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value} style={{ background: '#0a0e27' }}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm">Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as DbHouseProject['priority'] }))}
              className="input-field text-xs">
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value} style={{ background: '#0a0e27' }}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm">Start Date</label>
            <input type="date" value={form.start_date ?? ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value || null }))}
              className="input-field text-xs" />
          </div>
          <div>
            <label className="label-sm">Target Date</label>
            <input type="date" value={form.target_date ?? ''} onChange={e => setForm(f => ({ ...f, target_date: e.target.value || null }))}
              className="input-field text-xs" />
          </div>
          <div>
            <label className="label-sm">Budget ($)</label>
            <input type="number" value={form.estimated_budget} onChange={e => setForm(f => ({ ...f, estimated_budget: parseFloat(e.target.value) || 0 }))}
              className="input-field text-xs" />
          </div>
          <div>
            <label className="label-sm">Contractor</label>
            <select value={form.primary_contractor_id ?? ''} onChange={e => setForm(f => ({ ...f, primary_contractor_id: e.target.value || null }))}
              className="input-field text-xs">
              <option value="" style={{ background: '#0a0e27' }}>None</option>
              {contractors.map(c => <option key={c.id} value={c.id} style={{ background: '#0a0e27' }}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label-sm">Notes</label>
          <textarea rows={3} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Running notes / journal entries…"
            className="input-field text-sm resize-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={() => setEditing(false)}
            className="flex-1 py-2.5 rounded-xl text-sm border border-white/12 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer transition-all">Cancel</button>
          <button onClick={save}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: 'var(--accent-gradient)', color: '#050505' }}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {sc && <span className="badge" style={{ background: `${sc.color}20`, color: sc.color }}>{sc.label}</span>}
          {pc && <span className="badge" style={{ background: `${pc.color}20`, color: pc.color }}>{pc.label}</span>}
        </div>
        <button onClick={() => setEditing(true)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-cyan)] cursor-pointer transition-colors">Edit</button>
      </div>

      {project.description && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{project.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-cell">
          <p className="label-sm">Start Date</p>
          <p className="text-sm text-[var(--text-primary)]">{fmtDate(project.start_date)}</p>
        </div>
        <div className="glass-cell">
          <p className="label-sm">Target Date</p>
          <p className="text-sm text-[var(--text-primary)]">{fmtDate(project.target_date)}</p>
        </div>
        <div className="glass-cell">
          <p className="label-sm">Budget</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{fmt(project.estimated_budget)}</p>
        </div>
        <div className="glass-cell">
          <p className="label-sm">Spent</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{fmt(project.actual_cost)}</p>
        </div>
      </div>

      {contractor && (
        <div className="glass-cell">
          <p className="label-sm">Primary Contractor</p>
          <p className="text-sm text-[var(--text-primary)]">{contractor.name}
            {contractor.company && <span className="text-[var(--text-muted)]"> · {contractor.company}</span>}
          </p>
          {contractor.phone && <p className="text-xs text-[var(--text-muted)] mt-0.5">{contractor.phone}</p>}
        </div>
      )}

      {project.notes && (
        <div className="glass-cell">
          <p className="label-sm">Notes</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Materials Tab ──────────────────────────────────────────────────────────

function MaterialsTab({ projectId, initialMaterials }: {
  projectId: string
  initialMaterials: DbHouseMaterial[]
}) {
  const [materials, setMaterials] = useState<DbHouseMaterial[]>(initialMaterials)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '1', unit: 'each', unit_cost: '', vendor: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const total = materials.reduce((s, m) => s + m.total_cost, 0)

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/house/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId, name: form.name,
        quantity: parseFloat(form.quantity) || 1,
        unit: form.unit || 'each',
        unit_cost: parseFloat(form.unit_cost) || 0,
        vendor: form.vendor || null,
        notes: form.notes || null,
      }),
    })
    const data = await res.json() as DbHouseMaterial
    setMaterials(prev => [...prev, data])
    setForm({ name: '', quantity: '1', unit: 'each', unit_cost: '', vendor: '', notes: '' })
    setSaving(false)
    setShowForm(false)
  }

  async function cycleStatus(m: DbHouseMaterial) {
    const idx = ORDER_STATUS_OPTIONS.indexOf(m.order_status)
    const next = ORDER_STATUS_OPTIONS[(idx + 1) % ORDER_STATUS_OPTIONS.length]
    setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, order_status: next } : x))
    await fetch(`/api/house/materials/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_status: next }),
    })
  }

  async function deleteMaterial(id: string) {
    setDeletingId(id)
    await fetch(`/api/house/materials/${id}`, { method: 'DELETE' })
    setMaterials(prev => prev.filter(m => m.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Header with total */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {materials.length} item{materials.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Total: {fmt(total)}</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all"
          style={{ background: 'var(--accent-gradient)', color: '#050505', fontWeight: 600 }}>
          + Add Item
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addMaterial} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <input required placeholder="Material name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input-field text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" min="0" placeholder="Qty" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              className="input-field text-xs" />
            <input placeholder="Unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="input-field text-xs" />
            <input type="number" min="0" step="0.01" placeholder="Unit cost $" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))}
              className="input-field text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Vendor / store" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              className="input-field text-xs" />
            <input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field text-xs" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg text-xs border border-white/12 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Materials list */}
      {materials.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)] text-sm">No materials yet</div>
      ) : (
        <div className="space-y-2">
          {materials.map(m => {
            const sc = ORDER_STATUS_LABELS[m.order_status]
            return (
              <div key={m.id}
                className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-xl px-4 py-3 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.name}</p>
                    {m.vendor && <span className="text-[10px] text-[var(--text-muted)] truncate">@{m.vendor}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--text-muted)]">{m.quantity} {m.unit}</span>
                    {m.unit_cost > 0 && <span className="text-[10px] text-[var(--text-muted)]">@ {fmt(m.unit_cost)}</span>}
                    {m.notes && <span className="text-[10px] text-[var(--text-muted)] truncate">{m.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.total_cost > 0 && (
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{fmt(m.total_cost)}</span>
                  )}
                  <button onClick={() => cycleStatus(m)}
                    className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-all"
                    style={{ background: `${sc.color}20`, color: sc.color }}>
                    {sc.label}
                  </button>
                  <button onClick={() => deleteMaterial(m.id)} disabled={deletingId === m.id}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all cursor-pointer text-xs">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Budget Tab ─────────────────────────────────────────────────────────────

function BudgetTab({ project, initialPayments }: {
  project: DbHouseProject
  initialPayments: DbHousePayment[]
}) {
  const [payments, setPayments] = useState<DbHousePayment[]>(initialPayments)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', payee: '', payment_type: 'other' as DbHousePayment['payment_type'], payment_method: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const totalPayments = payments.reduce((s, p) => s + p.amount, 0)
  const budget         = project.estimated_budget
  const budgetPct      = budget > 0 ? Math.min(100, (totalPayments / budget) * 100) : 0

  async function addPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount) return
    setSaving(true)
    const res = await fetch('/api/house/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project.id,
        amount: parseFloat(form.amount),
        payee: form.payee || null,
        payment_type: form.payment_type,
        payment_method: form.payment_method || null,
        notes: form.notes || null,
        payment_date: new Date().toLocaleDateString('en-CA'),
      }),
    })
    const data = await res.json() as DbHousePayment
    setPayments(prev => [data, ...prev])
    setForm({ amount: '', payee: '', payment_type: 'other', payment_method: '', notes: '' })
    setSaving(false)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      {/* Budget vs actual bar */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Budget vs Spent</p>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">{fmt(totalPayments)}</p>
            <p className="text-xs text-[var(--text-muted)]">of {fmt(budget)} budgeted</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${budgetPct >= 100 ? 'text-red-400' : budgetPct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {Math.round(budgetPct)}%
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {budget > totalPayments ? `${fmt(budget - totalPayments)} remaining` : `${fmt(totalPayments - budget)} over budget`}
            </p>
          </div>
        </div>
        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${budgetPct}%`,
              background: budgetPct >= 100 ? '#ef4444' : budgetPct >= 80 ? '#f59e0b' : 'var(--accent-gradient)',
            }} />
        </div>
      </div>

      {/* Add payment */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{payments.length} payments</p>
        <button onClick={() => setShowForm(s => !s)}
          className="text-xs px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
          style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
          + Add Payment
        </button>
      </div>

      {showForm && (
        <form onSubmit={addPayment} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input required type="number" min="0" step="0.01" placeholder="Amount $" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="input-field text-sm col-span-2" />
            <input placeholder="Payee (contractor / store)" value={form.payee}
              onChange={e => setForm(f => ({ ...f, payee: e.target.value }))}
              className="input-field text-xs" />
            <select value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value as DbHousePayment['payment_type'] }))}
              className="input-field text-xs">
              {PAYMENT_TYPES.map(t => <option key={t} value={t} style={{ background: '#0a0e27' }}>{t.replace('_', ' ')}</option>)}
            </select>
            <input placeholder="Payment method" value={form.payment_method}
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="input-field text-xs" />
            <input placeholder="Notes" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field text-xs" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg text-xs border border-white/12 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving || !form.amount}
              className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
              {saving ? 'Adding…' : 'Add Payment'}
            </button>
          </div>
        </form>
      )}

      {/* Payments list */}
      {payments.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)] text-sm">No payments yet</div>
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{fmt(p.amount)}</p>
                  {p.payee && <span className="text-xs text-[var(--text-muted)] truncate">→ {p.payee}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[var(--text-muted)]">{p.payment_type.replace('_', ' ')}</span>
                  {p.payment_method && <span className="text-[10px] text-[var(--text-muted)]">· {p.payment_method}</span>}
                  {p.notes && <span className="text-[10px] text-[var(--text-muted)] truncate">· {p.notes}</span>}
                </div>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                {new Date(p.payment_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Timeline Tab ───────────────────────────────────────────────────────────

function TimelineTab({ projectId, initialMilestones }: {
  projectId: string
  initialMilestones: DbHouseProjectMilestone[]
}) {
  const [milestones, setMilestones] = useState<DbHouseProjectMilestone[]>(initialMilestones)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [adding, setAdding] = useState(false)

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await fetch('/api/house/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, title: newTitle, target_date: newDate || null, status: 'pending', sort_order: milestones.length }),
    })
    const data = await res.json() as DbHouseProjectMilestone
    setMilestones(prev => [...prev, data])
    setNewTitle('')
    setNewDate('')
    setAdding(false)
  }

  async function toggleMilestone(m: DbHouseProjectMilestone) {
    const next: DbHouseProjectMilestone['status'] = m.status === 'complete' ? 'pending' : 'complete'
    const completedDate = next === 'complete' ? new Date().toLocaleDateString('en-CA') : null
    setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, status: next, completed_date: completedDate } : x))
    await fetch(`/api/house/milestones/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, completed_date: completedDate }),
    })
  }

  async function deleteMilestone(id: string) {
    setMilestones(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/house/milestones/${id}`, { method: 'DELETE' })
  }

  const done    = milestones.filter(m => m.status === 'complete').length
  const total   = milestones.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {done}/{total} milestones complete
          </p>
          {total > 0 && (
            <div className="w-32 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Add milestone */}
      <form onSubmit={addMilestone} className="flex gap-2">
        <input placeholder="Add milestone…" value={newTitle} onChange={e => setNewTitle(e.target.value)}
          className="flex-1 input-field text-sm" />
        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
          className="input-field text-xs w-36" />
        <button type="submit" disabled={adding || !newTitle.trim()}
          className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 shrink-0"
          style={{ background: 'var(--accent-gradient)', color: '#050505' }}>Add</button>
      </form>

      {/* Milestones list */}
      <div className="space-y-2">
        {milestones.map(m => (
          <div key={m.id} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-xl px-4 py-3 group">
            <button onClick={() => toggleMilestone(m)}
              className={`w-5 h-5 rounded-full shrink-0 border-2 flex items-center justify-center cursor-pointer transition-all ${
                m.status === 'complete' ? 'border-emerald-400 bg-emerald-500/20' : 'border-white/20 hover:border-cyan-400'
              }`}>
              {m.status === 'complete' && <span className="text-emerald-400 text-[10px] font-bold">✓</span>}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${m.status === 'complete' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                {m.title}
              </p>
              {m.target_date && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Target: {fmtDate(m.target_date)}</p>
              )}
            </div>
            {m.completed_date && (
              <span className="text-[10px] text-emerald-400 shrink-0">Done {fmtDate(m.completed_date)}</span>
            )}
            <button onClick={() => deleteMilestone(m.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all cursor-pointer text-xs">✕</button>
          </div>
        ))}
        {milestones.length === 0 && (
          <p className="text-center py-8 text-[var(--text-muted)] text-sm">No milestones yet</p>
        )}
      </div>
    </div>
  )
}

// ── Main ProjectDetail ─────────────────────────────────────────────────────

export default function ProjectDetail({
  project: initialProject, initialMaterials, initialMilestones, initialPayments, contractors,
}: Props) {
  const router = useRouter()
  const [project, setProject] = useState<DbHouseProject>(initialProject)
  const [tab, setTab]         = useState<Tab>('overview')
  const [deleting, setDeleting] = useState(false)

  const budgetPct = project.estimated_budget > 0
    ? Math.min(100, Math.round((project.actual_cost / project.estimated_budget) * 100))
    : 0
  const sc = ALL_STATUS_OPTIONS.find(s => s.value === project.status)

  const handleUpdate = useCallback((patch: Partial<DbHouseProject>) => {
    setProject(prev => ({ ...prev, ...patch }))
  }, [])

  async function handleDelete() {
    if (!confirm('Delete this project? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/house/projects/${project.id}`, { method: 'DELETE' })
    router.push('/house/projects')
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview',   label: 'Overview',  icon: '📋' },
    { key: 'materials',  label: 'Materials', icon: '🛒' },
    { key: 'budget',     label: 'Budget',    icon: '💰' },
    { key: 'timeline',   label: 'Timeline',  icon: '📅' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 space-y-3"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <a href="/house" className="hover:text-[var(--accent-cyan)] cursor-pointer transition-colors">House</a>
          <span>/</span>
          <a href="/house/projects" className="hover:text-[var(--accent-cyan)] cursor-pointer transition-colors">Projects</a>
          <span>/</span>
          <span className="text-[var(--text-secondary)] truncate max-w-48">{project.title}</span>
        </div>

        {/* Title + status */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">{project.title}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{project.room}</p>
          </div>
          {sc && (
            <span className="badge shrink-0 mt-0.5" style={{ background: `${sc.color}20`, color: sc.color }}>{sc.label}</span>
          )}
        </div>

        {/* Budget bar */}
        {project.estimated_budget > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
              <span>{project.status !== 'idea' ? `${fmt(project.actual_cost)} spent` : 'No spend yet'}</span>
              <span>{fmt(project.estimated_budget)} budget · {budgetPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${budgetPct}%`,
                  background: budgetPct >= 100 ? '#ef4444' : budgetPct >= 80 ? '#f59e0b' : 'var(--accent-gradient)',
                }} />
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 -mb-4 pb-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium cursor-pointer rounded-t-lg border-b-2 transition-all ${
                tab === t.key
                  ? 'text-[var(--accent-cyan)] border-[var(--accent-cyan)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
          <button onClick={handleDelete} disabled={deleting}
            className="ml-auto text-[10px] text-[var(--text-muted)] hover:text-red-400 cursor-pointer transition-colors self-center px-2 disabled:opacity-50">
            {deleting ? 'Deleting…' : '🗑 Delete'}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'overview'  && <OverviewTab  project={project} contractors={contractors} onUpdate={handleUpdate} />}
        {tab === 'materials' && <MaterialsTab projectId={project.id} initialMaterials={initialMaterials} />}
        {tab === 'budget'    && <BudgetTab    project={project} initialPayments={initialPayments} />}
        {tab === 'timeline'  && <TimelineTab  projectId={project.id} initialMilestones={initialMilestones} />}
      </div>

      {/* Global CSS helpers scoped via JSX — injected inline */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 13px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus { border-color: rgba(0,212,255,0.5); }
        .input-field::placeholder { color: var(--text-muted); }
        .label-sm {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 4px;
          font-weight: 600;
        }
        .glass-cell {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}

