'use client'

import { useState } from 'react'
import ArchiveScheduleTab from './ArchiveScheduleTab'
import AgendaTab from './AgendaTab'
import ChecklistTab from './ChecklistTab'
import { MILESTONES } from '@/lib/planner-data'
import { ScheduleBlock } from '@/lib/supabase/types'

type SubTab = 'schedule' | 'agenda' | 'checklist'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'schedule',  label: 'Battle Plan' },
  { id: 'agenda',    label: 'Agenda' },
  { id: 'checklist', label: 'Mar 19 Checklist' },
]

const URGENCY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   badge: '#ef4444', text: '#fca5a5' },
  high:     { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.30)',  badge: '#f59e0b', text: '#fcd34d' },
  medium:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)', badge: '#3b82f6', text: '#93c5fd' },
  low:      { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.20)', badge: '#6b7280', text: '#9ca3af' },
}

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface Props {
  completions: Set<string>
  customBlocks: ScheduleBlock[]
  toggle: (key: string) => void
}

export default function ArchiveTab({ completions, customBlocks, toggle }: Props) {
  const [sub, setSub] = useState<SubTab>('schedule')
  const [week, setWeek] = useState(1)
  const [dayIdx, setDayIdx] = useState(0)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">🗄 Archive — Battle Plan</h2>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          The Feb 27 – Mar 31, 2026 JPMC-exit sprint. Preserved as-is, read-only — job search,
          HELOC, and health now live in their own sections.
        </p>
      </div>

      {/* Milestone strip — historical, all 6 tracked deadlines */}
      <div className="overflow-x-auto -mx-1 px-1 scrollbar-none">
        <div className="flex gap-1.5 min-w-max">
          {MILESTONES.map((m, i) => {
            const days = daysUntil(m.isoDate)
            const uc = URGENCY_COLORS[m.urgency]
            const canNav = m.week !== undefined && m.dayIdx !== undefined

            return (
              <button
                key={i}
                onClick={canNav ? () => { setWeek(m.week!); setDayIdx(m.dayIdx!); setSub('schedule') } : undefined}
                className="flex items-center gap-1.5 rounded-lg border px-2 py-1 shrink-0 transition-all"
                style={{ background: uc.bg, borderColor: uc.border, cursor: canNav ? 'pointer' : 'default', opacity: days < 0 ? 0.5 : 1 }}
                title={m.note}
              >
                <span className="text-xs leading-none">{m.icon}</span>
                <div className="text-left">
                  <div className="text-[9px] font-semibold leading-tight" style={{ color: uc.text }}>{m.shortLabel}</div>
                  <div className="text-[9px] font-bold leading-tight" style={{ color: days < 0 ? '#6b7280' : uc.badge }}>
                    {days < 0 ? 'passed' : days === 0 ? 'TODAY' : `${days}d`}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-tab nav */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border-none shrink-0 transition-all duration-150 whitespace-nowrap"
            style={{ background: sub === t.id ? '#6366f1' : 'transparent', color: sub === t.id ? '#fff' : 'var(--text-muted)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'schedule' && (
        <ArchiveScheduleTab
          week={week}
          dayIdx={dayIdx}
          completions={completions}
          customBlocks={customBlocks}
          setWeek={setWeek}
          setDayIdx={setDayIdx}
          toggle={toggle}
        />
      )}
      {sub === 'agenda' && <AgendaTab completions={completions} toggle={toggle} />}
      {sub === 'checklist' && <ChecklistTab completions={completions} toggle={toggle} />}
    </div>
  )
}
