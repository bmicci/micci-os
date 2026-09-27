'use client'

// The "Today" panel — schedule and protocols side by side, one tap each.
// (HEALTH_MASTER_PLAN.md §3: the habit loop. Recovery-aware header lands
// with the Whoop integration; until then a placeholder chip marks the spot.)
//
// Shares state with the rest of the app rather than duplicating it:
// - schedule blocks/completions: same tables + completion keys as /planner
// - protocol check-offs: same protocol_compliance rows as the Protocols tab

import { useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { CheckCircle2, Circle, Watch } from 'lucide-react'
import { LIVE_TEMPLATE, getCurrentWeekDates } from '@/lib/planner-data'
import { mergeLiveBlocks } from '@/lib/planner-utils'
import type { ScheduleBlock } from '@/lib/supabase/types'
import type { HormoneProtocol, ProtocolCompliance } from './types'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key)
}

const TODAY = new Date().toISOString().slice(0, 10)

function protocolDueToday(p: HormoneProtocol, dow: string): boolean {
  if (!p.is_active) return false
  if (!p.day_of_week || p.day_of_week.length === 0) return true // daily
  const d3 = dow.slice(0, 3).toLowerCase()
  return p.day_of_week.some(d => d.slice(0, 3).toLowerCase() === d3)
}

/** Consecutive days ending today (or yesterday) with ≥1 compliance row. */
function complianceStreak(rows: ProtocolCompliance[]): number {
  const days = new Set(rows.map(r => r.completed_date))
  let streak = 0
  const cursor = new Date()
  if (!days.has(TODAY)) cursor.setDate(cursor.getDate() - 1) // today still open
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10)
    if (!days.has(iso)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

const cardStyle = {
  background: 'var(--card-bg, rgba(255,255,255,0.05))',
  border: '1px solid rgba(0,212,255,0.15)',
  borderRadius: 16,
} as const

export default function TodayTab({
  protocols,
  compliance,
  scheduleBlocks,
  scheduleCompletions,
}: {
  protocols: HormoneProtocol[]
  compliance: ProtocolCompliance[]
  scheduleBlocks: ScheduleBlock[]
  scheduleCompletions: string[]
}) {
  const today = useMemo(() => getCurrentWeekDates().find(d => d.isToday), [])
  const blocks = useMemo(
    () => (today ? mergeLiveBlocks(LIVE_TEMPLATE[today.dow], today.isoDate, scheduleBlocks) : []),
    [today, scheduleBlocks],
  )

  const [doneKeys, setDoneKeys] = useState<Set<string>>(() => new Set(scheduleCompletions))
  const [complianceRows, setComplianceRows] = useState<ProtocolCompliance[]>(compliance)

  const dueProtocols = useMemo(
    () => (today ? protocols.filter(p => protocolDueToday(p, today.dow)) : []),
    [protocols, today],
  )
  const doneProtocolIds = useMemo(
    () => new Set(complianceRows.filter(c => c.completed_date === TODAY).map(c => c.protocol_id)),
    [complianceRows],
  )

  const blocksDone = blocks.filter(b => doneKeys.has(b.completionKey)).length
  const streak = complianceStreak(complianceRows)

  function toggleBlock(key: string) {
    const supabase = getSupabase()
    setDoneKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        supabase?.from('schedule_completions').delete().eq('key', key).then(() => {})
      } else {
        next.add(key)
        supabase?.from('schedule_completions').upsert({ key }).then(() => {})
      }
      return next
    })
  }

  async function toggleProtocol(p: HormoneProtocol) {
    const supabase = getSupabase()
    if (!supabase) return
    if (doneProtocolIds.has(p.id)) {
      setComplianceRows(rows => rows.filter(r => !(r.protocol_id === p.id && r.completed_date === TODAY)))
      await supabase.from('protocol_compliance').delete()
        .eq('protocol_id', p.id).eq('completed_date', TODAY)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const optimistic: ProtocolCompliance = {
        id: `tmp-${p.id}-${TODAY}`, user_id: user.id, protocol_id: p.id,
        completed_date: TODAY, injection_site: null, notes: null,
      }
      setComplianceRows(rows => [optimistic, ...rows])
      await supabase.from('protocol_compliance')
        .insert({ protocol_id: p.id, completed_date: TODAY, user_id: user.id })
    }
  }

  if (!today) return null

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center gap-3 p-4" style={cardStyle}>
        <div className="flex-1 min-w-[180px]">
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{today.label}</div>
          <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {blocksDone}/{blocks.length} blocks · {doneProtocolIds.size}/{dueProtocols.length} protocols
            {streak > 0 && <> · 🔥 {streak}-day protocol streak</>}
          </div>
        </div>
        <div
          className="flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--text-muted)', border: '1px dashed rgba(0,212,255,0.3)' }}
          title="Whoop integration is the next health build — recovery % will drive this header"
        >
          <Watch size={13} /> Connect Whoop → recovery-aware days
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        {/* Schedule column */}
        <div className="p-4" style={cardStyle}>
          <div className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Today&apos;s Schedule
          </div>
          <div className="space-y-1">
            {blocks.map(b => {
              const done = doneKeys.has(b.completionKey)
              return (
                <button
                  key={b.id}
                  onClick={() => toggleBlock(b.completionKey)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-white/5"
                >
                  {done
                    ? <CheckCircle2 size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                    : <Circle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                  <span className="text-[11px] w-16 shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {b.time_label}
                  </span>
                  <span
                    className="text-[13px]"
                    style={{
                      color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
                    {b.task}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Protocols column */}
        <div className="p-4" style={cardStyle}>
          <div className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Today&apos;s Protocols
          </div>
          {dueProtocols.length === 0 ? (
            <div className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Nothing scheduled today.
            </div>
          ) : (
            <div className="space-y-1">
              {dueProtocols.map(p => {
                const done = doneProtocolIds.has(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProtocol(p)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
                  >
                    {done
                      ? <CheckCircle2 size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                      : <Circle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                    <span className="flex-1">
                      <span
                        className="block text-[13px] font-medium"
                        style={{
                          color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}
                      >
                        {p.name}
                      </span>
                      <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {[p.dosage, p.time_of_day].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
