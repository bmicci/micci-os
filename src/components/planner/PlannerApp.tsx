'use client'

import { useState, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import LiveScheduleTab from './LiveScheduleTab'
import ArchiveTab from './ArchiveTab'
import SleepTab from './SleepTab'
import FitnessTab from './FitnessTab'
import RulesTab from './RulesTab'
import BacklogTab from './BacklogTab'
import BlockEditModal from './BlockEditModal'
import { LIVE_TEMPLATE, LiveDay, CatKey, getCurrentWeekDates } from '@/lib/planner-data'
import { ScheduleBlock } from '@/lib/supabase/types'
import { MergedBlock, mergeLiveBlocks } from '@/lib/planner-utils'

// ── Types ──────────────────────────────────────────────────

type TabId = 'schedule' | 'sleep' | 'fitness' | 'rules' | 'backlog' | 'archive'

const TABS: { id: TabId; label: string }[] = [
  { id: 'schedule', label: 'This Week' },
  { id: 'sleep',    label: 'Sleep'     },
  { id: 'fitness',  label: 'Fitness'   },
  { id: 'rules',    label: 'Rules'     },
  { id: 'backlog',  label: 'Backlog'   },
  { id: 'archive',  label: 'Archive'   },
]

interface ModalState {
  open: boolean
  block: MergedBlock | null   // null = adding new
  day: LiveDay | null
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
  const [tab, setTab] = useState<TabId>('schedule')
  const [scheduleViewMode, setScheduleViewMode] = useState<'day' | 'week'>('day')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false, block: null, day: null })

  // ── This week, derived from today (rule: time never freezes) ──

  const weekDates = useMemo(() => getCurrentWeekDates(), [])
  const [dayIdx, setDayIdx] = useState(() => Math.max(0, weekDates.findIndex(d => d.isToday)))

  const day = weekDates[dayIdx] ?? weekDates[0]
  const merged = day ? mergeLiveBlocks(LIVE_TEMPLATE[day.dow], day.isoDate, customBlocks) : []
  const done = merged.filter(b => completions.has(b.completionKey)).length
  const total = merged.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const weekRangeLabel = `${weekDates[0]?.label ?? ''} – ${weekDates[6]?.label ?? ''}`

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

  // ── CRUD: Add / Edit block (live week only — archive is read-only) ──

  const openAddModal = useCallback((targetDay: LiveDay) => {
    setModal({ open: true, block: null, day: targetDay })
  }, [])

  const openEditModal = useCallback((block: MergedBlock, targetDay: LiveDay) => {
    setModal({ open: true, block, day: targetDay })
  }, [])

  const closeModal = useCallback(() => {
    setModal(m => ({ ...m, open: false }))
  }, [])

  const handleSave = useCallback(async (data: { time_label: string; cat: CatKey; task: string }) => {
    const targetDay = modal.day
    if (!targetDay) return
    setSaving(true)
    try {
      if (modal.block) {
        const { block } = modal
        if (block.isCustom || block.isStaticOverride) {
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
          // Override a template block → create new DB row with static_key
          const templateBlocks = LIVE_TEMPLATE[targetDay.dow]
          const staticBlockIdx = templateBlocks.findIndex((_, i) => `static-${targetDay.isoDate}-${i}` === block.id)
          const staticKey = staticBlockIdx >= 0 ? `${targetDay.isoDate}-${staticBlockIdx}` : undefined

          const res = await fetch('/api/planner/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day_date: targetDay.isoDate,
              week: 0,
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
        const existing = mergeLiveBlocks(LIVE_TEMPLATE[targetDay.dow], targetDay.isoDate, customBlocks)
        const maxOrder = existing.length > 0 ? Math.max(...existing.map(b => b.sort_order)) : 0

        const res = await fetch('/api/planner/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day_date: targetDay.isoDate,
            week: 0,
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

  const handleDelete = useCallback(async (block: MergedBlock, targetDay: LiveDay) => {
    if (block.isCustom || block.isStaticOverride) {
      await fetch(`/api/planner/blocks/${block.dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: true }),
      })
      setCustomBlocks(prev => prev.map(b => b.id === block.dbId ? { ...b, is_deleted: true } : b))
    } else {
      const res = await fetch('/api/planner/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_date: targetDay.isoDate,
          week: 0,
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
  }, [])

  // ── CRUD: Reorder blocks ──────────────────────────────────

  const handleReorder = useCallback(async (reordered: MergedBlock[]) => {
    const updates = reordered.map((b, i) => ({ ...b, sort_order: (i + 1) * 100 }))

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
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Planner</h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {tab === 'archive' ? 'Feb 27 – Mar 31, 2026 · archived' : `Week of ${weekRangeLabel}`}
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
          <LiveScheduleTab
            weekDates={weekDates}
            dayIdx={dayIdx}
            completions={completions}
            customBlocks={customBlocks}
            setDayIdx={setDayIdx}
            toggle={toggle}
            onViewModeChange={setScheduleViewMode}
            onAddBlock={openAddModal}
            onEditBlock={openEditModal}
            onDeleteBlock={handleDelete}
            onReorderBlocks={handleReorder}
          />
        )}
        {tab === 'sleep'    && <SleepTab />}
        {tab === 'fitness'  && <FitnessTab />}
        {tab === 'rules'    && <RulesTab />}
        {tab === 'backlog'  && <BacklogTab />}
        {tab === 'archive'  && (
          <ArchiveTab completions={completions} customBlocks={customBlocks} toggle={toggle} />
        )}
      </div>

      {/* ── Edit Modal ── */}
      {modal.open && modal.day && (
        <BlockEditModal
          block={modal.block}
          dayDate={modal.day.label}
          onSave={saving ? () => {} : handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
