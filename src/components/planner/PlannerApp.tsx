'use client'

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import ScheduleTab from './ScheduleTab'
import SleepTab from './SleepTab'
import FitnessTab from './FitnessTab'
import ChecklistTab from './ChecklistTab'
import RulesTab from './RulesTab'
import BacklogTab from './BacklogTab'
import { DAYS, MAR19 } from '@/lib/planner-data'

// ── Types ──────────────────────────────────────────────────

type TabId = 'schedule' | 'sleep' | 'fitness' | 'checklist' | 'rules' | 'backlog'

const TABS: { id: TabId; label: string }[] = [
  { id: 'schedule',  label: 'Schedule'  },
  { id: 'sleep',     label: 'Sleep'     },
  { id: 'fitness',   label: 'Fitness'   },
  { id: 'checklist', label: 'Mar 19'    },
  { id: 'rules',     label: 'Rules'     },
  { id: 'backlog',   label: 'Backlog'   },
]

// ── Supabase client (anon — RLS disabled on schedule_completions) ──

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key)
}

// ── Component ─────────────────────────────────────────────

interface Props {
  initialCompletions: string[]
}

export default function PlannerApp({ initialCompletions }: Props) {
  const [completions, setCompletions] = useState<Set<string>>(new Set(initialCompletions))
  const [week, setWeek]   = useState(2) // default to current week (Mar 3-9)
  const [dayIdx, setDayIdx] = useState(5) // default to today: Mar 8 (index 5 in week 2)
  const [tab, setTab] = useState<TabId>('schedule')
  // ── Derived stats for header ─────────────────────────────

  const currentWeekDays = DAYS.filter(d => d.week === week)
  const currentDay = currentWeekDays[dayIdx] ?? currentWeekDays[0]
  const done = currentDay?.blocks.filter((_, i) => completions.has(`${week}-${dayIdx}-${i}`)).length ?? 0
  const total = currentDay?.blocks.length ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const checklistDone = MAR19.filter((_, i) => completions.has(`cl-${i}`)).length

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

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-body)' }}>
      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-20 border-b px-4 pb-3 pt-4"
        style={{
          background: 'linear-gradient(160deg, #151729 0%, #0c0d14 70%)',
          borderColor: 'rgba(0,212,255,0.1)',
        }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">📅 Battle Plan</h1>
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

        {/* Tab nav */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 mb-2 scrollbar-none">
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
      <div className="px-4 py-4 pb-20 max-w-2xl mx-auto">
        {tab === 'schedule' && (
          <ScheduleTab
            week={week}
            dayIdx={dayIdx}
            completions={completions}
            setWeek={setWeek}
            setDayIdx={setDayIdx}
            toggle={toggle}
          />
        )}
        {tab === 'sleep'     && <SleepTab />}
        {tab === 'fitness'   && <FitnessTab />}
        {tab === 'checklist' && <ChecklistTab completions={completions} toggle={toggle} />}
        {tab === 'rules'     && <RulesTab />}
        {tab === 'backlog'   && <BacklogTab />}
      </div>
    </div>
  )
}
