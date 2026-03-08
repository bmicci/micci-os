'use client'

import { useState } from 'react'
import { DAYS, WEEK_LABELS, getDaysForWeek, CAT, CC } from '@/lib/planner-data'

interface Props {
  week: number
  dayIdx: number
  completions: Set<string>
  setWeek: (w: number) => void
  setDayIdx: (i: number) => void
  toggle: (key: string) => void
  onViewModeChange?: (mode: 'day' | 'week') => void
}

export default function ScheduleTab({ week, dayIdx, completions, setWeek, setDayIdx, toggle, onViewModeChange }: Props) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

  function changeViewMode(mode: 'day' | 'week') {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }

  const wDays = getDaysForWeek(week)
  const day = wDays[dayIdx] ?? wDays[0]

  const done = day.blocks.filter((_, i) => completions.has(`${week}-${dayIdx}-${i}`)).length
  const pct = day.blocks.length ? Math.round((done / day.blocks.length) * 100) : 0

  const isJpmc = day.tag.includes('JPMC')
  const isDeadline = day.tag.includes('Deadline') || day.tag.includes('Days to')

  return (
    <div className="space-y-4">
      {/* Week nav + view toggle */}
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
                const dd = d.blocks.filter((_, j) => completions.has(`${week}-${i}-${j}`)).length
                const dp = d.blocks.length ? Math.round((dd / d.blocks.length) * 100) : 0
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
                    {/* Day header — tap to switch to day view */}
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
                      {/* Mini progress bar */}
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

                    {/* Block pills */}
                    <div className="px-1.5 py-1.5 flex flex-col gap-0.5 max-h-72 overflow-y-auto">
                      {d.blocks.map((b, j) => {
                        const checked = completions.has(`${week}-${i}-${j}`)
                        return (
                          <div
                            key={j}
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
      {viewMode === 'day' && (
        <>
          {/* Day nav */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {wDays.map((d, i) => {
              const dd = d.blocks.filter((_, j) => completions.has(`${week}-${i}-${j}`)).length
              const dp = d.blocks.length ? Math.round((dd / d.blocks.length) * 100) : 0
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
            </div>
            <p className="text-xs text-[var(--text-muted)] italic mb-2">{day.theme}</p>

            {/* Progress bar */}
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
              {done}/{day.blocks.length} completed
            </div>
          </div>

          {/* Time blocks */}
          <div className="space-y-1.5">
            {day.blocks.map((b, i) => {
              const key = `${week}-${dayIdx}-${i}`
              const checked = completions.has(key)
              const color = CC[b.cat]

              return (
                <button
                  key={i}
                  onClick={() => toggle(key)}
                  className="w-full flex gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 cursor-pointer"
                  style={{
                    background: checked ? 'rgba(15,26,15,0.6)' : '#13141e',
                    borderColor: checked ? 'rgba(52,211,153,0.25)' : '#1e2030',
                    opacity: checked ? 0.55 : 1,
                  }}
                >
                  {/* Time */}
                  <div className="w-14 shrink-0 pt-0.5">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">{b.t}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm leading-none">{CAT[b.cat].icon}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color }}>
                        {CAT[b.cat].label}
                      </span>
                    </div>
                    <div
                      className="text-xs leading-snug"
                      style={{
                        color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: checked ? 'line-through' : 'none',
                      }}
                    >
                      {b.task}
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div
                    className="w-5 h-5 rounded border-2 shrink-0 self-center flex items-center justify-center transition-all"
                    style={{
                      borderColor: checked ? '#34d399' : 'rgba(255,255,255,0.12)',
                      background: checked ? 'rgba(20,83,45,0.6)' : 'transparent',
                    }}
                  >
                    {checked && <span className="text-[10px] text-emerald-400">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
