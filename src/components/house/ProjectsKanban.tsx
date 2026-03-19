'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragEndEvent, closestCenter, useDraggable, useDroppable, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import type { DbHouseProject, DbHouseContractor } from '@/types/database'

// ── Constants ──────────────────────────────────────────────────────────────

const ROOMS = [
  'Living Room','Office','Kitchen','Primary Bedroom','Guest Bedroom',
  'Bathroom','Primary Bathroom','Closet','Garage','Backyard',
  'Dining Room','Guest Room','Staircase','Laundry','Patio/Deck','Front Yard',
]

const ROOM_ICONS: Record<string, string> = {
  'Living Room': '🛋️', 'Office': '💻', 'Kitchen': '🍳', 'Primary Bedroom': '🛏️',
  'Guest Bedroom': '🛏️', 'Bathroom': '🚿', 'Primary Bathroom': '🛁', 'Closet': '👔',
  'Garage': '🚗', 'Backyard': '🌿', 'Dining Room': '🍽️', 'Guest Room': '🛏️',
  'Staircase': '🪜', 'Laundry': '🧺', 'Patio/Deck': '🌅', 'Front Yard': '🏡',
}

const COLUMNS: { key: DbHouseProject['status']; label: string; icon: string; color: string }[] = [
  { key: 'idea',        label: 'Ideas',       icon: '💡', color: '#6b7280' },
  { key: 'planned',     label: 'Planned',     icon: '📋', color: '#60a5fa' },
  { key: 'in_progress', label: 'In Progress', icon: '⚡', color: '#00d4ff' },
  { key: 'done',        label: 'Done',        icon: '✅', color: '#10b981' },
]

const PRIORITY_CONFIG: Record<DbHouseProject['priority'], { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#6b7280' },
  medium: { label: 'Med',    color: '#60a5fa' },
  high:   { label: 'High',   color: '#f59e0b' },
  urgent: { label: 'Urgent', color: '#ef4444' },
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  initialProjects: DbHouseProject[]
  contractors: Pick<DbHouseContractor, 'id' | 'name' | 'company'>[]
}

type NewProjectForm = {
  title: string; room: string; priority: DbHouseProject['priority']; estimated_budget: string; status: DbHouseProject['status']
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return n > 0 ? `$${n.toLocaleString()}` : '' }

// ── Draggable Card ─────────────────────────────────────────────────────────

function ProjectCard({ project, isDragging = false }: { project: DbHouseProject; isDragging?: boolean }) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: project.id })
  const pcfg   = PRIORITY_CONFIG[project.priority]
  const roomIcon = ROOM_ICONS[project.room] ?? '🏠'

  const style = transform && !isDragging ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : {}

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: transform ? 0.5 : 1 }}
      className={`bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 cursor-grab active:cursor-grabbing select-none
        hover:border-cyan-500/30 hover:shadow-[0_4px_16px_rgba(0,212,255,0.1)] transition-colors`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-sm shrink-0">{roomIcon}</span>
        <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight flex-1 min-w-0">{project.title}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: `${pcfg.color}20`, color: pcfg.color }}>{pcfg.label}</span>
        <span className="text-[10px] text-[var(--text-muted)] truncate">{project.room}</span>
        {project.estimated_budget > 0 && (
          <span className="text-[10px] text-[var(--text-muted)] ml-auto shrink-0">{fmt(project.estimated_budget)}</span>
        )}
      </div>
      {project.target_date && (
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
          📅 {new Date(project.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      )}
      <button
        className="mt-2 text-[10px] text-[var(--accent-cyan)] hover:underline cursor-pointer w-full text-left"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); router.push(`/house/projects/${project.id}`) }}
      >
        Open →
      </button>
    </div>
  )
}

// ── Droppable Column ───────────────────────────────────────────────────────

function DroppableColumn({
  status, label, icon, color, projects, onAddClick,
}: {
  status: string; label: string; icon: string; color: string
  projects: DbHouseProject[]
  onAddClick: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 min-h-[400px] rounded-xl p-3 transition-colors ${
        isOver ? 'bg-cyan-500/8 ring-1 ring-cyan-500/30' : 'bg-white/2'
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-[var(--text-muted)] font-medium">{projects.length}</span>
        </div>
        <button onClick={onAddClick}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] cursor-pointer transition-colors">+ Add</button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {projects.map(p => <ProjectCard key={p.id} project={p} />)}
      </div>
    </div>
  )
}

// ── Add Project Modal ──────────────────────────────────────────────────────

