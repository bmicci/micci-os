'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { FOUNDATION_DATA, RITUALS_DATA, SECTIONS, type FoundationData, type RitualsData } from '@/lib/life-plan-data'
import FoundationEditModal, { type FieldSpec, type FieldValues } from './FoundationEditor'
import { Pencil, Search, Plus, Check, ChevronDown, MoreHorizontal } from 'lucide-react'
import AddGoalModal from './AddGoalModal'
import VisionBoardView from '@/components/goals/VisionBoardView'
import HouseBoardView from '@/components/goals/HouseBoardView'
import GoalProgressPanel, { QuarterlyReviewBanner } from '@/components/goals/GoalProgressPanel'

// ── Types ──────────────────────────────────────────────────────
export interface DBSection {
  id: string
  name: string
  color_hex: string
  sort_order: number
}

export interface DBGoal {
  id: string
  section_id: string
  timeframe: string
  timeframe_label: string | null
  category_header: string | null
  goal_text: string
  completed: boolean
  ai_generated: boolean
  is_seeded: boolean
  sort_order: number
}

type View = 'foundation' | 'goals' | 'timeline' | 'vision' | 'backlog'

interface Props {
  initialSections: DBSection[]
  initialGoals: DBGoal[]
  initialFoundation?: FoundationData | null
  initialRituals?: RitualsData | null
}

