'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DAYS, WEEK_LABELS, getDaysForWeek, CAT, CC } from '@/lib/planner-data'
import { ScheduleBlock } from '@/lib/supabase/types'
import { MergedBlock, mergeBlocks } from '@/lib/planner-utils'

// ── Sortable block row ────────────────────────────────────

interface BlockRowProps {
  block: MergedBlock
  completionKey: string
  checked: boolean
  editMode: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

function SortableBlockRow({ block, completionKey, checked, editMode, onToggle, onEdit, onDelete }: BlockRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !editMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : checked ? 0.55 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const color = CC[block.cat]

  const rowStyle = {
    ...style,
    background: checked ? 'rgba(15,26,15,0.6)' : '#13141e',
    borderColor: editMode && block.isCustom
      ? 'rgba(99,102,241,0.3)'
      : checked
      ? 'rgba(52,211,153,0.25)'
      : '#1e2030',
  }

  return (
    <div
      ref={setNodeRef}
      style={rowStyle}
      className="w-full flex gap-2 rounded-xl border px-3 py-2.5 items-stretch transition-colors duration-150"
    >
      {/* Drag handle — only in edit mode */}
      {editMode && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center pr-1 cursor-grab active:cursor-grabbing"
          style={{ color: 'rgba(255,255,255,0.2)', touchAction: 'none' }}
        >
          ⠿
        </div>
      )}

      {/* Time */}
      <div className="w-14 shrink-0 pt-0.5">
        <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">{block.time_label}</span>
      </div>

      {/* Content — click to toggle in view mode */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={editMode ? undefined : onToggle}
        style={{ cursor: editMode ? 'default' : 'pointer' }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm leading-none">{CAT[block.cat].icon}</span>
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color }}>
            {CAT[block.cat].label}
          </span>
          {block.isCustom && (
            <span className="text-[8px] px-1 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
              custom
            </span>
          )}
        </div>
        <div
          className="text-xs leading-snug"
          style={{
            color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: !editMode && checked ? 'line-through' : 'none',
          }}
        >
          {block.task}
        </div>
      </button>

      {/* Edit mode: edit + delete buttons */}
      {editMode && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
            title="Edit"
          >
            ✏
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
            title="Delete"
          >
            ✕
          </button>
        </div>
      )}

      {/* View mode: checkbox */}
      {!editMode && (
        <button onClick={onToggle} className="shrink-0 self-center">
          <div
            className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
            style={{
              borderColor: checked ? '#34d399' : 'rgba(255,255,255,0.12)',
              background: checked ? 'rgba(20,83,45,0.6)' : 'transparent',
            }}
          >
            {checked && <span className="text-[10px] text-emerald-400">✓</span>}
          </div>
        </button>
      )}
    </div>
  )
}

// ── Main ScheduleTab ──────────────────────────────────────

interface Props {
  week: number
  dayIdx: number
  completions: Set<string>
  customBlocks: ScheduleBlock[]
  setWeek: (w: number) => void
  setDayIdx: (i: number) => void
  toggle: (key: string) => void
  onViewModeChange?: (mode: 'day' | 'week') => void
  onAddBlock: (week: number, dayIdx: number, dayDate: string) => void
  onEditBlock: (block: MergedBlock, dayDate: string, week: number, dayIdx: number) => void
  onDeleteBlock: (block: MergedBlock) => void
  onReorderBlocks: (reordered: MergedBlock[]) => void
}