function AddProjectModal({ defaultStatus, onClose, onSave }: {
  defaultStatus: DbHouseProject['status']
  onClose: () => void
  onSave: (f: NewProjectForm) => Promise<void>
}) {
  const [form, setForm] = useState<NewProjectForm>({
    title: '', room: ROOMS[0], status: defaultStatus, priority: 'medium', estimated_budget: '',
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
          <input required placeholder="Project title" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Room</label>
              <select value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/12 text-[var(--text-primary)] focus:outline-none">
                {ROOMS.map(r => <option key={r} value={r} style={{ background: '#0a0e27' }}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as DbHouseProject['priority'] }))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/12 text-[var(--text-primary)] focus:outline-none">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} style={{ background: '#0a0e27' }}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <input type="number" min="0" placeholder="Estimated budget ($)" value={form.estimated_budget}
            onChange={e => setForm(f => ({ ...f, estimated_budget: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/12 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
          />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm border border-white/12 text-[var(--text-muted)] hover:bg-white/5 cursor-pointer transition-all">Cancel</button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
              {saving ? 'Adding…' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Kanban Component ──────────────────────────────────────────────────

export default function ProjectsKanban({ initialProjects, contractors }: Props) {
  const [projects, setProjects]   = useState<DbHouseProject[]>(initialProjects)
  const [filterRoom, setFilterRoom] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [addingToStatus, setAddingToStatus] = useState<DbHouseProject['status'] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const filteredProjects = projects.filter(p => {
    if (filterRoom     && p.room     !== filterRoom)     return false
    if (filterPriority && p.priority !== filterPriority) return false
    return true
  })

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setDraggingId(e.active.id as string)
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setDraggingId(null)
    const { active, over } = event
    if (!over) return
    const projectId = active.id as string
    const newStatus = over.id as DbHouseProject['status']
    const project = projects.find(p => p.id === projectId)
    if (!project || project.status === newStatus) return

    // Optimistic update
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p))

    try {
      await fetch(`/api/house/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      // Revert on error
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: project.status } : p))
    }
  }, [projects])

  const handleAddProject = useCallback(async (form: NewProjectForm) => {
    const res = await fetch('/api/house/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title, room: form.room, status: form.status,
        priority: form.priority, estimated_budget: parseFloat(form.estimated_budget) || 0,
      }),
    })
    const data = await res.json() as DbHouseProject
    setProjects(prev => [data, ...prev])
    setAddingToStatus(null)
  }, [])

  const draggingProject = draggingId ? projects.find(p => p.id === draggingId) : null

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <div>
          <h1 className="text-lg font-bold gradient-text">📋 Projects</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {projects.length} total · drag to change status
          </p>
        </div>
        <button onClick={() => setAddingToStatus('idea')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ background: 'var(--accent-gradient)', color: '#050505' }}>
          + New Project
        </button>
      </div>

      {/* Filter bar */}
      <div className="shrink-0 px-6 py-3 flex gap-3 flex-wrap"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
        <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-[var(--text-secondary)] focus:outline-none">
          <option value="" style={{ background: '#0a0e27' }}>All rooms</option>
          {ROOMS.map(r => <option key={r} value={r} style={{ background: '#0a0e27' }}>{r}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-[var(--text-secondary)] focus:outline-none">
          <option value="" style={{ background: '#0a0e27' }}>All priorities</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} style={{ background: '#0a0e27' }}>{v.label}</option>)}
        </select>
        {(filterRoom || filterPriority) && (
          <button onClick={() => { setFilterRoom(''); setFilterPriority('') }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            Clear filters
          </button>
        )}
        <span className="text-xs text-[var(--text-muted)] ml-auto self-center">{filteredProjects.length} shown</span>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-auto p-5">
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-[700px]">
            {COLUMNS.map(col => (
              <div key={col.key} className="flex-1 min-w-[180px]">
                <DroppableColumn
                  status={col.key}
                  label={col.label}
                  icon={col.icon}
                  color={col.color}
                  projects={filteredProjects.filter(p => p.status === col.key)}
                  onAddClick={() => setAddingToStatus(col.key)}
                />
              </div>
            ))}
          </div>

          <DragOverlay>
            {draggingProject && (
              <div className="rotate-2 opacity-90">
                <ProjectCard project={draggingProject} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Contractors reference (footer) */}
      {contractors.length > 0 && (
        <div className="shrink-0 px-6 py-3 flex gap-2 flex-wrap"
          style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide self-center">Contractors:</span>
          {contractors.slice(0, 5).map(c => (
            <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-[var(--text-muted)]">
              {c.name}{c.company ? ` · ${c.company}` : ''}
            </span>
          ))}
        </div>
      )}

      {addingToStatus && (
        <AddProjectModal
          defaultStatus={addingToStatus}
          onClose={() => setAddingToStatus(null)}
          onSave={handleAddProject}
        />
      )}
    </div>
  )
}
