'use client'

import { DAYS, WEEK_LABELS, getDaysForWeek, CAT, CC } from '@/lib/planner-data'
import { ScheduleBlock } from '@/lib/supabase/types'
import { mergeBlocks } from '@/lib/planner-utils'

// Read-only viewer for the archived Feb 27 – Mar 31 "Battle Plan". No add /
// edit / delete / reorder — this is historical record, not a live schedule.

interface Props {
  week: number
  dayIdx: number
  completions: Set<string>
  customBlocks: ScheduleBlock[]
  setWeek: (w: number) => void
  setDayIdx: (i: number) => void
  toggle: (key: string) => void
}

export default function ArchiveScheduleTab({
  week, dayIdx, completions, customBlocks, setWeek, setDayIdx, toggle,
}: Props) {
  const wDays = getDaysForWeek(week)
  const day = wDays[dayIdx] ?? wDays[0]

  const merged = day ? mergeBlocks(day, week, dayIdx, customBlocks) : []
  const done = merged.filter(b => completions.has(b.completionKey)).length
  const pct = merged.length ? Math.round((done / merged.length) * 100) : 0

  const isJpmc = day?.tag.includes('JPMC') ?? false
  const isDeadline = day?.tag.includes('Deadline') || day?.tag.includes('Days to')

  return (
    <div className="space-y-4">
      {/* Week switcher */}
      <div className="flex gap-2 flex-wrap">
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
                <div className="w-1 h-1 rounded-full mt-1" style={{ background: dp >= 100 ? '#34d399' : '#818cf8' }} />
              )}
            </button>
          )
        })}
      </div>

      {day && (
        <>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-base font-bold text-[var(--text-primary)]">{day.date}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: isJpmc ? '#dc2626' : isDeadline ? '#92400e' : '#312e81', color: '#fff' }}
              >
                {day.tag}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] italic mb-2">{day.theme}</p>

            <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: pct >= 75 ? '#34d399' : 'var(--accent-gradient)' }}
              />
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{done}/{merged.length} completed</div>
          </div>

          <div className="space-y-1.5">
            {merged.map((b) => {
              const checked = completions.has(b.completionKey)
              const color = CC[b.cat]
              return (
                <button
                  key={b.id}
                  onClick={() => toggle(b.completionKey)}
                  className="w-full flex gap-2 rounded-xl border px-3 py-2.5 items-stretch text-left transition-colors duration-150"
                  style={{
                    background: checked ? 'rgba(15,26,15,0.6)' : '#13141e',
                    borderColor: checked ? 'rgba(52,211,153,0.25)' : '#1e2030',
                    opacity: checked ? 0.55 : 1,
                  }}
                >
                  <div className="w-14 shrink-0 pt-0.5">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">{b.time_label}</span>
                  </div>
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
