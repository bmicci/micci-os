'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { JobSearchData } from '@/lib/job-search-data'
import type { DbJobPipeline } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  waiting: '#f59e0b',
  rejected: '#ef4444',
  offer: '#a855f7',
  closed: 'var(--text-muted)',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: 'var(--text-muted)',
}

// Sort: live conversations first (by priority), closed history last
const STATUS_ORDER: Record<string, number> = { offer: 0, active: 1, waiting: 2, rejected: 3, closed: 4 }
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

interface Props {
  data: JobSearchData
  setData: React.Dispatch<React.SetStateAction<JobSearchData>>
}

type FormShape = {
  company: string
  role: string
  status: 'active' | 'waiting' | 'rejected' | 'offer' | 'closed'
  stage: string
  contact: string
  last_action: string
  next_step: string
  priority: 'high' | 'medium' | 'low'
  notes: string
}

const emptyItem: FormShape = {
  company: '',
  role: '',
  status: 'active',
  stage: '',
  contact: '',
  last_action: '',
  next_step: '',
  priority: 'medium',
  notes: '',
}

export default function PipelineTab({ data, setData }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyItem)
  const [error, setError] = useState<string | null>(null)

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyItem)
    setShowForm(true)
    setError(null)
  }

  const openEdit = (p: DbJobPipeline) => {
    setEditingId(p.id)
    setForm({
      company: p.company,
      role: p.role,
      status: p.status,
      stage: p.stage ?? '',
      contact: p.contact ?? '',
      last_action: p.last_action ?? '',
      next_step: p.next_step ?? '',
      priority: p.priority,
      notes: p.notes ?? '',
    })
    setShowForm(true)
    setError(null)
  }

  const toRow = () => ({
    company: form.company,
    role: form.role,
    status: form.status,
    stage: form.stage,
    contact: form.contact || null,
    last_action: form.last_action || null,
    next_step: form.next_step || null,
    priority: form.priority,
    notes: form.notes || null,
    updated_at: new Date().toISOString(),
  })

  const save = async () => {
    if (!form.company) return
    const supabase = createClient()
    setError(null)

    if (editingId) {
      const row = toRow()
      const { error: err } = await supabase.from('job_pipeline').update(row).eq('id', editingId)
      if (err) { setError(`Save failed: ${err.message}`); return }
      setData((s) => ({
        ...s,
        pipeline: s.pipeline.map((p) => (p.id === editingId ? { ...p, ...row } : p)),
      }))
    } else {
      const insert = { ...toRow(), sort_order: data.pipeline.length }
      const { data: created, error: err } = await supabase
        .from('job_pipeline').insert(insert).select().single()
      if (err) { setError(`Save failed: ${err.message}`); return }
      setData((s) => ({ ...s, pipeline: [...s.pipeline, created as DbJobPipeline] }))
    }
    setForm(emptyItem)
    setEditingId(null)
    setShowForm(false)
  }

  const updateStatus = async (id: string, status: string) => {
    setData((s) => ({
      ...s,
      pipeline: s.pipeline.map((p) =>
        p.id === id ? { ...p, status: status as DbJobPipeline['status'] } : p
      ),
    }))
    const supabase = createClient()
    await supabase.from('job_pipeline')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const deleteItem = async (p: DbJobPipeline) => {
    if (!window.confirm(`Delete ${p.company} — ${p.role}? (Consider "closed" instead to keep the history.)`)) return
    setData((s) => ({ ...s, pipeline: s.pipeline.filter((x) => x.id !== p.id) }))
    const supabase = createClient()
    await supabase.from('job_pipeline').delete().eq('id', p.id)
  }

  const activeCount = data.pipeline.filter(
    (p) => p.status === 'active' || p.status === 'waiting'
  ).length

  const sorted = [...data.pipeline].sort((a, b) => {
    const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    if (so !== 0) return so
    return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
  })

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(0,212,255,0.15)',
    borderRadius: 6,
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: 12,
    width: '100%',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    width: 'auto',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {data.pipeline.length} total · {activeCount} active
        </div>
        <button onClick={openAdd} className="btn btn-primary btn-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          + Add Opportunity
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-5 mb-4" style={{ borderColor: 'var(--accent-cyan)' }}>
          <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>
            {editingId ? 'Edit opportunity' : 'New opportunity'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input style={inputStyle} placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <input style={inputStyle} placeholder="Role / Title" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <input style={inputStyle} placeholder="Stage (e.g., Applied, Phone Screen)" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} />
            <input style={inputStyle} placeholder="Contact name" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <input style={inputStyle} placeholder="Last action taken" value={form.last_action} onChange={(e) => setForm({ ...form, last_action: e.target.value })} />
            <input style={inputStyle} placeholder="Next step" value={form.next_step} onChange={(e) => setForm({ ...form, next_step: e.target.value })} />
            <select style={selectStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as FormShape['priority'] })}>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <select style={selectStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormShape['status'] })}>
              <option value="active">Active</option>
              <option value="waiting">Waiting</option>
              <option value="offer">Offer!</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <textarea
            style={{ ...inputStyle, height: 50, resize: 'vertical' }}
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {error && (
            <div className="text-[11px] mt-2" style={{ color: '#ef4444' }}>{error}</div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="btn btn-primary btn-sm" style={{ textTransform: 'uppercase' }}>
              {editingId ? 'Save changes' : 'Save'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn btn-ghost btn-sm" style={{ textTransform: 'uppercase' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <div className="glass-card p-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          Pipeline is empty — add your first opportunity above.
        </div>
      )}

      {sorted.map((p) => (
        <div
          key={p.id}
          className="glass-card p-5 mb-3"
          style={{
            borderLeft: `3px solid ${PRIORITY_COLORS[p.priority]}`,
            opacity: p.status === 'closed' || p.status === 'rejected' ? 0.6 : 1,
          }}
        >
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <div className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {p.company}
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {p.role}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span
                className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
                style={{
                  background: (STATUS_COLORS[p.status] || 'var(--text-muted)') + '22',
                  color: STATUS_COLORS[p.status] || 'var(--text-muted)',
                  border: `1px solid ${STATUS_COLORS[p.status] || 'var(--text-muted)'}44`,
                }}
              >
                {p.status}
              </span>
              <select
                style={{ ...selectStyle, padding: '4px 8px', fontSize: 10 }}
                value={p.status}
                onChange={(e) => updateStatus(p.id, e.target.value)}
              >
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="offer">Offer!</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
              <button onClick={() => openEdit(p)} title="Edit"
                className="p-1.5 rounded-md transition-colors hover:bg-white/[0.08]"
                style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer' }}>
                <Pencil size={13} strokeWidth={2} />
              </button>
              <button onClick={() => deleteItem(p)} title="Delete"
                className="p-1.5 rounded-md transition-colors hover:bg-red-500/15"
                style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer' }}>
                <Trash2 size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-[11px]">
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Stage: </span>
              <span style={{ color: 'var(--text-primary)' }}>{p.stage}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Contact: </span>
              <span style={{ color: 'var(--text-primary)' }}>{p.contact || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Last Action: </span>
              <span style={{ color: 'var(--text-primary)' }}>{p.last_action || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Next Step: </span>
              <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                {p.next_step || '—'}
              </span>
            </div>
          </div>
          {p.notes && (
            <div className="text-[11px] mt-2 italic" style={{ color: 'var(--text-muted)' }}>
              {p.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