export default function ScheduleTab({
  week, dayIdx, completions, customBlocks,
  setWeek, setDayIdx, toggle, onViewModeChange,
  onAddBlock, onEditBlock, onDeleteBlock, onReorderBlocks,
}: Props) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [editMode, setEditMode] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function changeViewMode(mode: 'day' | 'week') {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }

  const wDays = getDaysForWeek(week)
  const day = wDays[dayIdx] ?? wDays[0]

  const merged = day ? mergeBlocks(day, week, dayIdx, customBlocks) : []
  const done = merged.filter(b => completions.has(b.completionKey)).length
  const pct = merged.length ? Math.round((done / merged.length) * 100) : 0

  const isJpmc = day?.tag.includes('JPMC') ?? false
  const isDeadline = day?.tag.includes('Deadline') || day?.tag.includes('Days to')

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = merged.findIndex(b => b.id === active.id)
    const newIdx = merged.findIndex(b => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(merged, oldIdx, newIdx)
    onReorderBlocks(reordered)
  }

  return (
    <div className="space-y-4">
      {/* Week nav + view toggle + edit toggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 flex-wrap flex-1">
          {([1, 2, 3, 4, 5] as const).map((w) => (
            <button
              key={w}
              onClick={() => { setWeek(w); setDayIdx(0) }}
              className="px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all duration-150 whitespace-nowrap"
              style={{
                background: week === w ? (w === 4 ? '#dc2626' : '#1e3a5f') : 'var(--card-bg)',
                borderColor: week === w ? (w === 4 ? '#ef4444' : 'var(--accent-blue)') : 'var(--card-border)',
                color: week === w ? '#fff' : 'var(--text-muted)',
              }}
            >
              {WEEK_LABELS[w]}
            </button>
          ))}
        </div>
        {/* Edit mode toggle */}
        <button
          onClick={() => setEditMode(e => !e)}
          className="shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all duration-150"
          style={{
            background: editMode ? 'rgba(99,102,241,0.25)' : 'var(--card-bg)',
            borderColor: editMode ? '#6366f1' : 'var(--card-border)',
            color: editMode ? '#818cf8' : 'var(--text-muted)',
          }}
          title={editMode ? 'Exit edit mode' : 'Edit schedule'}
        >
          {editMode ? '✓ Done' : '✏ Edit'}
        </button>
        {/* Day / Week toggle */}
        <button
          onClick={() => changeViewMode(viewMode === 'day' ? 'week' : 'day')}
          className="shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all duration-150"
          style={{
            background: viewMode === 'week' ? 'rgba(99,102,241,0.25)' : 'var(--card-bg)',
            borderColor: viewMode === 'week' ? '#6366f1' : 'var(--card-border)',
            color: viewMode === 'week' ? '#818cf8' : 'var(--text-muted)',
          }}
        >
          {viewMode === 'day' ? '⊞ Week' : '☰ Day'}
        </button>
      </div>

      {/* ── WEEK GRID VIEW ── */}
      {viewMode === 'week' && (
        <div>
          <p className="text-[10px] text-[var(--text-muted)] mb-2">
            Tap a day to switch to Day view
          </p>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 pb-2">
              {wDays.map((d, i) => {
                const dayMerged = mergeBlocks(d, week, i, customBlocks)
                const dd = dayMerged.filter(b => completions.has(b.completionKey)).length
                const dp = dayMerged.length ? Math.round((dd / dayMerged.length) * 100) : 0
                const parts = d.date.split(', ')
                const isSelected = dayIdx === i
                const isJpmcDay = d.date.includes('Mar 19')

                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[80px] flex flex-col rounded-xl border overflow-hidden"
                    style={{
                      background: isSelected ? '#1a1f35' : 'var(--card-bg)',
                      borderColor: isJpmcDay
                        ? '#ef4444'
                        : isSelected
                        ? 'var(--accent-cyan)'
                        : 'var(--card-border)',
                    }}
                  >
                    <button
                      onClick={() => { setDayIdx(i); changeViewMode('day') }}
                      className="px-2 pt-2 pb-1.5 text-left w-full border-b"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="text-[10px] font-bold text-[var(--text-primary)]">{parts[0]}</div>
                      <div className="text-[9px] text-[var(--text-muted)]">{parts[1]}</div>
                      {isJpmcDay && (
                        <div className="text-[8px] font-bold text-red-400 mt-0.5">🔴 JPMC</div>
                      )}
                      <div className="mt-1.5 h-0.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${dp}%`,
                            background: dp >= 100 ? '#34d399' : dp >= 50 ? '#818cf8' : 'var(--accent-cyan)',
                          }}
                        />
                      </div>
                      <div className="text-[8px] text-[var(--text-muted)] mt-0.5">{dp}% done</div>
                    </button>

                    <div className="px-1.5 py-1.5 flex flex-col gap-0.5 max-h-72 overflow-y-auto">
                      {dayMerged.map((b) => {
                        const checked = completions.has(b.completionKey)
                        return (
                          <div
                            key={b.id}
                            className="rounded px-1 py-0.5 text-[8px] leading-snug"
                            style={{
                              background: checked
                                ? 'rgba(52,211,153,0.08)'
                                : `${CC[b.cat]}18`,
                              color: checked ? '#34d399' : CC[b.cat],
                              opacity: checked ? 0.5 : 1,
                              textDecoration: checked ? 'line-through' : 'none',
                            }}
                          >
                            {CAT[b.cat].icon}{' '}
                            {b.task.length > 22 ? b.task.slice(0, 22) + '…' : b.task}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {viewMode === 'day' && day && (
        <>
          {/* Day nav */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {wDays.map((d, i) => {
              const dayMerged = mergeBlocks(d, week, i, customBlocks)
              const dd = dayMerged.filter(b => completions.has(b.completionKey)).length
              const dp = dayMerged.length ? Math.round((dd / dayMerged.length) * 100) : 0
              const parts = d.date.split(', ')
              return (
                <button
                  key={i}
                  onClick={() => setDayIdx(i)}
                  className="flex flex-col items-center px-3 py-2 rounded-lg border text-center shrink-0 min-w-[52px] transition-all duration-150"
                  style={{
                    background: dayIdx === i ? '#1a1f35' : 'transparent',
                    borderColor: dayIdx === i ? 'var(--card-border)' : 'transparent',
                    color: dayIdx === i ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <span className="text-[10px] font-bold">{parts[0]}</span>
                  <span className="text-[9px] font-normal">{parts[1]}</span>
                  {dp > 0 && (
                    <div
                      className="w-1 h-1 rounded-full mt-1"
                      style={{ background: dp >= 100 ? '#34d399' : '#818cf8' }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Day header */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-base font-bold text-[var(--text-primary)]">{day.date}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  background: isJpmc ? '#dc2626' : isDeadline ? '#92400e' : '#312e81',
                  color: '#fff',
                }}
              >
                {day.tag}
              </span>
              {editMode && (
                <span
                  className="text-[9px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                >
                  Edit Mode
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] italic mb-2">{day.theme}</p>

            <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: pct >= 75 ? '#34d399' : 'var(--accent-gradient)',
                }}
              />
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {done}/{merged.length} completed
            </div>
          </div>

          {/* Time blocks */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={merged.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {merged.map((b) => (
                  <SortableBlockRow
                    key={b.id}
                    block={b}
                    completionKey={b.completionKey}
                    checked={completions.has(b.completionKey)}
                    editMode={editMode}
                    onToggle={() => toggle(b.completionKey)}
                    onEdit={() => onEditBlock(b, day.date, week, dayIdx)}
                    onDelete={() => onDeleteBlock(b)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add block button */}
          {editMode && (
            <button
              onClick={() => onAddBlock(week, dayIdx, day.date)}
              className="w-full rounded-xl border border-dashed py-3 text-xs font-semibold transition-all mt-1"
              style={{
                borderColor: 'rgba(99,102,241,0.4)',
                color: '#818cf8',
                background: 'rgba(99,102,241,0.05)',
              }}
            >
              + Add block
            </button>
          )}
        </>
      )}
    </div>
  )
}
