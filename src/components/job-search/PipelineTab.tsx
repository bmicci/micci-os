'use client'

import { useState } from 'react'
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

interface Props {
  data: JobSearchData
  setData: React.Dispatch<React.SetStateAction<JobSearchData>>
}

const emptyItem: {
  company: string
  role: string
  status: 'active' | 'waiting' | 'rejected' | 'offer' | 'closed'
  stage: string
  contact: string
  last_action: string
  next_step: string
  priority: 'high' | 'medium' | 'low'
  notes: string
} = {
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
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyItem)

  const addItem = async () => {
    if (!form.company) return
    const newItem: DbJobPipeline = {
      id: crypto.randomUUID(),
      company: form.company,
      role: form.role,
      status: form.status,
      stage: form.stage,
      contact: form.contact || null,
      last_action: form.last_action || null,
      next_step: form.next_step || null,
      priority: form.priority,
      notes: form.notes || null,
      sort_order: data.pipeline.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setData((s) => ({ ...s, pipeline: [...s.pipeline, newItem] }))
    setForm(emptyItem)
    setShowAdd(false)

    try {
      const supabase = createClient()
      const { id: _id, created_at: _ca, updated_at: _ua, ...insert } = newItem
      await supabase.from('job_pipeline').insert(insert)
    } catch {
      // Supabase may not have table yet — local state still works
    }
  }

  const updateStatus = async (id: string, status: string) => {
    setData((s) => ({
      ...s,
      pipeline: s.pipeline.map((p) =>
        p.id === id ? { ...p, status: status as DbJobPipeline['status'] } : p
      ),
    }))
    try {
      const supabase = createClient()
      await supabase.from('job_pipeline').update({ status }).eq('id', id)
    } catch {}
  }

  const activeCount = data.pipeline.filter(
    (p) => p.status === 'active' || p.status === 'waiting'
  ).length

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
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-lg text-[11px] font-semibold tracking-wide uppercase"
          style={{
            background: 'var(--accent-gradient)',
            color: '#050505',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + Add Opportunity
        </button>
      </div>

      {showAdd && (
        <div
          className="glass-card p-5 mb-4"
          style={{ borderColor: 'var(--accent-cyan)' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input style={inputStyle} placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <input style={inputStyle} placeholder="Role / Title" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <input style={inputStyle} placeholder="Stage (e.g., Applied, Phone Screen)" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} />
            <input style={inputStyle} placeholder="Contact name" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <input style={inputStyle} placeholder="Next step" value={form.next_step} onChange={(e) => setForm({ ...form, next_step: e.target.value })} />
            <select style={selectStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as 'high' | 'medium' | 'low' })}>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
          <textarea
            style={{ ...inputStyle, height: 50, resize: 'vertical' }}
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={addItem}
              className="px-4 py-2 rounded-lg text-[11px] font-semibold uppercase"
              style={{ background: 'var(--accent-cyan)', color: '#050505', border: 'none', cursor: 'pointer' }}
            >
              Save
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg text-[11px] font-semibold uppercase"
              style={{ background: 'transparent', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {data.pipeline.map((p) => (
        <div
          key={p.id}
          className="glass-card p-5 mb-3"
          style={{ borderLeft: `3px solid ${PRIORITY_COLORS[p.priority]}` }}
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
