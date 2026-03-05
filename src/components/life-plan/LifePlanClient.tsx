'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  SECTIONS, FOUNDATION_DATA, RITUALS_DATA,
  goalKey, funGoalKey, countSectionGoals,
  type Section,
} from '@/lib/life-plan-data'
import AddGoalModal from './AddGoalModal'

// ── Types ──────────────────────────────────────────────────────
interface GoalState { goal_key: string; completed: boolean }
interface CustomGoal {
  id: string
  section_id: string
  timeframe: string
  category_header: string | null
  goal_text: string
  completed: boolean
  ai_generated: boolean
}
type View = 'foundation' | 'goals' | 'timeline' | 'vision'

interface Props {
  initialGoalStates: GoalState[]
  initialCustomGoals: CustomGoal[]
}

// ── Helpers ────────────────────────────────────────────────────
function pct(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

// ── Main Component ─────────────────────────────────────────────
export default function LifePlanClient({ initialGoalStates, initialCustomGoals }: Props) {
  const [activeSection, setActiveSection] = useState('health')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeView, setActiveView] = useState<View>('goals')
  const [searchQuery, setSearchQuery] = useState('')
  const [goalStates, setGoalStates] = useState<Record<string, boolean>>(
    Object.fromEntries(initialGoalStates.filter(s => s.completed).map(s => [s.goal_key, true]))
  )
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>(initialCustomGoals)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTarget, setAddTarget] = useState<{ sectionId: string; timeframe: string; categoryHeader: string | null } | null>(null)
  const [editingGoal, setEditingGoal] = useState<CustomGoal | null>(null)
  const [editText, setEditText] = useState('')

  // ── Goal state toggle (hardcoded goals) ─────────────────────
  const toggleGoal = useCallback(async (key: string) => {
    const next = !goalStates[key]
    setGoalStates(prev => ({ ...prev, [key]: next }))
    try {
      await fetch('/api/life-plan/goal-states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_key: key, completed: next }),
      })
    } catch {
      setGoalStates(prev => ({ ...prev, [key]: !next }))
    }
  }, [goalStates])

  // ── Custom goal toggle ───────────────────────────────────────
  const toggleCustomGoal = useCallback(async (id: string) => {
    const goal = customGoals.find(g => g.id === id)
    if (!goal) return
    const next = !goal.completed
    setCustomGoals(prev => prev.map(g => g.id === id ? { ...g, completed: next } : g))
    try {
      await fetch(`/api/life-plan/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: next }),
      })
    } catch {
      setCustomGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !next } : g))
    }
  }, [customGoals])

  // ── Custom goal delete ───────────────────────────────────────
  const deleteCustomGoal = useCallback(async (id: string) => {
    setCustomGoals(prev => prev.filter(g => g.id !== id))
    try {
      await fetch(`/api/life-plan/goals/${id}`, { method: 'DELETE' })
    } catch {
      // restore on failure
    }
  }, [])

  // ── Custom goal edit save ────────────────────────────────────
  const saveEditGoal = useCallback(async () => {
    if (!editingGoal || !editText.trim()) return
    const text = editText.trim()
    setCustomGoals(prev => prev.map(g => g.id === editingGoal.id ? { ...g, goal_text: text } : g))
    setEditingGoal(null)
    await fetch(`/api/life-plan/goals/${editingGoal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_text: text }),
    })
  }, [editingGoal, editText])

  // ── Add goal ─────────────────────────────────────────────────
  const handleAddGoal = useCallback(async (sectionId: string, timeframe: string, categoryHeader: string | null, goalText: string, aiGenerated: boolean) => {
    const res = await fetch('/api/life-plan/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: sectionId, timeframe, category_header: categoryHeader, goal_text: goalText, ai_generated: aiGenerated }),
    })
    if (!res.ok) throw new Error('Failed to add goal')
    const newGoal = await res.json()
    setCustomGoals(prev => [...prev, newGoal])
  }, [])

  // ── Section counts ───────────────────────────────────────────
  const sectionStats = useMemo(() => {
    return SECTIONS.reduce<Record<string, { total: number; done: number }>>((acc, s) => {
      if (s.isVision) { acc[s.id] = { total: 0, done: 0 }; return acc }
      let total = 0, done = 0
      if (s.timeframes) {
        Object.entries(s.timeframes).forEach(([tf, tfData]) => {
          tfData.categories.forEach((cat, ci) => {
            cat.goals.forEach((_, gi) => {
              total++
              if (goalStates[goalKey(s.id, tf, ci, gi)]) done++
            })
          })
        })
      }
      if (s.pinned) {
        s.pinned.forEach((p, pi) => {
          p.goals.forEach((_, gi) => {
            total++
            if (goalStates[funGoalKey(`pinned-${pi}`, 0, gi)]) done++
          })
        })
      }
      if (s.allAges) {
        s.allAges.forEach((aa, ai) => {
          if (aa.goals) aa.goals.forEach((_, gi) => { total++; if (goalStates[funGoalKey(`aa-${ai}`, 0, gi)]) done++ })
          if (aa.subcategories) aa.subcategories.forEach((sub, si) => {
            sub.goals.forEach((_, gi) => { total++; if (goalStates[funGoalKey(`aa-${ai}-${si}`, 0, gi)]) done++ })
          })
        })
      }
      // custom goals
      customGoals.filter(cg => cg.section_id === s.id).forEach(cg => { total++; if (cg.completed) done++ })
      acc[s.id] = { total, done }
      return acc
    }, {})
  }, [goalStates, customGoals])

  const totalStats = useMemo(() => {
    return Object.values(sectionStats).reduce((acc, s) => ({ total: acc.total + s.total, done: acc.done + s.done }), { total: 0, done: 0 })
  }, [sectionStats])

  const currentSection = SECTIONS.find(s => s.id === activeSection)

  function openAdd(sectionId: string, timeframe: string, categoryHeader: string | null) {
    setAddTarget({ sectionId, timeframe, categoryHeader })
    setShowAddModal(true)
  }

  // ── RENDERS ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', minHeight: '80vh' }}>

      {/* ── INNER SIDEBAR (Goals view only) ─────────────────── */}
      {activeView === 'goals' && (
        <div style={{ width: 200, flexShrink: 0, position: 'sticky', top: 24 }}>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            {SECTIONS.filter(s => !s.isVision).map(s => {
              const stats = sectionStats[s.id]
              const isActive = activeSection === s.id
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2 transition-all hover:bg-white/5"
                  style={{ background: isActive ? `${s.colorHex}18` : 'transparent', borderLeft: `3px solid ${isActive ? s.colorHex : 'transparent'}` }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.colorHex }} />
                  <span className="text-xs flex-1 leading-tight" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400 }}>{s.name}</span>
                  {stats && stats.total > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                      {stats.done}/{stats.total}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Overall progress */}
          <div className="mt-3 p-3 rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              <span>Overall</span>
              <span>{pct(totalStats.done, totalStats.total)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct(totalStats.done, totalStats.total)}%`, background: 'linear-gradient(90deg, #00d4ff, #1e90ff)' }} />
            </div>
            <div className="flex justify-between text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              <span>{totalStats.done} done</span>
              <span>{totalStats.total - totalStats.done} left</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Top nav */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
            {([['foundation', '🧭 Foundation'], ['goals', '🎯 Goals'], ['timeline', '📅 Timeline'], ['vision', '🌟 Vision Board']] as [View, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setActiveView(v)}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{ background: activeView === v ? 'var(--accent-cyan)' : 'transparent', color: activeView === v ? '#000' : 'var(--text-secondary)' }}>
                {label}
              </button>
            ))}
          </div>

          {activeView === 'goals' && (
            <div className="flex gap-1.5 flex-wrap">
              {([['all', 'All Ages'], ['40', 'Age 40'], ['45', 'Age 45'], ['50', 'Age 50'], ['60', 'Age 60']] as [string, string][]).map(([f, label]) => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{ background: activeFilter === f ? 'var(--accent-cyan)' : 'transparent', color: activeFilter === f ? '#000' : 'var(--text-secondary)', borderColor: activeFilter === f ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)' }}>
                  {label}
                </button>
              ))}
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="px-3 py-1.5 rounded-full text-xs border"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: 120 }}
              />
            </div>
          )}

          {activeView === 'goals' && (
            <button onClick={() => { setAddTarget(null); setShowAddModal(true) }}
              className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--accent-cyan)', color: '#000' }}>
              + Add Goal
            </button>
          )}
        </div>

        {/* ── FOUNDATION VIEW ──────────────────────────────── */}
        {activeView === 'foundation' && <FoundationView />}

        {/* ── GOALS VIEW ───────────────────────────────────── */}
        {activeView === 'goals' && currentSection && (
          <GoalsSectionView
            section={currentSection}
            activeFilter={activeFilter}
            searchQuery={searchQuery}
            goalStates={goalStates}
            customGoals={customGoals.filter(cg => cg.section_id === currentSection.id)}
            stats={sectionStats[currentSection.id]}
            onToggle={toggleGoal}
            onToggleCustom={toggleCustomGoal}
            onDeleteCustom={deleteCustomGoal}
            onEditCustom={(goal) => { setEditingGoal(goal); setEditText(goal.goal_text) }}
            editingGoal={editingGoal}
            editText={editText}
            setEditText={setEditText}
            onSaveEdit={saveEditGoal}
            onCancelEdit={() => setEditingGoal(null)}
            onAddGoal={openAdd}
          />
        )}

        {/* ── TIMELINE VIEW ────────────────────────────────── */}
        {activeView === 'timeline' && (
          <TimelineView goalStates={goalStates} onToggle={toggleGoal} />
        )}

        {/* ── VISION BOARD ─────────────────────────────────── */}
        {activeView === 'vision' && <VisionView />}
      </div>

      {/* ── ADD GOAL MODAL ───────────────────────────────────── */}
      {showAddModal && (
        <AddGoalModal
          sections={SECTIONS}
          defaultSection={addTarget?.sectionId ?? activeSection}
          defaultTimeframe={addTarget?.timeframe ?? '40'}
          defaultCategory={addTarget?.categoryHeader ?? null}
          onAdd={handleAddGoal}
          onClose={() => { setShowAddModal(false); setAddTarget(null) }}
        />
      )}
    </div>
  )
}

// ── GOAL ITEM COMPONENT ───────────────────────────────────────
function GoalItem({ text, checked, onToggle, onEdit, onDelete, isCustom, aiGenerated, isEditing, editText, setEditText, onSaveEdit, onCancelEdit, searchQuery }: {
  text: string; checked: boolean; onToggle: () => void; onEdit?: () => void; onDelete?: () => void
  isCustom?: boolean; aiGenerated?: boolean; isEditing?: boolean; editText?: string
  setEditText?: (t: string) => void; onSaveEdit?: () => void; onCancelEdit?: () => void; searchQuery?: string
}) {
  const highlight = searchQuery && text.toLowerCase().includes(searchQuery.toLowerCase())
  const dim = searchQuery && !highlight

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2 rounded-lg transition-all group ${highlight ? 'ring-1' : ''}`}
      style={{ opacity: dim ? 0.2 : 1, background: highlight ? 'rgba(0,212,255,0.06)' : 'transparent', outline: highlight ? '1px solid rgba(0,212,255,0.3)' : 'none' }}>
      {/* Checkbox */}
      <button onClick={onToggle}
        className="mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all"
        style={{ borderColor: checked ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)', background: checked ? 'var(--accent-cyan)' : 'transparent' }}>
        {checked && <span style={{ color: '#000', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </button>

      {/* Text / Edit */}
      {isEditing ? (
        <div className="flex-1 flex gap-2">
          <input value={editText} onChange={e => setEditText?.(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit?.(); if (e.key === 'Escape') onCancelEdit?.() }}
            className="flex-1 text-sm rounded px-2 py-0.5 border"
            style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'var(--accent-cyan)', color: 'var(--text-primary)' }}
            autoFocus />
          <button onClick={onSaveEdit} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-cyan)', color: '#000' }}>Save</button>
          <button onClick={onCancelEdit} className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>Cancel</button>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <span className="text-sm leading-relaxed" style={{ color: checked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked ? 'line-through' : 'none' }}>
            {text}
          </span>
          {aiGenerated && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}>AI</span>}
        </div>
      )}

      {/* Actions (custom goals only) */}
      {isCustom && !isEditing && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onEdit && <button onClick={onEdit} className="text-[11px] px-1.5 py-0.5 rounded transition-colors" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}>Edit</button>}
          {onDelete && <button onClick={onDelete} className="text-[11px] px-1.5 py-0.5 rounded transition-colors" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>✕</button>}
        </div>
      )}
    </div>
  )
}

