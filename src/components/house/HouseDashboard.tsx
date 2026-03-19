'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { DbHouseProject, DbHouseMaterial, DbHousePayment } from '@/types/database'

// ── Constants ──────────────────────────────────────────────────────────────

const ROOMS: { name: string; icon: string }[] = [
  { name: 'Living Room',      icon: '🛋️' },
  { name: 'Office',           icon: '💻' },
  { name: 'Kitchen',          icon: '🍳' },
  { name: 'Primary Bedroom',  icon: '🛏️' },
  { name: 'Guest Bedroom',    icon: '🛏️' },
  { name: 'Bathroom',         icon: '🚿' },
  { name: 'Primary Bathroom', icon: '🛁' },
  { name: 'Closet',           icon: '👔' },
  { name: 'Garage',           icon: '🚗' },
  { name: 'Backyard',         icon: '🌿' },
  { name: 'Dining Room',      icon: '🍽️' },
  { name: 'Guest Room',       icon: '🛏️' },
  { name: 'Staircase',        icon: '🪜' },
  { name: 'Laundry',          icon: '🧺' },
  { name: 'Patio/Deck',       icon: '🌅' },
  { name: 'Front Yard',       icon: '🏡' },
]

const STATUS_CONFIG: Record<DbHouseProject['status'], { label: string; color: string; dot: string }> = {
  idea:        { label: 'Idea',        color: '#6b7280', dot: 'bg-gray-400'    },
  planned:     { label: 'Planned',     color: '#60a5fa', dot: 'bg-blue-400'    },
  in_progress: { label: 'In Progress', color: '#00d4ff', dot: 'bg-cyan-400'    },
  on_hold:     { label: 'On Hold',     color: '#f59e0b', dot: 'bg-amber-400'   },
  done:        { label: 'Done',        color: '#10b981', dot: 'bg-emerald-400' },
  cancelled:   { label: 'Cancelled',   color: '#ef4444', dot: 'bg-red-400'     },
}

const PRIORITY_CONFIG: Record<DbHouseProject['priority'], { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#6b7280' },
  medium: { label: 'Medium', color: '#60a5fa' },
  high:   { label: 'High',   color: '#f59e0b' },
  urgent: { label: 'Urgent', color: '#ef4444' },
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  initialProjects: DbHouseProject[]
  initialMaterials: Partial<DbHouseMaterial>[]
  initialPayments: Partial<DbHousePayment>[]
}

