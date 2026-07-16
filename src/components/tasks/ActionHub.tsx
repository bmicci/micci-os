'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { ActionItem } from '@/lib/financial-data'

// ── Unified Action Hub ──────────────────────────────────────────────────────
// One list for everything — backed by the same action_items table the
// Financial Overview rail and dashboard Today feed read. Groups derive from
// today's date (rule: time never freezes); no hardcoded deadline lists.

export type Category =
  | 'finance' | 'heloc' | 'tax' | 'legal'
  | 'job_search' | 'health' | 'personal' | 'career'

const CATEGORY_CONFIG: Record<Category, { label: string; color: string }> = {
  finance:    { label: 'Finance',    color: '#fbbf24' },
  heloc:      { label: 'HELOC',      color: '#00d4ff' },
  tax:        { label: 'Tax',        color: '#4ade80' },
  legal:      { label: 'Legal',      color: '#f87171' },
  job_search: { label: 'Job Search', color: '#60a5fa' },
  health:     { label: 'Health',     color: '#34d399' },
  personal:   { label: 'Personal',   color: '#a78bfa' },
  career:     { label: 'Career',     color: '#f472b6' },
}
const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG) as Category[]

const PRIORITY_CONFIG = {
  red:   { label: 'Critical', color: '#ef4444' },
  amber: { label: 'Normal',   color: '#f59e0b' },
  blue:  { label: 'Low',      color: '#3b82f6' },
} as const
type Priority = keyof typeof PRIORITY_CONFIG