// ── GOALS SECTION VIEW ────────────────────────────────────────
function GoalsSectionView({ section, activeFilter, searchQuery, goalStates, customGoals, stats, onToggle, onToggleCustom, onDeleteCustom, onEditCustom, editingGoal, editText, setEditText, onSaveEdit, onCancelEdit, onAddGoal }: {
  section: Section; activeFilter: string; searchQuery: string
  goalStates: Record<string, boolean>; customGoals: CustomGoal[]
  stats: { total: number; done: number }
  onToggle: (key: string) => void; onToggleCustom: (id: string) => void
  onDeleteCustom: (id: string) => void; onEditCustom: (g: CustomGoal) => void
  editingGoal: CustomGoal | null; editText: string; setEditText: (t: string) => void
  onSaveEdit: () => void; onCancelEdit: () => void
  onAddGoal: (sectionId: string, tf: string, cat: string | null) => void
}) {
  if (section.isVision) return <VisionView />

  return (
    <div>
      {/* Section header */}
      <div className="mb-4 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <h2 className="text-2xl font-bold mb-1" style={{ color: section.colorHex, fontFamily: 'var(--font-geist-sans)' }}>{section.name}</h2>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', maxWidth: 200 }}>
            <div className="h-full rounded-full" style={{ width: `${pct(stats.done, stats.total)}%`, background: section.colorHex }} />
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats.done}/{stats.total} goals · {pct(stats.done, stats.total)}%</span>
        </div>
      </div>

      {/* Pinned (fun section) */}
      {section.pinned?.map((p, pi) => (
        <TimeframeBlock key={pi} label={`★ ${p.label}`} colorHex={section.colorHex} show>
          {p.goals.map((g, gi) => {
            const key = funGoalKey(`pinned-${pi}`, 0, gi)
            return <GoalItem key={gi} text={g} checked={!!goalStates[key]} onToggle={() => onToggle(key)} searchQuery={searchQuery} />
          })}
          <AddBtn onClick={() => onAddGoal(section.id, 'pinned', null)} />
        </TimeframeBlock>
      ))}

      {/* All Ages (fun section) */}
      {section.allAges?.map((aa, ai) => (
        <TimeframeBlock key={ai} label={`∞ ALL AGES — ${aa.label}`} colorHex={section.colorHex} show>
          {aa.items?.map((item, i) => (
            <div key={i} className="px-3 py-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>• {item}</div>
          ))}
          {aa.subcategories?.map((sub, si) => (
            <div key={si}>
              <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: section.colorHex }}>{sub.header}</div>
              {sub.goals.map((g, gi) => {
                const key = funGoalKey(`aa-${ai}-${si}`, 0, gi)
                return <GoalItem key={gi} text={g} checked={!!goalStates[key]} onToggle={() => onToggle(key)} searchQuery={searchQuery} />
              })}
            </div>
          ))}
          {aa.goals?.map((g, gi) => {
            const key = funGoalKey(`aa-${ai}`, 0, gi)
            return <GoalItem key={gi} text={g} checked={!!goalStates[key]} onToggle={() => onToggle(key)} searchQuery={searchQuery} />
          })}
        </TimeframeBlock>
      ))}

      {/* Timeframes */}
      {section.timeframes && (['40', '45', '50', '60'] as const).map(tf => {
        const tfData = section.timeframes![tf]
        if (!tfData) return null
        if (activeFilter !== 'all' && activeFilter !== tf) return null

        const tfCustom = customGoals.filter(cg => cg.timeframe === tf)
        const tfTotal = tfData.categories.reduce((s, c) => s + c.goals.length, 0) + tfCustom.length
        const tfDone = tfData.categories.reduce((s, c, ci) => s + c.goals.filter((_, gi) => goalStates[goalKey(section.id, tf, ci, gi)]).length, 0) + tfCustom.filter(cg => cg.completed).length

        return (
          <TimeframeBlock key={tf} label={tfData.label} colorHex={section.colorHex} show count={`${tfDone}/${tfTotal}`} countPct={pct(tfDone, tfTotal)}>
            {tfData.categories.map((cat, ci) => (
              <div key={ci}>
                {cat.header && <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: section.colorHex }}>{cat.header}</div>}
                {cat.goals.map((g, gi) => {
                  const key = goalKey(section.id, tf, ci, gi)
                  return <GoalItem key={gi} text={g} checked={!!goalStates[key]} onToggle={() => onToggle(key)} searchQuery={searchQuery} />
                })}
              </div>
            ))}
            {/* Custom goals for this timeframe */}
            {tfCustom.length > 0 && (
              <div>
                <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-cyan)' }}>Custom Goals</div>
                {tfCustom.map(cg => (
                  <GoalItem key={cg.id} text={cg.goal_text} checked={cg.completed}
                    onToggle={() => onToggleCustom(cg.id)}
                    onEdit={() => onEditCustom(cg)}
                    onDelete={() => onDeleteCustom(cg.id)}
                    isCustom aiGenerated={cg.ai_generated}
                    isEditing={editingGoal?.id === cg.id}
                    editText={editText} setEditText={setEditText}
                    onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            )}
            <AddBtn onClick={() => onAddGoal(section.id, tf, null)} />
          </TimeframeBlock>
        )
      })}
    </div>
  )
}