type NewProjectForm = {
  title: string
  room: string
  status: DbHouseProject['status']
  priority: DbHouseProject['priority']
  estimated_budget: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// ── Add Project Modal ──────────────────────────────────────────────────────

function AddProjectModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (f: NewProjectForm) => Promise<void>
}) {
  const [form, setForm] = useState<NewProjectForm>({
    title: '', room: ROOMS[0].name, status: 'idea', priority: 'medium', estimated_budget: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] p-6 space-y-4"
        style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">New Project</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="Project title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Room</label>
              <select value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/12 text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50">
                {ROOMS.map(r => <option key={r.name} value={r.name} style={{ background: '#0a0e27' }}>{r.icon} {r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DbHouseProject['status'] }))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/12 text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k} style={{ background: '#0a0e27' }}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as DbHouseProject['priority'] }))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/12 text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} style={{ background: '#0a0e27' }}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Budget ($)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.estimated_budget}
                onChange={e => setForm(f => ({ ...f, estimated_budget: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-white/5 border border-white/12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm border border-white/12 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-50"
              style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
              {saving ? 'Adding…' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function HouseDashboard({ initialProjects, initialMaterials, initialPayments }: Props) {
  const [projects, setProjects] = useState<DbHouseProject[]>(initialProjects)
  const [showAdd, setShowAdd] = useState(false)

  // ── KPI calculations ──────────────────────────────────────────────
  const activeProjects   = projects.filter(p => p.status === 'in_progress' || p.status === 'planned')
  const nonIdeaProjects  = projects.filter(p => p.status !== 'idea' && p.status !== 'cancelled')
  const doneProjects     = projects.filter(p => p.status === 'done')
  const totalBudget      = nonIdeaProjects.reduce((s, p) => s + (p.estimated_budget ?? 0), 0)
  const totalSpent       = nonIdeaProjects.reduce((s, p) => s + (p.actual_cost ?? 0), 0)
  const materialsCost    = initialMaterials.reduce((s, m) => s + ((m.total_cost as number) ?? 0), 0)
  const paymentsTotal    = initialPayments.reduce((s, p) => s + ((p.amount as number) ?? 0), 0)
  const combinedSpent    = Math.max(totalSpent, paymentsTotal + materialsCost)
  const remaining        = Math.max(0, totalBudget - combinedSpent)
  const completionRate   = nonIdeaProjects.length > 0 ? Math.round((doneProjects.length / nonIdeaProjects.length) * 100) : 0

  // ── Room summaries ────────────────────────────────────────────────
  const roomSummary = new Map<string, { projects: DbHouseProject[] }>()
  for (const project of projects) {
    if (!roomSummary.has(project.room)) roomSummary.set(project.room, { projects: [] })
    roomSummary.get(project.room)!.projects.push(project)
  }

  const handleAddProject = useCallback(async (form: NewProjectForm) => {
    const res = await fetch('/api/house/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        room: form.room,
        status: form.status,
        priority: form.priority,
        estimated_budget: parseFloat(form.estimated_budget) || 0,
      }),
    })
    const data = await res.json() as DbHouseProject
    setProjects(prev => [data, ...prev])
    setShowAdd(false)
  }, [])

  const kpis = [
    { label: 'Active Projects', value: activeProjects.length.toString(), sub: 'planned + in progress', color: '#00d4ff' },
    { label: 'Total Budget',    value: fmt(totalBudget),  sub: 'across all projects',    color: '#60a5fa' },
    { label: 'Total Spent',     value: fmt(combinedSpent), sub: 'payments + materials',  color: '#f59e0b' },
    { label: 'Remaining',       value: fmt(remaining),    sub: 'budget - spent',          color: remaining > 0 ? '#10b981' : '#ef4444' },
    { label: 'Completion',      value: `${completionRate}%`, sub: `${doneProjects.length}/${nonIdeaProjects.length} done`, color: completionRate === 100 ? '#10b981' : '#a78bfa' },
  ]

  const urgentProjects = projects.filter(p =>
    (p.priority === 'urgent' || p.priority === 'high') && p.status !== 'done' && p.status !== 'cancelled'
  )

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ── */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <div>
          <h1 className="text-lg font-bold gradient-text">🏡 House Command Center</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            2214 N Carroll Ave, Dallas TX 75204 · {projects.length} projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/house/projects"
            className="px-3 py-1.5 rounded-lg text-xs border border-white/12 text-[var(--text-muted)] hover:border-cyan-500/30 hover:text-[var(--accent-cyan)] transition-all">
            All Projects
          </Link>
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
            + New Project
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpis.map(k => (
            <div key={k.label}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 hover:border-cyan-500/40 hover:shadow-[0_4px_20px_rgba(0,212,255,0.1)] transition-all">
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Urgent / High priority callout */}
        {urgentProjects.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-400 mb-2">⚡ {urgentProjects.length} high-priority project{urgentProjects.length !== 1 ? 's' : ''} need attention</p>
            <div className="flex flex-wrap gap-2">
              {urgentProjects.map(p => (
                <Link key={p.id} href={`/house/projects/${p.id}`}
                  className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition-all">
                  {ROOMS.find(r => r.name === p.room)?.icon ?? '🏠'} {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Status summary */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Project Pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['idea', 'planned', 'in_progress', 'done'] as const).map(status => {
              const cfg = STATUS_CONFIG[status]
              const count = projects.filter(p => p.status === status).length
              const statusProjects = projects.filter(p => p.status === status).slice(0, 3)
              return (
                <Link href={`/house/projects`} key={status}
                  className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 hover:border-cyan-500/30 hover:translateY-[-2px] transition-all block">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{count}</span>
                  </div>
                  <div className="space-y-1.5">
                    {statusProjects.map(p => (
                      <div key={p.id} className="text-[11px] text-[var(--text-muted)] truncate">
                        {ROOMS.find(r => r.name === p.room)?.icon ?? '🏠'} {p.title}
                      </div>
                    ))}
                    {count > 3 && <div className="text-[11px] text-[var(--text-muted)] opacity-60">+{count - 3} more</div>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Room Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Room Overview</h2>
            <Link href="/house/projects" className="text-xs text-[var(--accent-cyan)] hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ROOMS.map(room => {
              const roomProjects = roomSummary.get(room.name)?.projects ?? []
              const hasProjects = roomProjects.length > 0
              const inProgress = roomProjects.filter(p => p.status === 'in_progress').length
              const planned    = roomProjects.filter(p => p.status === 'planned').length
              const done       = roomProjects.filter(p => p.status === 'done').length
              const budget     = roomProjects.reduce((s, p) => s + p.estimated_budget, 0)

              return (
                <div key={room.name}
                  className={`bg-[var(--card-bg)] border rounded-xl p-3 transition-all ${
                    hasProjects
                      ? 'border-[var(--card-border)] hover:border-cyan-500/30 cursor-pointer'
                      : 'border-white/5 opacity-50'
                  }`}
                  onClick={() => hasProjects && window.location.assign(`/house/projects`)}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{room.icon}</span>
                    <span className="text-xs font-medium text-[var(--text-secondary)] truncate">{room.name}</span>
                  </div>
                  {hasProjects ? (
                    <>
                      <div className="flex gap-1.5 mb-1.5">
                        {inProgress > 0 && <span className="w-2 h-2 rounded-full bg-cyan-400" title="In Progress" />}
                        {planned    > 0 && <span className="w-2 h-2 rounded-full bg-blue-400" title="Planned" />}
                        {done       > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Done" />}
                        <span className="text-[10px] text-[var(--text-muted)] ml-auto">{roomProjects.length} project{roomProjects.length !== 1 ? 's' : ''}</span>
                      </div>
                      {budget > 0 && <p className="text-[10px] text-[var(--text-muted)]">{fmt(budget)}</p>}
                    </>
                  ) : (
                    <p className="text-[10px] text-[var(--text-muted)]">No projects</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent active projects */}
        {activeProjects.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Active Projects</h2>
              <Link href="/house/projects" className="text-xs text-[var(--accent-cyan)] hover:underline">View kanban →</Link>
            </div>
            <div className="space-y-2">
              {activeProjects.slice(0, 6).map(p => {
                const cfg    = STATUS_CONFIG[p.status]
                const pcfg   = PRIORITY_CONFIG[p.priority]
                const pctBudget = p.estimated_budget > 0
                  ? Math.min(100, Math.round((p.actual_cost / p.estimated_budget) * 100))
                  : 0
                const room = ROOMS.find(r => r.name === p.room)
                return (
                  <Link key={p.id} href={`/house/projects/${p.id}`}
                    className="flex items-center gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 hover:border-cyan-500/30 transition-all group block">
                    <span className="text-lg shrink-0">{room?.icon ?? '🏠'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.title}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                          style={{ background: `${pcfg.color}20`, color: pcfg.color }}>{pcfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${pctBudget}%`,
                              background: pctBudget >= 100 ? '#ef4444' : pctBudget >= 80 ? '#f59e0b' : 'var(--accent-gradient)',
                            }} />
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                          {fmt(p.actual_cost)} / {fmt(p.estimated_budget)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-md shrink-0 font-medium"
                      style={{ background: `${cfg.color}20`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-5xl">🏡</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">No house projects yet</p>
            <p className="text-sm text-[var(--text-muted)]">Add your first project to get started</p>
            <button onClick={() => setShowAdd(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
              + Add First Project
            </button>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/house/projects',    icon: '📋', label: 'Kanban Board'   },
            { href: '/house/materials',   icon: '🛒', label: 'Materials'      },
            { href: '/house/contractors', icon: '👷', label: 'Contractors'    },
            { href: '/house/design',      icon: '🎨', label: 'Design Hub'     },
          ].map(link => (
            <Link key={link.href} href={link.href}
              className="flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 hover:border-cyan-500/30 hover:shadow-[0_4px_20px_rgba(0,212,255,0.1)] transition-all group">
              <span className="text-xl">{link.icon}</span>
              <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} onSave={handleAddProject} />}
    </div>
  )
}
