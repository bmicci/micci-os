'use client'

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import ScheduleTab from './ScheduleTab'
import SleepTab from './SleepTab'
import FitnessTab from './FitnessTab'
import ChecklistTab from './ChecklistTab'
import RulesTab from './RulesTab'
import BacklogTab from './BacklogTab'
import AgendaTab from './AgendaTab'
import BlockEditModal from './BlockEditModal'
import { DAYS, MAR19, MILESTONES, CatKey, getDaysForWeek } from '@/lib/planner-data'
import { ScheduleBlock } from '@/lib/supabase/types'
import { MergedBlock, mergeBlocks } from '@/lib/planner-utils'

// ── Types ──────────────────────────────────────────────────

type TabId = 'schedule' | 'agenda' | 'sleep' | 'fitness' | 'checklist' | 'rules' | 'backlog'

const TABS: { id: TabId; label: string }[] = [
  { id: 'schedule',  label: 'Schedule'  },
  { id: 'agenda',    label: 'Agenda'    },
  { id: 'sleep',     label: 'Sleep'     },
  { id: 'fitness',   label: 'Fitness'   },
  { id: 'checklist', label: 'Mar 19'    },
  { id: 'rules',     label: 'Rules'     },
  { id: 'backlog',   label: 'Backlog'   },
]

interface ModalState {
  open: boolean
  block: MergedBlock | null   // null = adding new
  dayDate: string
  week: number
  dayIdx: number
}

// ── Helpers ────────────────────────────────────────────────

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const URGENCY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   badge: '#ef4444', text: '#fca5a5' },
  high:     { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.30)',  badge: '#f59e0b', text: '#fcd34d' },
  medium:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)', badge: '#3b82f6', text: '#93c5fd' },
  low:      { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.20)', badge: '#6b7280', text: '#9ca3af' },
}

// ── Supabase client (anon — RLS requires authenticated session) ──

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key)
}

// ── Component ─────────────────────────────────────────────

interface Props {
  initialCompletions: string[]
  initialCustomBlocks: ScheduleBlock[]
}

