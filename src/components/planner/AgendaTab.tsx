'use client'

import { DAYS, getDaysForWeek, CAT, CC } from '@/lib/planner-data'
import type { CatKey } from '@/lib/planner-data'

// Categories considered "major" — the high-stakes tasks worth surfacing
const MAJOR_CATS: CatKey[] = ['heloc', 'job', 'legal', 'admin', 'health', 'tax']

interface Props {
  completions: Set<string>
  toggle: (key: string) => void
}

export default function AgendaTab({ completions, toggle }: Props) {
  // Show week 2 onwards (current + future)
  const days = DAYS.filter(d => d.week >= 2)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">📍 Agenda</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Major tasks only — HELOC, Job Search, Legal/BoA, Admin, Health
        </p>
      </div>

      {days.map((day) => {
        const weekDays = getDaysForWeek(day.week)
        const dayIdx = weekDays.indexOf(day)

        const majorBlocks = day.blocks
          .map((b, i) => ({ ...b, i }))
          .filter(b => MAJOR_CATS.includes(b.cat))

        if (majorBlocks.length === 0) return null

        const totalBlocks = majorBlocks.length
        const doneBlocks = majorBlocks.filter(b =>
          completions.has(`${day.week}-${dayIdx}-${b.i}`)
        ).length
        const pct = totalBlocks ? Math.round((doneBlocks / totalBlocks) * 100) : 0

        const isJpmc = day.date.includes('Mar 19')
        const isDeadline = day.tag.includes('Deadline') || day.tag.includes('Days to')

        return (
          <div key={`${day.week}-${dayIdx}`}>
            {/* Day header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[var(--text-primary)]">{day.date}</span>
                {isJpmc && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                    🔴 JPMC LAST DAY
                  </span>
                )}
                {!isJpmc && isDeadline && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-800 text-white">
                    {day.tag}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                {doneBlocks}/{totalBlocks}
                {pct === 100 && <span className="text-emerald-400 ml-1">✓</span>}
              </div>
            </div>

            {/* Major blocks */}
            <div className="space-y-1.5">
              {majorBlocks.map(b => {
                const key = `${day.week}-${dayIdx}-${b.i}`
                const checked = completions.has(key)
                const color = CC[b.cat]

                return (
                  <button
                    key={b.i}
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
                      <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">{b.t}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm leading-none">{CAT[b.cat].icon}</span>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide"
                          style={{ color }}
                        >
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

            {/* Divider */}
            <div className="mt-4 h-px bg-white/5" />
          </div>
        )
      })}
    </div>
  )
}
