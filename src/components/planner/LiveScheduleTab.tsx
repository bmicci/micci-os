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
import { LIVE_TEMPLATE, LiveDay, CAT, CC } from '@/lib/planner-data'
import { ScheduleBlock } from '@/lib/supabase/types'
import { MergedBlock, mergeLiveBlocks } from '@/lib/planner-utils'

// ── Sortable block row ────────────────────────────────────

interface BlockRowProps {
  block: MergedBlock
  checked: boolean
  editMode: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

function SortableBlockRow({ block, checked, editMode, onToggle, onEdit, onDelete }: BlockRowProps) {
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

      <div className="w-14 shrink-0 pt-0.5">
        <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">{block.time_label}</span>
      </div>

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

// ── Main LiveScheduleTab ──────────────────────────────────

interface Props {
  weekDates: LiveDay[]
  dayIdx: number
  completions: Set<string>
  customBlocks: ScheduleBlock[]
  setDayIdx: (i: number) => void
  toggle: (key: string) => void
  onViewModeChange?: (mode: 'day' | 'week') => void
  onAddBlock: (day: LiveDay) => void
  onEditBlock: (block: MergedBlock, day: LiveDay) => void
  onDeleteBlock: (block: MergedBlock, day: LiveDay) => void
  onReorderBlocks: (reordered: MergedBlock[], day: LiveDay) => void
}

export default function LiveScheduleTab({
  weekDates, dayIdx, completions, customBlocks,
  setDayIdx, toggle, onViewModeChange, onAddBlock, onEditBlock, onDeleteBlock, onReorderBlocks,
}: Props) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [editMode, setEditMode] = useState(false)

  function changeViewMode(mode: 'day' | 'week') {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const day = weekDates[dayIdx] ?? weekDates[0]
  const merged = day ? mergeLiveBlocks(LIVE_TEMPLATE[day.dow], day.isoDate, customBlocks) : []
  const done = merged.filter(b => completions.has(b.completionKey)).length
  const pct = merged.length ? Math.round((done / merged.length) * 100) : 0

  const weekRangeLabel = weekDates.length
    ? `${weekDates[0].label} – ${weekDates[6].label}`
    : ''

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !day) return
    const oldIdx = merged.findIndex(b => b.id === active.id)
    const newIdx = merged.findIndex(b => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(merged, oldIdx, newIdx)
    onReorderBlocks(reordered, day)
  }

  return (
    <div className="space-y-4">
      {/* Week label + edit + view toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 text-[11px] font-semibold text-[var(--text-muted)]">
          This week · {weekRangeLabel}
        </div>
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
              {weekDates.map((d, i) => {
                const dayMerged = mergeLiveBlocks(LIVE_TEMPLATE[d.dow], d.isoDate, customBlocks)
                const dd = dayMerged.filter(b => completions.has(b.completionKey)).length
                const dp = dayMerged.length ? Math.round((dd / dayMerged.length) * 100) : 0
                const parts = d.label.split(', ')
                const isSelected = dayIdx === i

                return (
                  <div
                    key={d.isoDate}
                    className="flex-1 min-w-[80px] flex flex-col rounded-xl border overflow-hidden"
                    style={{
                      background: isSelected ? '#1a1f35' : 'var(--card-bg)',
                      borderColor: d.isToday
                        ? 'var(--accent-cyan)'
                        : isSelected
                        ? 'var(--accent-blue)'
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
                      {d.isToday && (
                        <div className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--accent-cyan)' }}>TODAY</div>
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
                              background: checked ? 'rgba(52,211,153,0.08)' : `${CC[b.cat]}18`,
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
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {weekDates.map((d, i) => {
              const dayMerged = mergeLiveBlocks(LIVE_TEMPLATE[d.dow], d.isoDate, customBlocks)
              const dd = dayMerged.filter(b => completions.has(b.completionKey)).length
              const dp = dayMerged.length ? Math.round((dd / dayMerged.length) * 100) : 0
              const parts = d.label.split(', ')
              return (
                <button
                  key={d.isoDate}
                  onClick={() => setDayIdx(i)}
                  className="flex flex-col items-center px-3 py-2 rounded-lg border text-center shrink-0 min-w-[52px] transition-all duration-150"
                  style={{
                    background: dayIdx === i ? '#1a1f35' : 'transparent',
                    borderColor: d.isToday ? 'var(--accent-cyan)' : dayIdx === i ? 'var(--card-border)' : 'transparent',
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

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-base font-bold text-[var(--text-primary)]">{day.label}</span>
              {day.isToday && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}
                >
                  Today
                </span>
              )}
              {editMode && (
                <span
                  className="text-[9px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                >
                  Edit Mode
                </span>
              )}
            </div>

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

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={merged.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {merged.map((b) => (
                  <SortableBlockRow
                    key={b.id}
                    block={b}
                    checked={completions.has(b.completionKey)}
                    editMode={editMode}
                    onToggle={() => toggle(b.completionKey)}
                    onEdit={() => onEditBlock(b, day)}
                    onDelete={() => onDeleteBlock(b, day)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {editMode && (
            <button
              onClick={() => onAddBlock(day)}
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