// ── TIMEFRAME COLLAPSIBLE BLOCK ───────────────────────────────
function TimeframeBlock({ label, colorHex, children, show, count, countPct }: {
  label: string; colorHex: string; children: React.ReactNode; show: boolean; count?: string; countPct?: number
}) {
  const [collapsed, setCollapsed] = useState(!show)
  return (
    <div className="mb-3 rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <button onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]">
        <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-geist-sans)', color: 'var(--text-primary)' }}>{label}</span>
        <div className="flex items-center gap-3">
          {count && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count}</span>
              <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${countPct ?? 0}%`, background: colorHex }} />
              </div>
            </div>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: 12, transform: collapsed ? 'rotate(-90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
        </div>
      </button>
      {!collapsed && <div className="pb-2">{children}</div>}
    </div>
  )
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="mx-3 mt-1 mb-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all hover:bg-white/5"
      style={{ color: 'var(--text-muted)', borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed' }}>
      + Add goal
    </button>
  )
}

// ── TIMELINE VIEW ─────────────────────────────────────────────
function TimelineView({ goalStates, onToggle }: { goalStates: Record<string, boolean>; onToggle: (k: string) => void }) {
  const goalSections = SECTIONS.filter(s => !s.isVision && s.timeframes)
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 20 }}>
      <table style={{ minWidth: 900, borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-widest px-3 py-3" style={{ color: 'var(--text-muted)', width: 160, background: 'var(--card-bg)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Life Area</th>
            {(['40', '45', '50', '60'] as const).map(tf => (
              <th key={tf} className="text-left text-xs font-semibold px-3 py-3" style={{ color: 'var(--text-primary)', background: tf === '40' ? 'rgba(0,212,255,0.06)' : 'var(--card-bg)', borderBottom: tf === '40' ? '2px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.06)' }}>
                Age {tf} {tf === '40' ? '↗ Now' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {goalSections.map(s => (
            <tr key={s.id}>
              <td className="px-3 py-2 text-xs font-semibold" style={{ color: s.colorHex, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                {s.name}
              </td>
              {(['40', '45', '50', '60'] as const).map(tf => {
                const tfData = s.timeframes?.[tf]
                return (
                  <td key={tf} className="px-2 py-1.5" style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                    {tfData?.categories.map((cat, ci) =>
                      cat.goals.slice(0, 3).map((g, gi) => {
                        const key = goalKey(s.id, tf, ci, gi)
                        const done = !!goalStates[key]
                        return (
                          <div key={`${ci}-${gi}`}
                            onClick={() => onToggle(key)}
                            className="mb-1 px-2 py-1 rounded text-[11px] cursor-pointer transition-all hover:opacity-90"
                            style={{ background: `${s.colorHex}18`, color: done ? 'var(--text-muted)' : s.colorHex, textDecoration: done ? 'line-through' : 'none', borderLeft: `3px solid ${s.colorHex}`, lineHeight: 1.3 }}>
                            {g.length > 45 ? g.slice(0, 43) + '…' : g}
                          </div>
                        )
                      })
                    )}
                    {(tfData?.categories.reduce((n, c) => n + c.goals.length, 0) ?? 0) > 3 && (
                      <div className="text-[10px] px-2" style={{ color: 'var(--text-muted)' }}>
                        +{(tfData!.categories.reduce((n, c) => n + c.goals.length, 0)) - 3} more…
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── VISION VIEW ───────────────────────────────────────────────
function VisionView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border"
      style={{ background: 'var(--card-bg)', borderColor: 'rgba(201,168,76,0.3)', minHeight: 400 }}>
      <div className="text-6xl mb-4">🌟</div>
      <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-geist-sans)', color: '#e8c97a' }}>Vision Board</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>
        A visual representation of the life being built. Upload images, aspirational visuals, and tangible manifestations of every goal above.
      </p>
      <div className="border-t border-dashed pt-6 w-full max-w-md" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#c9a84c', letterSpacing: '0.15em' }}>Coming Soon — Phase 2</p>
      </div>
    </div>
  )
}

// ── FOUNDATION VIEW ───────────────────────────────────────────
function FoundationView() {
  const fd = FOUNDATION_DATA
  const rd = RITUALS_DATA

  return (
    <div className="space-y-5">
      {/* Purpose banner */}
      <div className="p-6 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))', border: '1px solid rgba(201,168,76,0.3)' }}>
        <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>Life&apos;s Purpose & Mission</p>
        <p className="text-lg leading-relaxed" style={{ fontFamily: 'var(--font-geist-sans)', fontStyle: 'italic', color: '#e8c97a', maxWidth: 700, margin: '0 auto' }}>
          &ldquo;{fd.purpose}&rdquo;
        </p>
      </div>

      {/* Vision */}
      <FoundCard title="Vision for My Life" icon="🔭" accent="#C9A84C">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{fd.vision}</p>
      </FoundCard>

      {/* Role Models */}
      <FoundCard title="Role Models" icon="👑" accent="#C9A84C">
        <div className="flex gap-3 flex-wrap mt-1">
          {fd.roleModels.map(rm => (
            <span key={rm} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#e8c97a' }}>{rm}</span>
          ))}
        </div>
      </FoundCard>

      {/* Two columns: Core Values + Gratitude */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FoundCard title="Core Values" icon="🧭" accent="#C9A84C">
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
          <FoundCard title="Gratitude" icon="❤️" accent="#C9A84C">
            <div className="space-y-1.5 mt-1">
              {rd.gratitude.map((g, i) => (
                <div key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#C9A84C', flexShrink: 0 }}>✦</span>{g}
                </div>
              ))}
            </div>
          </FoundCard>

          <FoundCard title="Daily Affirmations" icon="⚡" accent="#4361EE">
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

      {/* Passions */}
      <FoundCard title="What I&apos;m Passionate About" icon="🔥" accent="#C9A84C">
        <div className="grid grid-cols-2 gap-4 mt-2">
          {([['Activities That Energize Me', fd.passions.energize], ['Topics I Could Talk About for Hours', fd.passions.talkAbout], ['How I Recharge', fd.passions.recharge], ["When I Feel Most Like Myself", fd.passions.mostMyself]] as [string, string[]][]).map(([label, items]) => (
            <div key={label}>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>{label}</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map(p => (
                  <span key={p} className="px-2.5 py-1 rounded-full text-xs border" style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FoundCard>

      {/* What to Avoid */}
      <FoundCard title="What to Avoid" icon="🛡️" accent="#C1121F">
        <div className="grid grid-cols-2 gap-4 mt-2">
          {([['People to Limit', fd.avoid.people], ['Habits to Break', fd.avoid.habits], ['Environments to Leave', fd.avoid.environments], ['Mindsets to Manage', fd.avoid.mindsets]] as [string, string[]][]).map(([label, items]) => (
            <div key={label}>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#C1121F' }}>{label}</div>
              <div className="space-y-1">
                {items.map((a, i) => <div key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {a}</div>)}
              </div>
            </div>
          ))}
        </div>
      </FoundCard>

      {/* Reminders */}
      <FoundCard title="Things I Need to Remind Myself" icon="📌" accent="#2A9D8F">
        <div className="grid grid-cols-2 gap-2 mt-1">
          {rd.reminders.map((r, i) => (
            <div key={i} className="flex gap-2.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(42,157,143,0.06)', borderLeft: '3px solid rgba(42,157,143,0.4)' }}>
              <span className="text-[10px] font-bold w-4 flex-shrink-0 mt-0.5" style={{ color: '#2A9D8F' }}>{i + 1}</span>
              <span style={{ color: 'var(--text-primary)' }}>{r}</span>
            </div>
          ))}
        </div>
      </FoundCard>

      {/* Motto */}
      <div className="py-6 text-center rounded-2xl border" style={{ borderColor: 'rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)' }}>
        <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-geist-sans)', color: '#e8c97a', letterSpacing: '0.05em' }}>— Dream Big. Work Hard. Stay Humble. —</p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>This document is a living roadmap. Review monthly. Update as you grow.</p>
      </div>
    </div>
  )
}

function FoundCard({ title, icon, accent, children }: { title: string; icon: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl border relative overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: accent }} />
      <div className="flex items-center gap-2 mb-3">
        <span>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}