export default function PlannerApp({ initialCompletions, initialCustomBlocks }: Props) {
  const [completions, setCompletions] = useState<Set<string>>(new Set(initialCompletions))
  const [customBlocks, setCustomBlocks] = useState<ScheduleBlock[]>(initialCustomBlocks)
  const [week, setWeek]     = useState(2)
  const [dayIdx, setDayIdx] = useState(5)
  const [tab, setTab]       = useState<TabId>('schedule')
  const [scheduleViewMode, setScheduleViewMode] = useState<'day' | 'week'>('day')
  const [modal, setModal] = useState<ModalState>({
    open: false, block: null, dayDate: '', week: 2, dayIdx: 0,
  })
  const [saving, setSaving] = useState(false)

  // ── Derived stats ─────────────────────────────────────────

  const wDays = getDaysForWeek(week)
  const currentDay = wDays[dayIdx] ?? wDays[0]
  const merged = currentDay
    ? mergeBlocks(currentDay, week, dayIdx, customBlocks)
    : []
  const done  = merged.filter(b => completions.has(b.completionKey)).length
  const total = merged.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const checklistDone = MAR19.filter((_, i) => completions.has(`cl-${i}`)).length

  // ── Navigate to a specific day ──

  const navigateTo = useCallback((targetWeek: number, targetDayIdx: number) => {
    setWeek(targetWeek)
    setDayIdx(targetDayIdx)
    setTab('schedule')
  }, [])

  // ── Toggle completion ────────────────────────────────────

  const toggle = useCallback((key: string) => {
    const supabase = getSupabase()
    setCompletions(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        supabase?.from('schedule_completions').delete().eq('key', key)
      } else {
        next.add(key)
        supabase?.from('schedule_completions').upsert({ key })
      }
      return next
    })
  }, [])

  // ── CRUD: Add / Edit block ────────────────────────────────

  const openAddModal = useCallback((targetWeek: number, targetDayIdx: number, dayDate: string) => {
    setModal({ open: true, block: null, dayDate, week: targetWeek, dayIdx: targetDayIdx })
  }, [])

  const openEditModal = useCallback((block: MergedBlock, dayDate: string, targetWeek: number, targetDayIdx: number) => {
    setModal({ open: true, block, dayDate, week: targetWeek, dayIdx: targetDayIdx })
  }, [])

  const closeModal = useCallback(() => {
    setModal(m => ({ ...m, open: false }))
  }, [])

  const handleSave = useCallback(async (data: { time_label: string; cat: CatKey; task: string }) => {
    setSaving(true)
    try {
      if (modal.block) {
        // Editing existing block
        const { block } = modal
        if (block.isCustom || block.isStaticOverride) {
          // Update DB row
          const res = await fetch(`/api/planner/blocks/${block.dbId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          const json = await res.json()
          if (json.block) {
            setCustomBlocks(prev => prev.map(b => b.id === block.dbId ? json.block : b))
          }
        } else {
          // Override a static block → create new DB row with static_key
          const wDays = getDaysForWeek(modal.week)
          const staticDay = wDays[modal.dayIdx]
          const staticBlockIdx = staticDay?.blocks.findIndex((_, i) => `static-${modal.week}-${modal.dayIdx}-${i}` === block.id)
          const staticKey = staticBlockIdx !== undefined && staticBlockIdx >= 0
            ? `${modal.week}-${modal.dayIdx}-${staticBlockIdx}`
            : undefined

          const res = await fetch('/api/planner/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day_date: modal.dayDate,
              week: modal.week,
              time_label: data.time_label,
              cat: data.cat,
              task: data.task,
              sort_order: block.sort_order,
              static_key: staticKey ?? null,
            }),
          })
          const json = await res.json()
          if (json.block) {
            setCustomBlocks(prev => [...prev, json.block])
          }
        }
      } else {
        // Adding new block — compute sort_order as max+100
        const wDays = getDaysForWeek(modal.week)
        const staticDay = wDays[modal.dayIdx]
        const existing = staticDay
          ? mergeBlocks(staticDay, modal.week, modal.dayIdx, customBlocks)
          : []
        const maxOrder = existing.length > 0
          ? Math.max(...existing.map(b => b.sort_order))
          : 0

        const res = await fetch('/api/planner/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day_date: modal.dayDate,
            week: modal.week,
            time_label: data.time_label,
            cat: data.cat,
            task: data.task,
            sort_order: maxOrder + 100,
            static_key: null,
          }),
        })
        const json = await res.json()
        if (json.block) {
          setCustomBlocks(prev => [...prev, json.block])
        }
      }
    } finally {
      setSaving(false)
      closeModal()
    }
  }, [modal, customBlocks, closeModal])

  // ── CRUD: Delete block ────────────────────────────────────

  const handleDelete = useCallback(async (block: MergedBlock) => {
    if (block.isCustom || block.isStaticOverride) {
      // Soft-delete DB row
      await fetch(`/api/planner/blocks/${block.dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: true }),
      })
      setCustomBlocks(prev => prev.map(b => b.id === block.dbId ? { ...b, is_deleted: true } : b))
    } else {
      // Mark static block as deleted via new DB row
      const res = await fetch('/api/planner/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_date: block.staticKey ? modal.dayDate : '',
          week: modal.week,
          time_label: block.time_label,
          cat: block.cat,
          task: block.task,
          sort_order: block.sort_order,
          static_key: block.staticKey ?? null,
          is_deleted: true,
        }),
      })
      const json = await res.json()
      if (json.block) {
        setCustomBlocks(prev => [...prev, json.block])
      }
    }
  }, [modal])

  // ── CRUD: Reorder blocks ──────────────────────────────────

  const handleReorder = useCallback(async (reordered: MergedBlock[]) => {
    // Assign new sort_order: (index + 1) * 100
    const updates = reordered.map((b, i) => ({ ...b, sort_order: (i + 1) * 100 }))

    // Update local state optimistically
    setCustomBlocks(prev => {
      const next = [...prev]
      for (const b of updates) {
        if (b.dbId) {
          const idx = next.findIndex(c => c.id === b.dbId)
          if (idx >= 0) next[idx] = { ...next[idx], sort_order: b.sort_order }
        }
      }
      return next
    })

    // Persist to DB (only blocks with dbId)
    await Promise.all(
      updates
        .filter(b => b.dbId)
        .map(b =>
          fetch(`/api/planner/blocks/${b.dbId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: b.sort_order }),
          }),
        ),
    )
  }, [])

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-body)' }}>
      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-20 border-b px-4 pb-2 pt-4"
        style={{
          background: 'linear-gradient(160deg, #151729 0%, #0c0d14 70%)',
          borderColor: 'rgba(0,212,255,0.1)',
        }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Battle Plan</h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Feb 27 – Mar 31 · March 19 JPMC Deadline
            </p>
          </div>
          {tab === 'schedule' && (
            <div className="text-right shrink-0 ml-3">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">Done</div>
              <div
                className="text-2xl font-bold"
                style={{ color: pct >= 75 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#818cf8' }}
              >
                {pct}%
              </div>
            </div>
          )}
          {tab === 'checklist' && (
            <div className="text-right shrink-0 ml-3">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">Checked</div>
              <div
                className="text-2xl font-bold"
                style={{ color: checklistDone === MAR19.length ? '#34d399' : '#fbbf24' }}
              >
                {checklistDone}/{MAR19.length}
              </div>
            </div>
          )}
        </div>

        {/* ── Milestone countdown strip ── */}
        <div className="overflow-x-auto -mx-4 px-4 mb-2 scrollbar-none">
          <div className="flex gap-1.5 min-w-max">
            {MILESTONES.map((m, i) => {
              const days = daysUntil(m.isoDate)
              const uc = URGENCY_COLORS[m.urgency]
              const canNav = m.week !== undefined && m.dayIdx !== undefined && days >= 0

              return (
                <button
                  key={i}
                  onClick={canNav ? () => navigateTo(m.week!, m.dayIdx!) : undefined}
                  className="flex items-center gap-1.5 rounded-lg border px-2 py-1 shrink-0 transition-all"
                  style={{
                    background: uc.bg,
                    borderColor: uc.border,
                    cursor: canNav ? 'pointer' : 'default',
                    opacity: days < 0 ? 0.5 : 1,
                  }}
                  title={m.note}
                >
                  <span className="text-xs leading-none">{m.icon}</span>
                  <div className="text-left">
                    <div className="text-[9px] font-semibold leading-tight" style={{ color: uc.text }}>
                      {m.shortLabel}
                    </div>
                    <div
                      className="text-[9px] font-bold leading-tight"
                      style={{ color: days < 0 ? '#6b7280' : days <= 14 ? uc.badge : uc.text }}
                    >
                      {days < 0 ? 'passed' : days === 0 ? 'TODAY' : `${days}d`}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border-none shrink-0 transition-all duration-150 whitespace-nowrap"
              style={{
                background: tab === t.id ? '#6366f1' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className={`px-4 py-4 pb-20 mx-auto transition-all ${tab === 'schedule' && scheduleViewMode === 'week' ? 'max-w-none' : 'max-w-2xl'}`}>
        {tab === 'schedule' && (
          <ScheduleTab
            week={week}
            dayIdx={dayIdx}
            completions={completions}
            customBlocks={customBlocks}
            setWeek={setWeek}
            setDayIdx={setDayIdx}
            toggle={toggle}
            onViewModeChange={setScheduleViewMode}
            onAddBlock={openAddModal}
            onEditBlock={openEditModal}
            onDeleteBlock={handleDelete}
            onReorderBlocks={handleReorder}
          />
        )}
        {tab === 'agenda'    && <AgendaTab completions={completions} toggle={toggle} />}
        {tab === 'sleep'     && <SleepTab />}
        {tab === 'fitness'   && <FitnessTab />}
        {tab === 'checklist' && <ChecklistTab completions={completions} toggle={toggle} />}
        {tab === 'rules'     && <RulesTab />}
        {tab === 'backlog'   && <BacklogTab />}
      </div>

      {/* ── Edit Modal ── */}
      {modal.open && (
        <BlockEditModal
          block={modal.block}
          dayDate={modal.dayDate}
          onSave={saving ? () => {} : handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
