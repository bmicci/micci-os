'use client'

import { useState } from 'react'

interface FinancialModule {
  id: string
  module_number: number | null
  name: string
  category: string | null
  status: string | null
  progress: number | null
  description: string | null
}

interface ModuleTrackerProps {
  modules: FinancialModule[] | null
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  complete:    { icon: '✅', label: 'Complete',    color: 'text-green-400' },
  in_progress: { icon: '🔄', label: 'In Progress', color: 'text-cyan-400' },
  not_started: { icon: '⬜', label: 'Not Started', color: 'text-[var(--text-muted)]' },
}

export default function ModuleTracker({ modules }: ModuleTrackerProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const sorted = [...(modules ?? [])].sort(
    (a, b) => (a.module_number ?? 99) - (b.module_number ?? 99)
  )

  const complete = sorted.filter((m) => m.status === 'complete').length
  const overallPct = Math.round((complete / 9) * 100)

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          🗂 Financial Module Tracker
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallPct}%`,
                background: 'linear-gradient(135deg, #00D4FF, #1E90FF)',
              }}
            />
          </div>
          <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
            {complete} / 9 complete
          </span>
        </div>
      </div>

      {/* Module list */}
      <div className="glass-card overflow-hidden divide-y divide-white/5">
        {sorted.map((mod, idx) => {
          const cfg = STATUS_CONFIG[mod.status ?? 'not_started'] ?? STATUS_CONFIG.not_started
          const isOpen = expanded === mod.id
          const num = mod.module_number ?? idx + 1

          return (
            <div key={mod.id}>
              <button
                className="w-full px-4 py-3 hover:bg-white/5 transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : mod.id)}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* M# */}
                  <span className="text-[var(--text-muted)] text-xs font-mono w-6 shrink-0">
                    M{num}
                  </span>

                  {/* Name */}
                  <span className="text-sm font-medium text-[var(--text-primary)] w-36 sm:w-44 shrink-0 truncate">
                    {mod.name}
                  </span>

                  {/* Progress bar */}
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden min-w-0">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${mod.progress ?? 0}%`,
                        background: 'linear-gradient(135deg, #00D4FF, #1E90FF)',
                      }}
                    />
                  </div>

                  {/* Percent */}
                  <span className="text-xs text-[var(--text-secondary)] w-9 text-right shrink-0 font-mono">
                    {mod.progress ?? 0}%
                  </span>

                  {/* Status */}
                  <span className={`text-xs ${cfg.color} flex items-center gap-1 w-7 sm:w-28 shrink-0`}>
                    <span>{cfg.icon}</span>
                    <span className="hidden sm:inline">{cfg.label}</span>
                  </span>

                  {/* Chevron */}
                  <span
                    className="text-[var(--text-muted)] text-xs shrink-0 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ▾
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 py-3 bg-white/5 border-t border-white/5">
                  <p className="text-sm text-[var(--text-secondary)] pl-8 leading-relaxed">
                    {mod.description ?? 'No details available.'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