// ── Helpers ────────────────────────────────────────────────────
function pct(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

/** Group goals for a section: timeframe → {label, cats: category → goals[]} */
function groupGoals(goals: DBGoal[], sectionId: string) {
  const byTf = new Map<string, { label: string; cats: Map<string | null, DBGoal[]> }>()
  for (const g of goals.filter(g => g.section_id === sectionId)) {
    if (!byTf.has(g.timeframe)) {
      byTf.set(g.timeframe, { label: g.timeframe_label ?? `Age ${g.timeframe}`, cats: new Map() })
    }
    const tf = byTf.get(g.timeframe)!
    if (!tf.cats.has(g.category_header)) tf.cats.set(g.category_header, [])
    tf.cats.get(g.category_header)!.push(g)
  }
  return byTf
}

const TF_ORDER = ['40', '45', '50', '55', '60', 'all', 'pinned']

// ── Main Component ─────────────────────────────────────────────
export default function LifePlanClient({ initialSections, initialGoals, initialFoundation, initialRituals }: Props) {
  const [activeSection, setActiveSection] = useState(initialSections[0]?.id ?? 'health')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeView, setActiveView] = useState<View>('goals')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [goals, setGoals] = useState<DBGoal[]>(initialGoals)
  const [fdDoc, setFdDoc] = useState<FoundationData>(initialFoundation ?? FOUNDATION_DATA)
  const [rdDoc, setRdDoc] = useState<RitualsData>(initialRituals ?? RITUALS_DATA)

  // Persist a foundation document (optimistic; throws on failure so the
  // editor modal can surface the error and stay open)
  const saveFoundationDoc = useCallback(async (key: 'foundation' | 'rituals', data: FoundationData | RitualsData) => {
    const res = await fetch('/api/life-plan/foundation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Save failed')
    }
    if (key === 'foundation') setFdDoc(data as FoundationData)
    else setRdDoc(data as RitualsData)
  }, [])
  const [visionSubTab, setVisionSubTab] = useState<'overview' | 'board' | 'house'>('overview')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTarget, setAddTarget] = useState<{ sectionId: string; timeframe: string; timeframeLabel: string; categoryHeader: string | null } | null>(null)
  const [preFillText, setPreFillText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // ── Toggle goal completed ────────────────────────────────────
  const toggleGoal = useCallback(async (id: string) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return
    const next = !goal.completed
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: next } : g))
    try {
      const res = await fetch(`/api/life-plan/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !next } : g))
    }
  }, [goals])

  // ── Delete goal ──────────────────────────────────────────────
  const deleteGoal = useCallback(async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    await fetch(`/api/life-plan/goals/${id}`, { method: 'DELETE' })
  }, [])

  // ── Edit goal text ───────────────────────────────────────────
  const saveEdit = useCallback(async () => {
    if (!editingId || !editText.trim()) return
    const text = editText.trim()
    setGoals(prev => prev.map(g => g.id === editingId ? { ...g, goal_text: text } : g))
    setEditingId(null)
    await fetch(`/api/life-plan/goals/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_text: text }),
    })
  }, [editingId, editText])

  // ── Add new goal ─────────────────────────────────────────────
  const handleAddGoal = useCallback(async (
    sectionId: string, timeframe: string, timeframeLabel: string,
    categoryHeader: string | null, goalText: string, aiGenerated: boolean,
  ) => {
    const res = await fetch('/api/life-plan/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section_id: sectionId,
        timeframe,
        timeframe_label: timeframeLabel,
        category_header: categoryHeader,
        goal_text: goalText,
        ai_generated: aiGenerated,
      }),
    })
    if (!res.ok) throw new Error('Failed to add goal')
    const newGoal: DBGoal = await res.json()
    setGoals(prev => [...prev, newGoal])
  }, [])

  // ── Stats ─────────────────────────────────────────────────────
  const sectionStats = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {}
    for (const s of initialSections) {
      const sg = goals.filter(g => g.section_id === s.id)
      map[s.id] = { total: sg.length, done: sg.filter(g => g.completed).length }
    }
    return map
  }, [goals, initialSections])

  const totalStats = useMemo(() =>
    Object.values(sectionStats).reduce((a, s) => ({ total: a.total + s.total, done: a.done + s.done }), { total: 0, done: 0 }),
    [sectionStats]
  )

  const currentSection = initialSections.find(s => s.id === activeSection)

  function openAdd(sectionId: string, tf: string, tfLabel: string, cat: string | null) {
    setAddTarget({ sectionId, timeframe: tf, timeframeLabel: tfLabel, categoryHeader: cat })
    setShowAddModal(true)
  }

  const views: [View, string][] = [['goals', 'Goals'], ['timeline', 'Timeline'], ['foundation', 'Foundation'], ['vision', 'Vision'], ['backlog', 'Backlog']]
  const ageFilters: [string, string][] = [
    ['all', 'All'], ['40', '40'], ['45', '45'], ['50', '50'],
    ...(goals.some(g => g.timeframe === '55') ? [['55', '55'] as [string, string]] : []),
    ['60', '60'],
  ]
  const q = searchQuery.trim().toLowerCase()

  const itemProps = {
    editingId, editText, setEditText,
    onToggle: toggleGoal, onDelete: deleteGoal,
    onEdit: (id: string, text: string) => { setEditingId(id); setEditText(text) },
    onSaveEdit: saveEdit, onCancelEdit: () => setEditingId(null),
  }

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-0">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] md:text-3xl font-bold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
            Goals + Vision
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {totalStats.total} goals · {initialSections.length} areas · {totalStats.done} done
          </p>
        </div>
        {activeView === 'goals' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search all goals" aria-label="Search all goals"
              className="hidden md:block h-11 w-60 px-4 rounded-2xl text-sm"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-line)', color: 'var(--text-primary)' }} />
            <button onClick={() => setSearchOpen(o => !o)} aria-label="Search goals" aria-expanded={searchOpen}
              className="md:hidden w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: searchOpen ? 'rgba(var(--accent-rgb), 0.15)' : 'var(--glass-bg)', border: '1px solid var(--glass-line)', color: searchOpen ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
              <Search size={18} aria-hidden="true" />
            </button>
            <button onClick={() => { setAddTarget(null); setShowAddModal(true) }}
              className="hidden md:inline-flex items-center gap-2 h-11 px-5 rounded-2xl text-sm font-semibold"
              style={{ background: 'var(--accent-cyan)', color: '#04131c' }}>
              <Plus size={16} aria-hidden="true" /> Add goal
            </button>
          </div>
        )}
      </header>

      {activeView === 'goals' && searchOpen && (
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus
          placeholder="Search all goals" aria-label="Search all goals"
          className="md:hidden h-12 w-full px-4 rounded-2xl text-base"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-line)', color: 'var(--text-primary)' }} />
      )}

      {/* ── View switcher ────────────────────────────────────── */}
      <nav aria-label="Goals views" className="no-scrollbar flex gap-1 p-1 rounded-2xl overflow-x-auto md:w-fit"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
        {views.map(([v, label]) => (
          <button key={v} onClick={() => setActiveView(v)} aria-current={activeView === v ? 'page' : undefined}
            className="flex-none px-4 py-2.5 rounded-xl text-sm transition-colors"
            style={{ background: activeView === v ? 'var(--accent-cyan)' : 'transparent', color: activeView === v ? '#04131c' : 'var(--text-secondary)', fontWeight: activeView === v ? 600 : 500 }}>
            {label}
          </button>
        ))}
      </nav>

      {/* ── Goals view ───────────────────────────────────────── */}
      {activeView === 'goals' && (
        <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 md:items-start">

          {/* Desktop: area list */}
          <aside className="hidden md:flex flex-col gap-3 sticky top-6">
            <div className="glass-card overflow-hidden p-1.5">
              {initialSections.map(s => {
                const stats = sectionStats[s.id]
                const isActive = activeSection === s.id
                return (
                  <button key={s.id} onClick={() => { setActiveSection(s.id); setSearchQuery('') }}
                    className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors hover:bg-white/5"
                    style={{ background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent' }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color_hex }} />
                    <span className="text-sm flex-1 leading-tight" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400 }}>{s.name}</span>
                    {stats && stats.total > 0 && (
                      <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{stats.total}</span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="glass-card p-4">
              <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                <span>Overall</span>
                <span>{pct(totalStats.done, totalStats.total)}%</span>
              </div>
              <ProgressBar value={totalStats.done} max={totalStats.total} color="var(--accent-gradient)" label="Overall progress" />
              <div className="flex justify-between text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                <span>{totalStats.done} done</span><span>{totalStats.total - totalStats.done} left</span>
              </div>
            </div>
          </aside>

          <div className="flex flex-col gap-4 min-w-0">
            {/* Phone: area chips */}
            {!q && (
              <div className="md:hidden flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Life area</span>
                <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4">
                  {initialSections.map(s => {
                    const isActive = activeSection === s.id
                    return (
                      <button key={s.id} onClick={() => setActiveSection(s.id)} aria-pressed={isActive}
                        className="flex-none flex items-center gap-2 h-11 px-4 rounded-full text-sm"
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isActive ? 'rgba(255,255,255,0.28)' : 'var(--glass-line)'}`,
                          color: 'var(--text-primary)', fontWeight: isActive ? 600 : 500,
                        }}>
                        <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: s.color_hex }} />
                        <span className="whitespace-nowrap">{s.name}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sectionStats[s.id]?.total ?? 0}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <QuarterlyReviewBanner onDismiss={() => {}} />

            {q ? (
              <SearchResults sections={initialSections} goals={goals} query={q} itemProps={itemProps} />
            ) : currentSection && (
              <GoalsSectionView
                section={currentSection} goals={goals}
                activeFilter={activeFilter} setActiveFilter={setActiveFilter} ageFilters={ageFilters}
                stats={sectionStats[currentSection.id]}
                itemProps={itemProps}
                onAddGoal={openAdd}
              />
            )}
          </div>
        </div>
      )}

      {activeView === 'foundation' && <FoundationView fd={fdDoc} rd={rdDoc} onSave={saveFoundationDoc} />}

      {activeView === 'timeline' && (
        <TimelineView sections={initialSections} goals={goals} onToggle={toggleGoal} />
      )}

      {activeView === 'vision' && (
        <div>
          <div className="no-scrollbar flex gap-1 mb-6 p-1 rounded-xl w-fit max-w-full overflow-x-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {([['overview', 'Overview'], ['board', 'Vision Board'], ['house', 'House Board']] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setVisionSubTab(tab)}
                className="flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: visionSubTab === tab ? 'rgba(201,168,76,0.2)' : 'transparent',
                  color: visionSubTab === tab ? '#e8c97a' : 'var(--text-secondary)',
                  border: visionSubTab === tab ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                }}>
                {label}
              </button>
            ))}
          </div>
          {visionSubTab === 'overview' && <VisionView fd={fdDoc} rd={rdDoc} />}
          {visionSubTab === 'board' && <VisionBoardView />}
          {visionSubTab === 'house' && <HouseBoardView />}
        </div>
      )}

      {activeView === 'backlog' && (
        <BacklogView
          sections={initialSections}
          onPromote={(text, sectionId) => {
            setPreFillText(text)
            setAddTarget({ sectionId, timeframe: '40', timeframeLabel: 'Age 40 (1 Year)', categoryHeader: null })
            setShowAddModal(true)
          }}
        />
      )}

      {/* ── Phone: floating add button ───────────────────────── */}
      {activeView === 'goals' && !showAddModal && (
        <button onClick={() => { setAddTarget(null); setShowAddModal(true) }}
          className="md:hidden fixed left-4 z-40 flex items-center gap-2 h-[52px] px-5 rounded-full text-[15px] font-semibold"
          style={{ bottom: 88, background: 'var(--accent-cyan)', color: '#04131c', boxShadow: '0 10px 30px rgba(var(--accent-rgb), 0.35)' }}>
          <Plus size={18} strokeWidth={2.4} aria-hidden="true" /> Add goal
        </button>
      )}

      {/* ── Add goal modal ───────────────────────────────────── */}
      {showAddModal && (
        <AddGoalModal
          sections={initialSections}
          defaultSectionId={addTarget?.sectionId ?? activeSection}
          defaultTimeframe={addTarget?.timeframe ?? '40'}
          defaultTimeframeLabel={addTarget?.timeframeLabel ?? 'Age 40 (1 Year)'}
          defaultCategoryHeader={addTarget?.categoryHeader ?? null}
          defaultGoalText={preFillText}
          onAdd={handleAddGoal}
          onClose={() => { setShowAddModal(false); setAddTarget(null); setPreFillText('') }}
        />
      )}
    </div>
  )
}

// ── Shared bits ───────────────────────────────────────────────
/** Area colors are saturated mid-tones; lift them toward white so names stay legible on ink glass. */
const readable = (hex: string) => `color-mix(in srgb, ${hex} 62%, #ffffff)`

type ItemProps = {
  editingId: string | null; editText: string; setEditText: (t: string) => void
  onToggle: (id: string) => void; onDelete: (id: string) => void
  onEdit: (id: string, text: string) => void; onSaveEdit: () => void; onCancelEdit: () => void
}

function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const p = pct(value, max)
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
      className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(p, value > 0 ? 2 : 0)}%`, background: color }} />
    </div>
  )
}

/** Timeframe labels come as "1 YEAR (Age 40) — Dream Home" or "Age 40 (1 Year)";
 *  show the age as the title and the span as the eyebrow either way. */
function splitLabel(label: string) {
  const m = label.match(/^(.*?)\s*\(([^)]+)\)\s*(?:[—-]\s*(.+))?$/)
  if (!m) return { title: label, eyebrow: null as string | null }
  const [, main, paren, suffix] = m
  const tidy = (t: string) => t.toLowerCase().replace(/^\w/, c => c.toUpperCase())
  const [age, span] = /^age\b/i.test(paren) ? [paren, main] : [main, paren]
  return { title: suffix ? `${age} · ${suffix}` : age, eyebrow: tidy(span), age }
}

// ── GOAL ITEM ─────────────────────────────────────────────────
function GoalItem({ goal, isEditing, editText, setEditText, onToggle, onEdit, onDelete, onSaveEdit, onCancelEdit, sectionColor }: {
  goal: DBGoal; isEditing: boolean; editText: string; setEditText: (t: string) => void
  onToggle: () => void; onEdit: () => void; onDelete: () => void
  onSaveEdit: () => void; onCancelEdit: () => void
  sectionColor?: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function handleCreateTask(goalText: string) {
    // Hand off to the Action Center — ActionHub reads this key and opens
    // its add form prefilled with the goal text
    sessionStorage.setItem('micci-os-pending-task', JSON.stringify({ title: goalText, category: 'personal', priority: 'medium' }))
    window.location.href = '/tasks'
  }

  if (isEditing) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 px-4 md:px-5 py-2.5">
        <input value={editText} onChange={e => setEditText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit() }}
          aria-label="Goal text"
          className="flex-1 h-11 text-base md:text-sm rounded-xl px-3"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--accent-cyan)', color: 'var(--text-primary)' }}
          autoFocus />
        <div className="flex gap-2">
          <button onClick={onSaveEdit} className="flex-1 sm:flex-none h-11 px-4 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-cyan)', color: '#04131c' }}>Save</button>
          <button onClick={onCancelEdit} className="flex-1 sm:flex-none h-11 px-4 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="group">
      <div className="flex items-start gap-1 pl-1 pr-2 md:pl-2">
        <button onClick={onToggle} role="checkbox" aria-checked={goal.completed} aria-label={goal.goal_text}
          className="w-11 h-12 flex-shrink-0 flex items-center justify-center">
          <span className="w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-colors"
            style={{ borderColor: goal.completed ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.32)', background: goal.completed ? 'var(--accent-cyan)' : 'transparent' }}>
            {goal.completed && <Check size={14} strokeWidth={3} color="#04131c" aria-hidden="true" />}
          </span>
        </button>

        <div className="flex-1 min-w-0 py-3">
          <span className="text-[15px] md:text-sm leading-snug" style={{ color: goal.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: goal.completed ? 'line-through' : 'none' }}>
            {goal.goal_text}
          </span>
          {goal.ai_generated && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full align-middle" style={{ background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-cyan)' }}>AI</span>
          )}
        </div>

        <button onClick={() => setMenuOpen(o => !o)} aria-label="Goal actions" aria-expanded={menuOpen}
          className="w-11 h-12 flex-shrink-0 flex items-center justify-center rounded-xl transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          style={{ color: menuOpen ? 'var(--accent-cyan)' : 'var(--text-muted)', opacity: menuOpen ? 1 : undefined }}>
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </div>

      {menuOpen && (
        <div className="flex gap-2 pl-12 md:pl-14 pr-4 pb-3 -mt-1">
          <button onClick={() => setExpanded(e => !e)} className="h-10 px-3 rounded-xl text-[13px]"
            style={{ background: expanded ? 'rgba(var(--accent-rgb), 0.12)' : 'rgba(255,255,255,0.07)', color: expanded ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
            Progress
          </button>
          <button onClick={() => { setMenuOpen(false); onEdit() }} className="h-10 px-3 rounded-xl text-[13px]"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>
            Edit
          </button>
          <button onClick={() => { if (window.confirm('Delete this goal?')) onDelete() }} className="h-10 px-3 rounded-xl text-[13px]"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
            Delete
          </button>
        </div>
      )}

      {menuOpen && expanded && (
        <div className="px-4 md:px-5 pb-3">
          <GoalProgressPanel goalId={goal.id} goalText={goal.goal_text} sectionColor={sectionColor} onCreateTask={handleCreateTask} />
        </div>
      )}
    </div>
  )
}

function GoalList({ goals, itemProps, sectionColor }: { goals: DBGoal[]; itemProps: ItemProps; sectionColor?: string }) {
  return (
    <>
      {goals.map(g => (
        <GoalItem key={g.id} goal={g}
          isEditing={itemProps.editingId === g.id} editText={itemProps.editText} setEditText={itemProps.setEditText}
          onToggle={() => itemProps.onToggle(g.id)}
          onEdit={() => itemProps.onEdit(g.id, g.goal_text)}
          onDelete={() => itemProps.onDelete(g.id)}
          onSaveEdit={itemProps.onSaveEdit} onCancelEdit={itemProps.onCancelEdit}
          sectionColor={sectionColor}
        />
      ))}
    </>
  )
}

// ── SEARCH RESULTS (across every area) ────────────────────────
function SearchResults({ sections, goals, query, itemProps }: { sections: DBSection[]; goals: DBGoal[]; query: string; itemProps: ItemProps }) {
  const hits = goals.filter(g => g.goal_text.toLowerCase().includes(query))
  if (hits.length === 0) {
    return <div className="glass-card p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No goals match “{query}”.</div>
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{hits.length} match{hits.length === 1 ? '' : 'es'}</p>
      {sections.map(s => {
        const sh = hits.filter(g => g.section_id === s.id)
        if (sh.length === 0) return null
        return (
          <section key={s.id} className="glass-card overflow-hidden" style={{ borderRadius: 20 }}>
            <h2 className="px-5 pt-4 pb-1 text-sm font-semibold" style={{ color: readable(s.color_hex) }}>{s.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {sh.length}</span></h2>
            <GoalList goals={sh} itemProps={itemProps} sectionColor={s.color_hex} />
          </section>
        )
      })}
    </div>
  )
}

// ── GOALS SECTION VIEW ────────────────────────────────────────
function GoalsSectionView({ section, goals, activeFilter, setActiveFilter, ageFilters, stats, itemProps, onAddGoal }: {
  section: DBSection; goals: DBGoal[]; activeFilter: string; setActiveFilter: (f: string) => void
  ageFilters: [string, string][]
  stats: { total: number; done: number }; itemProps: ItemProps
  onAddGoal: (sectionId: string, tf: string, tfLabel: string, cat: string | null) => void
}) {
  const grouped = useMemo(() => groupGoals(goals, section.id), [goals, section.id])

  const orderedTfs = useMemo(() => {
    const result = TF_ORDER
      .map(tf => [tf, grouped.get(tf)] as const)
      .filter(([, data]) => !!data)
    // append any timeframes not in TF_ORDER
    for (const [tf, data] of grouped.entries()) {
      if (!TF_ORDER.includes(tf)) result.push([tf, data] as const)
    }
    return result
  }, [grouped])

  const visibleTfs = orderedTfs.filter(([tf]) => {
    const isStandardTf = ['40', '45', '50', '55', '60'].includes(tf)
    return activeFilter === 'all' || !isStandardTf || activeFilter === tf
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Area header card */}
      <section className="glass-card flex flex-col gap-3.5 p-[18px] md:p-5" style={{ borderRadius: 20 }}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: readable(section.color_hex) }}>{section.name}</h2>
          <span className="text-[13px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{stats.done} of {stats.total}</span>
        </div>
        <ProgressBar value={stats.done} max={stats.total} color={section.color_hex} label={`${section.name} progress`} />
        <div role="group" aria-label="Filter by age" className="grid gap-1 p-1 rounded-2xl md:max-w-md"
          style={{ gridTemplateColumns: `repeat(${ageFilters.length}, minmax(0, 1fr))`, background: 'rgba(7,11,26,0.5)' }}>
          {ageFilters.map(([f, label]) => (
            <button key={f} onClick={() => setActiveFilter(f)} aria-pressed={activeFilter === f}
              className="h-10 rounded-xl text-[13px] transition-colors"
              style={{ background: activeFilter === f ? 'rgba(255,255,255,0.14)' : 'transparent', color: activeFilter === f ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeFilter === f ? 600 : 500 }}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {visibleTfs.map(([tf, data], i) => {
        if (!data) return null
        const tfGoals = goals.filter(g => g.section_id === section.id && g.timeframe === tf)
        const tfDone = tfGoals.filter(g => g.completed).length
        return (
          <TimeframeBlock key={`${section.id}-${tf}`} label={data.label}
            count={tfDone > 0 ? `${tfDone} of ${tfGoals.length}` : `${tfGoals.length} goal${tfGoals.length === 1 ? '' : 's'}`}
            defaultOpen={i === 0 || activeFilter !== 'all'}>
            {[...data.cats.entries()].map(([cat, catGoals]) => (
              <div key={cat ?? '_none'} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                {cat && (
                  <h3 className="px-4 md:px-5 pt-3.5 pb-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{cat}</h3>
                )}
                <GoalList goals={catGoals} itemProps={itemProps} sectionColor={section.color_hex} />
              </div>
            ))}
            <button onClick={() => onAddGoal(section.id, tf, data.label, null)}
              className="w-full flex items-center gap-2.5 min-h-[52px] px-4 md:px-5 border-t text-sm font-medium transition-colors hover:bg-white/[0.03]"
              style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--accent-cyan)' }}>
              <Plus size={16} aria-hidden="true" /> Add to {splitLabel(data.label).age ?? splitLabel(data.label).title}
            </button>
          </TimeframeBlock>
        )
      })}

      {orderedTfs.length === 0 && (
        <div className="glass-card text-center py-12 px-6">
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No goals in this area yet.</p>
          <button onClick={() => onAddGoal(section.id, '40', 'Age 40 (1 Year)', null)}
            className="h-11 px-5 rounded-2xl text-sm font-semibold" style={{ background: 'var(--accent-cyan)', color: '#04131c' }}>
            Add the first goal
          </button>
        </div>
      )}
    </div>
  )
}

// ── COLLAPSIBLE TIMEFRAME BLOCK ───────────────────────────────
function TimeframeBlock({ label, children, count, defaultOpen }: {
  label: string; children: React.ReactNode; count: string; defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])
  const { title, eyebrow } = splitLabel(label)
  return (
    <section className="glass-card overflow-hidden" style={{ borderRadius: 20 }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 min-h-[60px] px-4 md:px-5 py-2 text-left transition-colors hover:bg-white/[0.03]">
        <span className="flex flex-col gap-0.5 min-w-0">
          {eyebrow && <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{eyebrow}</span>}
          <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        </span>
        <span className="flex items-center gap-2.5 flex-shrink-0 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {count}
          <ChevronDown size={16} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </span>
      </button>
      {open && <div>{children}</div>}
    </section>
  )
}

// ── TIMELINE VIEW ─────────────────────────────────────────────
function TimelineView({ sections, goals, onToggle }: { sections: DBSection[]; goals: DBGoal[]; onToggle: (id: string) => void }) {
  // Age 55 stays hidden until its first goal exists — no empty columns
  const tfCols = (['40', '45', '50', '55', '60'] as const).filter(
    tf => tf !== '55' || goals.some(g => g.timeframe === '55'),
  )
  const [mobileTf, setMobileTf] = useState<string>('40')
  return (
    <>
      {/* Phone: one age at a time, areas stacked */}
      <div className="md:hidden flex flex-col gap-3">
        <div role="group" aria-label="Age" className="grid gap-1 p-1 rounded-2xl"
          style={{ gridTemplateColumns: `repeat(${tfCols.length}, minmax(0, 1fr))`, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {tfCols.map(tf => (
            <button key={tf} onClick={() => setMobileTf(tf)} aria-pressed={mobileTf === tf}
              className="h-10 rounded-xl text-[13px]"
              style={{ background: mobileTf === tf ? 'var(--accent-cyan)' : 'transparent', color: mobileTf === tf ? '#04131c' : 'var(--text-secondary)', fontWeight: mobileTf === tf ? 600 : 500 }}>
              Age {tf}
            </button>
          ))}
        </div>
        {sections.map(s => {
          const all = goals.filter(g => g.section_id === s.id && g.timeframe === mobileTf)
          if (all.length === 0) return null
          return <TimelineAreaCard key={s.id} section={s} goals={all} onToggle={onToggle} />
        })}
      </div>

      {/* Desktop: full grid */}
      <div className="hidden md:block glass-card overflow-x-auto" style={{ borderRadius: 20 }}>
        <table style={{ minWidth: 900, borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold uppercase tracking-widest px-4 py-3"
                style={{ color: 'var(--text-muted)', width: 160, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Life Area</th>
              {tfCols.map(tf => (
                <th key={tf} className="text-left text-xs font-semibold px-3 py-3"
                  style={{ color: 'var(--text-primary)', background: tf === '40' ? 'rgba(var(--accent-rgb), 0.06)' : 'transparent', borderBottom: tf === '40' ? '2px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)' }}>
                  Age {tf}{tf === '40' ? ' · Now' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-2 text-xs font-semibold"
                  style={{ color: readable(s.color_hex), borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>{s.name}</td>
                {tfCols.map(tf => {
                  const all = goals.filter(g => g.section_id === s.id && g.timeframe === tf)
                  return (
                    <td key={tf} className="px-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top' }}>
                      {all.slice(0, 3).map(g => (
                        <button key={g.id} onClick={() => onToggle(g.id)}
                          className="block w-full text-left mb-1 px-2 py-1 rounded text-[11px] transition-opacity hover:opacity-90"
                          style={{ background: `${s.color_hex}18`, color: g.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: g.completed ? 'line-through' : 'none', borderLeft: `3px solid ${s.color_hex}`, lineHeight: 1.3 }}>
                          {g.goal_text.length > 45 ? g.goal_text.slice(0, 43) + '…' : g.goal_text}
                        </button>
                      ))}
                      {all.length > 3 && <div className="text-[10px] px-2" style={{ color: 'var(--text-muted)' }}>+{all.length - 3} more</div>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TimelineAreaCard({ section, goals, onToggle }: { section: DBSection; goals: DBGoal[]; onToggle: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? goals : goals.slice(0, 3)
  return (
    <section className="glass-card overflow-hidden" style={{ borderRadius: 20 }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <h3 className="text-sm font-semibold" style={{ color: readable(section.color_hex) }}>{section.name}</h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{goals.filter(g => g.completed).length} of {goals.length}</span>
      </div>
      {shown.map(g => (
        <button key={g.id} onClick={() => onToggle(g.id)} role="checkbox" aria-checked={g.completed}
          className="w-full flex items-start gap-3 px-4 py-2.5 text-left">
          <span className="mt-0.5 w-[18px] h-[18px] rounded border-2 flex-shrink-0 flex items-center justify-center"
            style={{ borderColor: g.completed ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.3)', background: g.completed ? 'var(--accent-cyan)' : 'transparent' }}>
            {g.completed && <Check size={12} strokeWidth={3} color="#04131c" aria-hidden="true" />}
          </span>
          <span className="text-sm leading-snug" style={{ color: g.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: g.completed ? 'line-through' : 'none' }}>{g.goal_text}</span>
        </button>
      ))}
      {goals.length > 3 ? (
        <button onClick={() => setShowAll(s => !s)} className="w-full min-h-[44px] px-4 text-left text-[13px] font-medium border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--accent-cyan)' }}>
          {showAll ? 'Show less' : `Show all ${goals.length}`}
        </button>
      ) : <div className="h-2" />}
    </section>
  )
}

// ── VISION VIEW ───────────────────────────────────────────────
const ROLE_MODEL_TAGS: Record<string, string> = {
  'Ray Dalio': 'Principles · Wealth · Vision',
  'Simon Sinek': 'Leadership · Purpose · Influence',
  'Julius Caesar': 'Ambition · Strategy · Power',
  'Ronald Reagan': 'Communication · Conviction · Legacy',
}

const AREA_ICONS: Record<string, string> = {
  health: '🏋️', career: '💼', relationships: '💍', family: '👨‍👩‍👧',
  finance: '📈', home: '🏡', fun: '✈️', 'personal-dev': '🎓',
  spiritual: '✝️', memberships: '🔑',
}

const MILESTONES = [
  { age: '40', year: '2026 · Year One', items: [
    { label: 'Health', text: 'Complete 75 Hard; 190 lbs; visible abs' },
    { label: 'Career', text: 'VP role; $300–400K comp; keynotes' },
    { label: 'Romance', text: 'Find her; engaged by year-end' },
    { label: 'Finance', text: 'Net worth $450–500K' },
    { label: 'Growth', text: 'MIT Sloan; Wharton; Spanish' },
    { label: 'Faith', text: 'Home parish; Camino de Santiago' },
  ]},
  { age: '45', year: '2031 · Five Years', items: [
    { label: 'Career', text: 'SVP/EVP or C-Suite; $500K–$1M' },
    { label: 'Family', text: 'Married; 2–3 kids; Italy wedding' },
    { label: 'Finance', text: 'Net worth $2–2.5M; debt-free' },
    { label: 'Home', text: 'Large home with pool & gym' },
    { label: 'Growth', text: 'Top 10 MBA; TEDx talk' },
    { label: 'Travel', text: 'SE Asia; African Safari' },
  ]},
  { age: '50', year: '2036 · Ten Years', items: [
    { label: 'Career', text: 'C-Suite Fortune 500; $1–3M+' },
    { label: 'Legacy', text: 'Book published; Davos; Forbes cover' },
    { label: 'Finance', text: 'Net worth $6–8M; $10–15K passive/mo' },
    { label: 'Home', text: 'Dream home; vacation properties' },
    { label: 'Family', text: 'Foundation started; $500K+/yr giving' },
    { label: 'Faith', text: 'Holy Land pilgrimage; parish leader' },
  ]},
  { age: '60', year: '2046 · Twenty Years', items: [
    { label: 'Career', text: 'Governor candidate; CEO/boards' },
    { label: 'Finance', text: 'Net worth $15–25M; financially free' },
    { label: 'Legacy', text: 'Household name; Forbes lists' },
    { label: 'Family', text: 'Patriarch; family compound' },
    { label: 'Philanthropy', text: 'Named foundation; $1M+/yr giving' },
    { label: 'Faith', text: 'Papal audience; endowed gift to Church' },
  ]},
]

const BUCKET_LIST: { title: string; desc: string }[] = [
  { title: 'SE Asia', desc: 'Thailand, Vietnam, Indonesia, Cambodia' },
  { title: 'Egypt', desc: 'Pyramids, Nile River, ancient history deep dive' },
  { title: 'Machu Picchu', desc: 'Hike the full Inca Trail' },
  { title: 'Viking River Cruise', desc: 'France & Germany with my parents' },
  { title: 'African Safari', desc: 'Kenya, Tanzania, or South Africa' },
  { title: 'F1 Monaco Grand Prix', desc: 'Priority experience — VIP access' },
  { title: 'Camino de Santiago', desc: 'Walk the full pilgrimage route in Spain' },
  { title: 'Propose in Italy', desc: 'The moment — the dream destination' },
  { title: 'Charter a Yacht', desc: 'Family vacation at sea' },
  { title: 'Rent a Villa in Italy', desc: 'Extended family gathering — the ultimate host' },
  { title: 'Forbes / Fortune Cover', desc: 'A milestone of business recognition' },
  { title: 'Ring the Bell on Wall Street', desc: 'Celebrate a company milestone' },
  { title: 'TED Main Stage', desc: 'From TEDx → the global stage' },
  { title: 'Restore a Classic Car with Dad', desc: 'Do this while we still can' },
  { title: 'Porsche Experience / Race Track', desc: 'Drive a Porsche on the Nürburgring' },
]

function GoldSectionHeader({ eyebrow, heading }: { eyebrow: string; heading: string }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: 'rgba(201,168,76,0.6)' }}>{eyebrow}</div>
      <h2 className="text-xl font-bold" style={{ color: '#e8c97a', fontFamily: 'var(--font-geist-sans)' }}>{heading}</h2>
      <div className="w-12 h-0.5 mt-2" style={{ background: 'rgba(201,168,76,0.4)' }} />
    </div>
  )
}

function VisionView({ fd, rd }: { fd: FoundationData; rd: RitualsData }) {

  return (
    <div className="space-y-12 pb-10">

      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border text-center py-12 px-8"
        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%)', borderColor: 'rgba(201,168,76,0.3)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
            style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)', color: '#e8c97a' }}>B</div>
          <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'rgba(201,168,76,0.6)' }}>Vision Board · 2026 &amp; Beyond</div>
          <h1 className="text-4xl font-bold mb-1" style={{ color: '#e8c97a', fontFamily: 'var(--font-geist-sans)' }}>Brandon Micci</h1>
          <p className="text-sm mb-5" style={{ color: 'rgba(201,168,76,0.6)' }}>Visionary · Leader · Builder</p>
          <div className="w-16 h-px mx-auto mb-6" style={{ background: 'rgba(201,168,76,0.4)' }} />
          <p className="text-sm leading-relaxed mb-6 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{fd.vision}</p>
          <div className="inline-block px-5 py-3 rounded-xl mb-6" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(201,168,76,0.5)' }}>Life&apos;s Purpose &amp; Mission</div>
            <p className="text-sm" style={{ color: '#e8c97a', fontStyle: 'italic' }}>{fd.purpose}</p>
          </div>
          <div>
            <span className="text-lg font-bold" style={{ color: '#C9A84C' }}>Dream Big.</span>
            <span className="text-lg mx-3" style={{ color: 'var(--text-muted)' }}>Work Hard.</span>
            <span className="text-lg font-bold" style={{ color: '#C9A84C' }}>Stay Humble.</span>
          </div>
        </div>
      </div>

      {/* ROLE MODELS */}
      <div>
        <GoldSectionHeader eyebrow="Who I Aspire To Emulate" heading="Role Models" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {fd.roleModels.map(rm => (
            <div key={rm} className="p-4 rounded-xl border text-center"
              style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(201,168,76,0.2)' }}>
              <div className="text-base font-semibold mb-1" style={{ color: '#e8c97a' }}>{rm}</div>
              <div className="text-xs" style={{ color: 'rgba(201,168,76,0.5)' }}>{ROLE_MODEL_TAGS[rm] ?? ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CORE VALUES */}
      <div>
        <GoldSectionHeader eyebrow="What Drives Everything" heading="Core Values" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fd.coreValues.map((v, i) => (
            <div key={v.name} className="p-5 rounded-xl border relative overflow-hidden transition-all"
              style={{ background: 'rgba(201,168,76,0.04)', borderColor: 'rgba(201,168,76,0.15)' }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
              <div className="text-5xl font-black leading-none mb-2 select-none" style={{ color: 'rgba(201,168,76,0.1)' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="text-base font-bold mb-1.5" style={{ color: '#e8c97a', fontFamily: 'var(--font-geist-sans)' }}>{v.name}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LIFE GOALS GRID */}
      <div>
        <GoldSectionHeader eyebrow="The Blueprint" heading="Life Goals" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.filter(s => !s.isVision).map(s => (
            <div key={s.id} className="p-4 rounded-xl border relative overflow-hidden"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.colorHex }} />
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 18 }}>{AREA_ICONS[s.id] ?? '🎯'}</span>
                <span className="text-sm font-semibold" style={{ color: s.colorHex }}>{s.name}</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                {s.allAges && !s.timeframes ? 'All Ages' : 'Ages 40–60'}
              </div>
              <ul className="space-y-1.5" style={{ listStyle: 'none', padding: 0 }}>
                {s.timeframes && (['40', '45', '50', '55', '60'] as const).map(tf => {
                  const tfData = s.timeframes![tf]
                  if (!tfData) return null
                  const summary = tfData.categories[0]?.goals.slice(0, 3).join('; ')
                  return summary ? (
                    <li key={tf} className="text-xs relative" style={{ color: 'var(--text-secondary)', paddingLeft: 14 }}>
                      <span className="absolute left-0 top-0.5 text-[10px]" style={{ color: s.colorHex }}>→</span>
                      <span className="font-medium" style={{ color: 'rgba(240,246,255,0.75)' }}>Age {tf}:</span>{' '}
                      {summary}
                    </li>
                  ) : null
                })}
                {!s.timeframes && (s.allAges ?? s.pinned ?? []).slice(0, 1).map((group, i) => {
                  const goals = ('goals' in group ? group.goals : 'items' in group ? group.items : []) ?? []
                  return goals.slice(0, 4).map((g, gi) => (
                    <li key={`${i}-${gi}`} className="text-xs relative" style={{ color: 'var(--text-secondary)', paddingLeft: 14 }}>
                      <span className="absolute left-0 top-0.5 text-[10px]" style={{ color: s.colorHex }}>→</span>
                      {(g as string).length > 60 ? (g as string).slice(0, 58) + '…' : g as string}
                    </li>
                  ))
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* MILESTONE TIMELINE */}
      <div>
        <GoldSectionHeader eyebrow="The Journey Ahead" heading="Major Milestones" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MILESTONES.map((m, i) => (
            <div key={m.age} className="p-4 rounded-xl border"
              style={{ background: i === 0 ? 'rgba(201,168,76,0.06)' : 'var(--card-bg)', borderColor: i === 0 ? 'rgba(201,168,76,0.3)' : 'var(--card-border)' }}>
              <div className="text-3xl font-bold mb-0.5" style={{ color: '#C9A84C', fontFamily: 'var(--font-geist-sans)' }}>{m.age}</div>
              <div className="text-[11px] mb-3" style={{ color: 'rgba(201,168,76,0.5)' }}>{m.year}</div>
              <div className="space-y-1.5">
                {m.items.map(item => (
                  <div key={item.label} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: '#C9A84C' }}>{item.label} — </span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AFFIRMATIONS */}
      <div>
        <GoldSectionHeader eyebrow="Daily Declarations" heading="Affirmations" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rd.affirmations.map((a, i) => (
            <div key={i} className="p-4 rounded-r-xl border transition-all"
              style={{ background: 'rgba(201,168,76,0.03)', borderColor: 'rgba(201,168,76,0.15)', borderLeftWidth: 3, borderLeftColor: '#8a6f2e' }}>
              <div className="text-[11px] font-bold mb-1.5 tracking-wide" style={{ color: '#8a6f2e' }}>{String(i + 1).padStart(2, '0')}</div>
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PASSIONS */}
      <div>
        <GoldSectionHeader eyebrow="What Energizes Me" heading="Passions &amp; Flow" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            ['Activities That Energize Me', fd.passions.energize],
            ['Topics I Could Talk About for Hours', fd.passions.talkAbout],
            ['How I Recharge', fd.passions.recharge],
            ['When I Feel Most Like Myself', fd.passions.mostMyself],
          ] as [string, string[]][]).map(([label, items]) => (
            <div key={label} className="p-4 rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#C9A84C' }}>{label}</div>
              <div className="flex flex-wrap gap-2">
                {items.map(p => (
                  <span key={p} className="px-2.5 py-1 rounded-full text-xs border"
                    style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(201,168,76,0.15)', color: 'var(--text-secondary)' }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BUCKET LIST */}
      <div>
        <GoldSectionHeader eyebrow="Before I Leave This Earth" heading="Bucket List" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUCKET_LIST.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border transition-all"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <span className="text-3xl font-black leading-none flex-shrink-0 w-9"
                style={{ color: 'rgba(201,168,76,0.2)', fontFamily: 'var(--font-geist-sans)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{item.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REMINDERS */}
      <div>
        <GoldSectionHeader eyebrow="When Things Get Hard" heading="Things to Remember" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rd.reminders.map((r, i) => (
            <div key={i} className="px-5 py-4 rounded-xl border transition-all"
              style={{ background: 'rgba(201,168,76,0.03)', borderColor: 'rgba(201,168,76,0.12)' }}>
              <p className="text-base leading-relaxed" style={{ fontStyle: 'italic', color: 'rgba(240,246,255,0.75)' }}>
                &ldquo;{r}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center rounded-2xl border" style={{ borderColor: 'rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)' }}>
        <p className="text-xl font-bold" style={{ color: '#e8c97a', letterSpacing: '0.05em', fontFamily: 'var(--font-geist-sans)' }}>
          — Dream Big. Work Hard. Stay Humble. —
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>This document is a living roadmap. Review monthly. Update as you grow.</p>
      </div>
    </div>
  )
}

// ── FOUNDATION VIEW ───────────────────────────────────────────
function FoundationView({ fd, rd, onSave }: {
  fd: FoundationData
  rd: RitualsData
  onSave: (key: 'foundation' | 'rituals', data: FoundationData | RitualsData) => Promise<void>
}) {
  const [editCard, setEditCard] = useState<string | null>(null)

  // Card registry: field specs + how saved values fold back into the docs
  const CARDS: Record<string, { title: string; fields: FieldSpec[]; apply: (v: FieldValues) => Promise<void> }> = {
    purpose: {
      title: "Life's Purpose & Mission",
      fields: [{ key: 'purpose', kind: 'text', label: 'Purpose statement', value: fd.purpose }],
      apply: v => onSave('foundation', { ...fd, purpose: v.purpose as string }),
    },
    vision: {
      title: 'Vision for My Life',
      fields: [{ key: 'vision', kind: 'text', label: 'Vision', value: fd.vision }],
      apply: v => onSave('foundation', { ...fd, vision: v.vision as string }),
    },
    roleModels: {
      title: 'Role Models',
      fields: [{ key: 'roleModels', kind: 'lines', label: 'Role models (one per line)', value: fd.roleModels }],
      apply: v => onSave('foundation', { ...fd, roleModels: v.roleModels as string[] }),
    },
    coreValues: {
      title: 'Core Values',
      fields: [{ key: 'coreValues', kind: 'pairs', label: 'Values — "Name | description" per line', value: fd.coreValues }],
      apply: v => onSave('foundation', { ...fd, coreValues: v.coreValues as { name: string; desc: string }[] }),
    },
    gratitude: {
      title: 'Gratitude',
      fields: [{ key: 'gratitude', kind: 'lines', label: 'Gratitude (one per line)', value: rd.gratitude }],
      apply: v => onSave('rituals', { ...rd, gratitude: v.gratitude as string[] }),
    },
    affirmations: {
      title: 'Daily Affirmations',
      fields: [{ key: 'affirmations', kind: 'lines', label: 'Affirmations (one per line)', value: rd.affirmations }],
      apply: v => onSave('rituals', { ...rd, affirmations: v.affirmations as string[] }),
    },
    passions: {
      title: "What I'm Passionate About",
      fields: [
        { key: 'energize', kind: 'lines', label: 'Activities that energize me', value: fd.passions.energize },
        { key: 'talkAbout', kind: 'lines', label: 'Topics I could talk about for hours', value: fd.passions.talkAbout },
        { key: 'recharge', kind: 'lines', label: 'How I recharge', value: fd.passions.recharge },
        { key: 'mostMyself', kind: 'lines', label: 'When I feel most like myself', value: fd.passions.mostMyself },
      ],
      apply: v => onSave('foundation', { ...fd, passions: {
        energize: v.energize as string[], talkAbout: v.talkAbout as string[],
        recharge: v.recharge as string[], mostMyself: v.mostMyself as string[],
      } }),
    },
    avoid: {
      title: 'What to Avoid',
      fields: [
        { key: 'people', kind: 'lines', label: 'People to limit', value: fd.avoid.people },
        { key: 'habits', kind: 'lines', label: 'Habits to break', value: fd.avoid.habits },
        { key: 'environments', kind: 'lines', label: 'Environments to leave', value: fd.avoid.environments },
        { key: 'mindsets', kind: 'lines', label: 'Mindsets to manage', value: fd.avoid.mindsets },
      ],
      apply: v => onSave('foundation', { ...fd, avoid: {
        people: v.people as string[], habits: v.habits as string[],
        environments: v.environments as string[], mindsets: v.mindsets as string[],
      } }),
    },
    reminders: {
      title: 'Things I Need to Remind Myself',
      fields: [{ key: 'reminders', kind: 'lines', label: 'Reminders (one per line)', value: rd.reminders }],
      apply: v => onSave('rituals', { ...rd, reminders: v.reminders as string[] }),
    },
  }

  const active = editCard ? CARDS[editCard] : null

  return (
    <div className="space-y-5">
      {active && (
        <FoundationEditModal
          title={active.title}
          fields={active.fields}
          onSave={active.apply}
          onClose={() => setEditCard(null)}
        />
      )}

      <div className="p-6 rounded-2xl text-center relative group" style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))', border: '1px solid rgba(201,168,76,0.3)' }}>
        <EditPencil onClick={() => setEditCard('purpose')} />
        <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>Life&apos;s Purpose & Mission</p>
        <p className="text-lg leading-relaxed" style={{ fontFamily: 'var(--font-geist-sans)', fontStyle: 'italic', color: '#e8c97a', maxWidth: 700, margin: '0 auto' }}>
          &ldquo;{fd.purpose}&rdquo;
        </p>
      </div>

      <FoundCard title="Vision for My Life" icon="🔭" accent="#C9A84C" onEdit={() => setEditCard('vision')}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{fd.vision}</p>
      </FoundCard>

      <FoundCard title="Role Models" icon="👑" accent="#C9A84C" onEdit={() => setEditCard('roleModels')}>
        <div className="flex gap-3 flex-wrap mt-1">
          {fd.roleModels.map(rm => (
            <span key={rm} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#e8c97a' }}>{rm}</span>
          ))}
        </div>
      </FoundCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FoundCard title="Core Values" icon="🧭" accent="#C9A84C" onEdit={() => setEditCard('coreValues')}>
          <div className="space-y-2 mt-1">
            {fd.coreValues.map((v, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: '#C9A84C', color: '#0a0a0a' }}>{i + 1}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{v.name}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{v.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </FoundCard>
        <div className="space-y-4">
          <FoundCard title="Gratitude" icon="❤️" accent="#C9A84C" onEdit={() => setEditCard('gratitude')}>
            <div className="space-y-1.5 mt-1">
              {rd.gratitude.map((g, i) => (
                <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#C9A84C', flexShrink: 0 }}>✦</span>{g}
                </div>
              ))}
            </div>
          </FoundCard>
          <FoundCard title="Daily Affirmations" icon="⚡" accent="#4361EE" onEdit={() => setEditCard('affirmations')}>
            <div className="space-y-1 mt-1">
              {rd.affirmations.map((a, i) => (
                <div key={i} className="flex gap-2.5 text-sm px-2 py-1.5 rounded-lg" style={{ background: 'rgba(67,97,238,0.06)', borderLeft: '3px solid rgba(67,97,238,0.4)' }}>
                  <span className="text-[10px] font-bold w-4 flex-shrink-0 mt-0.5" style={{ color: '#4361EE' }}>{i + 1}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{a}</span>
                </div>
              ))}
            </div>
          </FoundCard>
        </div>
      </div>

      <FoundCard title="What I&apos;m Passionate About" icon="🔥" accent="#C9A84C" onEdit={() => setEditCard('passions')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {([['Activities That Energize Me', fd.passions.energize], ['Topics I Could Talk About for Hours', fd.passions.talkAbout], ['How I Recharge', fd.passions.recharge], ["When I Feel Most Like Myself", fd.passions.mostMyself]] as [string, string[]][]).map(([label, items]) => (
            <div key={label}>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>{label}</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map(p => <span key={p} className="px-2.5 py-1 rounded-full text-xs border" style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>{p}</span>)}
              </div>
            </div>
          ))}
        </div>
      </FoundCard>

      <FoundCard title="What to Avoid" icon="🛡️" accent="#C1121F" onEdit={() => setEditCard('avoid')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {([['People to Limit', fd.avoid.people], ['Habits to Break', fd.avoid.habits], ['Environments to Leave', fd.avoid.environments], ['Mindsets to Manage', fd.avoid.mindsets]] as [string, string[]][]).map(([label, items]) => (
            <div key={label}>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#C1121F' }}>{label}</div>
              <div className="space-y-1">{items.map((a, i) => <div key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {a}</div>)}</div>
            </div>
          ))}
        </div>
      </FoundCard>

      <FoundCard title="Things I Need to Remind Myself" icon="📌" accent="#2A9D8F" onEdit={() => setEditCard('reminders')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {rd.reminders.map((r, i) => (
            <div key={i} className="flex gap-2.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(42,157,143,0.06)', borderLeft: '3px solid rgba(42,157,143,0.4)' }}>
              <span className="text-[10px] font-bold w-4 flex-shrink-0 mt-0.5" style={{ color: '#2A9D8F' }}>{i + 1}</span>
              <span style={{ color: 'var(--text-primary)' }}>{r}</span>
            </div>
          ))}
        </div>
      </FoundCard>

      <div className="py-6 text-center rounded-2xl border" style={{ borderColor: 'rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)' }}>
        <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-geist-sans)', color: '#e8c97a', letterSpacing: '0.05em' }}>— Dream Big. Work Hard. Stay Humble. —</p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>This document is a living roadmap. Review monthly. Update as you grow.</p>
      </div>
    </div>
  )
}

function EditPencil({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Edit"
      className="absolute top-3 right-3 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-white/[0.08]"
      style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
      <Pencil size={13} strokeWidth={2} />
    </button>
  )
}

function FoundCard({ title, icon, accent, children, onEdit }: { title: string; icon: string; accent: string; children: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="p-5 rounded-2xl border relative overflow-hidden group" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: accent }} />
      {onEdit && <EditPencil onClick={onEdit} />}
      <div className="flex items-center gap-2 mb-3">
        <span>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── BACKLOG VIEW ───────────────────────────────────────────────
interface BacklogGoal {
  id: string
  title: string
  description: string | null
  section: string
  timeframe: string
  completed: boolean
  created_at: string
}

const BACKLOG_SECTION_MAP: Record<string, string> = {
  career: 'career', financial: 'finance', health: 'health',
  relationships: 'relationships', home: 'home', travel: 'fun',
  mental: 'personal-dev', learning: 'personal-dev', wellness: 'health',
  creative: 'fun', legal: 'finance', style: 'personal-dev',
  legacy: 'spiritual', family: 'family', memberships: 'memberships',
  spiritual: 'spiritual',
}

const TF_BADGE_COLORS: Record<string, string> = {
  daily: '#5ee6ff', weekly: '#1e90ff', monthly: '#7b5ea7', yearly: '#2ecc71',
}

function BacklogView({ sections, onPromote }: {
  sections: DBSection[]
  onPromote: (text: string, sectionId: string) => void
}) {
  const [goals, setGoals] = useState<BacklogGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [tfFilter, setTfFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')

  useEffect(() => {
    fetch('/api/goals?limit=200')
      .then(r => r.json())
      .then(data => {
        setGoals(Array.isArray(data) ? data : (data.goals ?? []))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function toggleGoal(id: string) {
    const g = goals.find(g => g.id === id)
    if (!g) return
    const next = !g.completed
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: next } : g))
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: next }),
    })
  }

  async function deleteGoal(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id))
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
  }

  const uniqueSections = [...new Set(goals.map(g => g.section))].sort()

  const filtered = goals.filter(g => {
    if (tfFilter !== 'all' && g.timeframe !== tfFilter) return false
    if (sectionFilter !== 'all' && g.section !== sectionFilter) return false
    return true
  })

  const grouped = filtered.reduce((acc, g) => {
    if (!acc[g.section]) acc[g.section] = []
    acc[g.section].push(g)
    return acc
  }, {} as Record<string, BacklogGoal[]>)

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: 'var(--accent-cyan)', animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-5 p-4 rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Goals from the original goal-tracking system — short-horizon tasks by timeframe.
          Use <strong style={{ color: 'var(--accent-cyan)' }}>→ Life Plan</strong> to promote any goal into your main life plan.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(tf => (
            <button key={tf} onClick={() => setTfFilter(tf)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize"
              style={{
                background: tfFilter === tf ? 'var(--accent-cyan)' : 'transparent',
                color: tfFilter === tf ? '#000' : 'var(--text-secondary)',
                borderColor: tfFilter === tf ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
              }}>
              {tf}
            </button>
          ))}
        </div>
        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
          className="ml-auto rounded-lg px-3 py-1.5 text-xs border"
          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
          <option value="all">All Sections</option>
          {uniqueSections.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          {goals.length === 0
            ? 'No backlog goals found. The original goals table may be empty.'
            : 'No goals match this filter.'}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([section, sGoals]) => (
            <div key={section}>
              <h3 className="text-xs uppercase tracking-widest mb-2 capitalize"
                style={{ color: 'var(--text-muted)' }}>
                {section} <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span> {sGoals.length}
              </h3>
              <div className="space-y-2">
                {sGoals.map(g => {
                  const badgeColor = TF_BADGE_COLORS[g.timeframe] ?? '#888'
                  return (
                    <div key={g.id}
                      className="flex flex-wrap sm:flex-nowrap items-start gap-3 p-3 rounded-xl border transition-all"
                      style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                        opacity: g.completed ? 0.5 : 1,
                      }}>
                      {/* Checkbox */}
                      <button onClick={() => toggleGoal(g.id)}
                        className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                        style={{
                          borderColor: g.completed ? '#2ecc71' : 'rgba(255,255,255,0.2)',
                          background: g.completed ? '#2ecc71' : 'transparent',
                        }}>
                        {g.completed && <span className="text-[9px] text-black font-bold">✓</span>}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0 basis-[calc(100%-2.75rem)] sm:basis-auto">
                        <p className="text-sm leading-snug"
                          style={{ color: 'var(--text-primary)', textDecoration: g.completed ? 'line-through' : 'none' }}>
                          {g.title}
                        </p>
                        {g.description && (
                          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                            {g.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto pl-8 sm:pl-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                          style={{
                            background: `${badgeColor}22`,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}44`,
                          }}>
                          {g.timeframe}
                        </span>
                        <button
                          onClick={() => onPromote(g.title, BACKLOG_SECTION_MAP[g.section] ?? 'health')}
                          className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all"
                          style={{
                            background: 'rgba(var(--accent-rgb), 0.1)',
                            color: 'var(--accent-cyan)',
                            border: '1px solid var(--glass-line)',
                          }}>
                          → Life Plan
                        </button>
                        <button onClick={() => deleteGoal(g.id)}
                          className="text-[11px] w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                          style={{ color: 'var(--text-muted)' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