function daysUntil(dateStr: string): number {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T00:00:00' : dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// ── Legacy localStorage import (old Tasks page stored tasks in-browser) ─────

interface LegacyTask {
  id: string
  title: string
  category?: string
  status?: string
  scheduledDate?: string
  dueDate?: string
  priority?: string
  notes?: string
}

const LEGACY_KEY = 'micci-os-tasks'

function legacyPriority(p?: string): Priority {
  if (p === 'critical' || p === 'high') return 'red'
  if (p === 'low') return 'blue'
  return 'amber'
}

// ── Form state ──────────────────────────────────────────────────────────────

interface Draft {
  title: string
  detail: string
  category: Category
  priority: Priority
  due_date: string
  amount: string
}

const EMPTY_DRAFT: Draft = { title: '', detail: '', category: 'personal', priority: 'amber', due_date: '', amount: '' }

// ── Component ───────────────────────────────────────────────────────────────

export default function ActionHub({ initialItems }: { initialItems: ActionItem[] }) {
  const [items, setItems] = useState<ActionItem[]>(initialItems)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [showDone, setShowDone] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [legacy, setLegacy] = useState<LegacyTask[]>([])
  const [importing, setImporting] = useState(false)

  // Detect stranded tasks from the old localStorage-based Tasks page
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEGACY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as LegacyTask[]
      if (Array.isArray(parsed) && parsed.length > 0) setLegacy(parsed)
    } catch { /* ignore */ }
  }, [])

  // "Create task" handoff from the Goals page — prefill the add form
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('micci-os-pending-task')
      if (!raw) return
      sessionStorage.removeItem('micci-os-pending-task')
      const pending = JSON.parse(raw) as { title?: string; category?: string; priority?: string }
      if (!pending.title) return
      setDraft({
        ...EMPTY_DRAFT,
        title: pending.title,
        category: CATEGORY_KEYS.includes(pending.category as Category) ? (pending.category as Category) : 'personal',
        priority: legacyPriority(pending.priority),
      })
      setEditingId(null)
      setFormOpen(true)
    } catch { /* ignore */ }
  }, [])

  async function importLegacy() {
    setImporting(true)
    try {
      const imported: ActionItem[] = []
      for (const t of legacy) {
        if (!t.title?.trim()) continue
        const res = await fetch('/api/finance/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: t.title.trim(),
            detail: t.notes ?? '',
            category: CATEGORY_KEYS.includes(t.category as Category) ? t.category : 'personal',
            priority: legacyPriority(t.priority),
            due_date: t.dueDate || t.scheduledDate || null,
          }),
        })
        const json = await res.json()
        if (json.item) {
          imported.push(mapRow(json.item))
          if (t.status === 'completed') {
            await fetch('/api/finance/actions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: json.item.id, status: 'done' }),
            })
            imported[imported.length - 1] = { ...imported[imported.length - 1], status: 'done', completedAt: new Date().toISOString() }
          }
        }
      }
      setItems(prev => [...prev, ...imported])
      localStorage.removeItem(LEGACY_KEY)
      setLegacy([])
    } finally {
      setImporting(false)
    }
  }

  function dismissLegacy() {
    localStorage.removeItem(LEGACY_KEY)
    setLegacy([])
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  function mapRow(r: any): ActionItem {
    return {
      id: r.id,
      title: r.title,
      detail: r.detail ?? '',
      priority: (r.priority ?? 'amber') as ActionItem['priority'],
      dueDate: r.due_date ?? null,
      amount: r.amount != null ? Number(r.amount) : null,
      status: (r.status ?? 'active') as ActionItem['status'],
      completedAt: r.completed_at ?? null,
      category: (r.category ?? 'personal') as string,
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function openAdd() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(item: ActionItem) {
    setDraft({
      title: item.title,
      detail: item.detail ?? '',
      category: (CATEGORY_KEYS.includes(item.category as Category) ? item.category : 'finance') as Category,
      priority: item.priority,
      due_date: item.dueDate ?? '',
      amount: item.amount != null ? String(item.amount) : '',
    })
    setEditingId(item.id ?? null)
    setError(null)
    setFormOpen(true)
  }

  async function save() {
    if (!draft.title.trim()) { setError('Title is required'); return }
    const amount = draft.amount.trim() === '' ? null : Number(draft.amount.replace(/[$,]/g, ''))
    if (amount !== null && !Number.isFinite(amount)) { setError('Amount must be a number'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: draft.title,
        detail: draft.detail,
        category: draft.category,
        priority: draft.priority,
        due_date: draft.due_date || null,
        amount,
      }
      const res = await fetch('/api/finance/actions', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      const mapped = mapRow(json.item)
      setItems(prev => editingId ? prev.map(i => i.id === editingId ? mapped : i) : [...prev, mapped])
      setFormOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(item: ActionItem, status: 'active' | 'done') {
    if (!item.id) return
    const prev = items
    setItems(p => p.map(i => i.id === item.id
      ? { ...i, status, completedAt: status === 'done' ? new Date().toISOString() : null }
      : i))
    try {
      const res = await fetch('/api/finance/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItems(prev)
    }
  }

  async function remove(item: ActionItem) {
    if (!item.id) return
    if (!window.confirm(`Delete "${item.title}"? (Checking it off keeps the history instead.)`)) return
    const prev = items
    setItems(p => p.filter(i => i.id !== item.id))
    try {
      const res = await fetch('/api/finance/actions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setItems(prev)
    }
  }

  // ── Derived groups ────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => items.filter(i => filter === 'all' || (i.category ?? 'finance') === filter),
    [items, filter],
  )

  const active = filtered.filter(i => (i.status ?? 'active') === 'active')
  const done = filtered
    .filter(i => i.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  const byDue = (a: ActionItem, b: ActionItem) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
  const prioOrder = { red: 0, amber: 1, blue: 2 }

  const groups: { title: string; accent: string; items: ActionItem[] }[] = [
    {
      title: 'Overdue',
      accent: '#ef4444',
      items: active.filter(i => i.dueDate && daysUntil(i.dueDate) < 0).sort(byDue),
    },
    {
      title: 'Next 7 days',
      accent: '#f59e0b',
      items: active.filter(i => i.dueDate && daysUntil(i.dueDate) >= 0 && daysUntil(i.dueDate) <= 7).sort(byDue),
    },
    {
      title: 'Next 30 days',
      accent: 'var(--accent-cyan)',
      items: active.filter(i => i.dueDate && daysUntil(i.dueDate) > 7 && daysUntil(i.dueDate) <= 30).sort(byDue),
    },
    {
      title: 'Later',
      accent: '#818cf8',
      items: active.filter(i => i.dueDate && daysUntil(i.dueDate) > 30).sort(byDue),
    },
    {
      title: 'No date',
      accent: 'var(--text-muted)',
      items: active
        .filter(i => !i.dueDate)
        .sort((a, b) => prioOrder[a.priority] - prioOrder[b.priority]),
    },
  ]

  const overdueCount = groups[0].items.length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[900px] mx-auto w-full space-y-5">

      {/* Legacy import banner */}
      {legacy.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
          style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)' }}>
          <span className="text-[12px] flex-1 min-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
            Found <b>{legacy.length}</b> task{legacy.length === 1 ? '' : 's'} from the old Tasks page (saved in this
            browser). Import them into the unified list?
          </span>
          <button onClick={importLegacy} disabled={importing} className="btn btn-primary btn-sm">
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button onClick={dismissLegacy} disabled={importing} className="btn btn-ghost btn-sm">
            Discard
          </button>
        </div>
      )}

      {/* Stats + add */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-5">
          <div>
            <div className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{active.length}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Open</div>
          </div>
          <div>
            <div className="text-xl font-extrabold" style={{ color: overdueCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
              {overdueCount}
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Overdue</div>
          </div>
          <div>
            <div className="text-xl font-extrabold" style={{ color: '#22c55e' }}>{done.length}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Done</div>
          </div>
        </div>
        <button onClick={openAdd} className="btn btn-primary ml-auto">
          <Plus size={14} className="inline -mt-0.5 mr-1" />Add action
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <FilterPill label="All" active={filter === 'all'} color="#00d4ff" onClick={() => setFilter('all')} />
        {CATEGORY_KEYS.map(c => (
          <FilterPill key={c} label={CATEGORY_CONFIG[c].label} active={filter === c}
            color={CATEGORY_CONFIG[c].color} onClick={() => setFilter(c)} />
        ))}
      </div>

      {/* Add / edit form */}
      {formOpen && (
        <div className="glass-card p-4 space-y-3">
          <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {editingId ? 'Edit action' : 'New action'}
          </div>
          <input
            autoFocus
            type="text"
            placeholder="What needs doing?"
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}
          />
          <input
            type="text"
            placeholder="Detail (optional)"
            value={draft.detail}
            onChange={e => setDraft(d => ({ ...d, detail: e.target.value }))}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={draft.category}
              onChange={e => setDraft(d => ({ ...d, category: e.target.value as Category }))}
              className="rounded-lg px-2 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}>
              {CATEGORY_KEYS.map(c => (
                <option key={c} value={c} style={{ background: '#0a0e27' }}>{CATEGORY_CONFIG[c].label}</option>
              ))}
            </select>
            <select value={draft.priority}
              onChange={e => setDraft(d => ({ ...d, priority: e.target.value as Priority }))}
              className="rounded-lg px-2 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}>
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => (
                <option key={p} value={p} style={{ background: '#0a0e27' }}>{PRIORITY_CONFIG[p].label}</option>
              ))}
            </select>
            <input
              type="date"
              value={draft.due_date}
              onChange={e => setDraft(d => ({ ...d, due_date: e.target.value }))}
              className="rounded-lg px-2 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)', colorScheme: 'dark' }}
            />
            <input
              type="text"
              placeholder="$ amount"
              value={draft.amount}
              onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
              className="rounded-lg px-2 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}
            />
          </div>
          {error && <div className="text-[12px]" style={{ color: '#ef4444' }}>{error}</div>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add'}
            </button>
            <button onClick={() => setFormOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            {editingId && (
              <button
                onClick={() => { const it = items.find(i => i.id === editingId); if (it) { setFormOpen(false); remove(it) } }}
                className="btn btn-danger btn-sm ml-auto">
                <Trash2 size={12} className="inline -mt-0.5 mr-1" />Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grouped list */}
      {active.length === 0 && !formOpen && (
        <div className="glass-card p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Nothing open{filter !== 'all' ? ` in ${CATEGORY_CONFIG[filter as Category].label}` : ''}. Add an action above.
        </div>
      )}

      {groups.filter(g => g.items.length > 0).map(g => (
        <div key={g.title}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: g.accent }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              {g.title}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{g.items.length}</span>
          </div>
          <div className="space-y-1.5">
            {g.items.map(item => {
              const cat = CATEGORY_CONFIG[(item.category ?? 'finance') as Category] ?? CATEGORY_CONFIG.finance
              const days = item.dueDate ? daysUntil(item.dueDate) : null
              const chipColor = days !== null && days < 0 ? '#ef4444' : days !== null && days <= 14 ? '#f59e0b' : 'var(--text-muted)'
              return (
                <div key={item.id ?? item.title}
                  className="group flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <input type="checkbox" checked={false} onChange={() => setStatus(item, 'done')}
                    className="shrink-0 w-4 h-4 cursor-pointer accent-[#22c55e]" title="Mark complete" />
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: PRIORITY_CONFIG[item.priority].color }} title={PRIORITY_CONFIG[item.priority].label} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] leading-snug" style={{ color: 'var(--text-primary)' }}>{item.title}</div>
                    {item.detail && (
                      <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{item.detail}</div>
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: cat.color + '1f', color: cat.color }}>
                    {cat.label}
                  </span>
                  {item.amount != null && (
                    <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      {fmtMoney(item.amount)}
                    </span>
                  )}
                  {days !== null && (
                    <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded"
                      style={{ color: chipColor, background: 'rgba(255,255,255,0.05)' }}>
                      {days < 0 ? `${-days}d late` : days === 0 ? 'today' : `${days}d`}
                    </span>
                  )}
                  <button onClick={() => openEdit(item)}
                    className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                    style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="Edit">
                    <Pencil size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Completed */}
      {done.length > 0 && (
        <div>
          <button onClick={() => setShowDone(s => !s)} className="text-[11px] font-semibold"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {showDone ? '▾' : '▸'} Completed ({done.length})
          </button>
          {showDone && (
            <div className="mt-2 space-y-1">
              {done.map(item => (
                <div key={item.id ?? item.title} className="flex items-center gap-2 px-3.5 py-1.5 text-[12px]">
                  <span style={{ color: '#22c55e' }}>✓</span>
                  <span className="line-through truncate" style={{ color: 'var(--text-muted)' }}>{item.title}</span>
                  {item.completedAt && (
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {item.id && (
                    <button onClick={() => setStatus(item, 'active')}
                      className="text-[10px] ml-auto px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                      undo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color: string
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
      style={{
        background: active ? color + '25' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
