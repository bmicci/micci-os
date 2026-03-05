'use client'

import { useState, useCallback } from 'react'

type GoalStatus = 'active' | 'completed' | 'paused' | 'archived'

interface Goal {
  id: string
  title: string
  description: string | null
  status: GoalStatus
  priority: number | null
  target_date: string | null
  completed_at: string | null
}

interface Props {
  goal: Goal
}

const STATUS_CYCLE: GoalStatus[] = ['active', 'completed', 'paused', 'archived']
const PRIORITY_CYCLE = [1, 2, 3, 4, 5]

const STATUS_STYLES: Record<GoalStatus, string> = {
  active:    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  completed: 'bg-green-500/20 text-green-300 border border-green-500/30',
  paused:    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  archived:  'bg-gray-500/20 text-gray-400 border border-gray-500/30',
}

const PRIORITY_STYLES: Record<number, string> = {
  1: 'text-red-400 bg-red-500/10',
  2: 'text-orange-400 bg-orange-500/10',
  3: 'text-yellow-400 bg-yellow-500/10',
  4: 'text-blue-400 bg-blue-500/10',
  5: 'text-gray-400 bg-gray-500/10',
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(d: string | null, status: GoalStatus) {
  if (status !== 'active' || !d) return false
  return new Date(d) < new Date()
}

export default function GoalRow({ goal: initial }: Props) {
  const [goal, setGoal] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const update = useCallback(async (patch: Partial<Pick<Goal, 'status' | 'priority'>>) => {
    setGoal((g) => ({ ...g, ...patch }))
    setSaving(true)
    setErr(null)

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setGoal(updated)
      setFlash(true)
      setTimeout(() => setFlash(false), 600)
    } catch (e) {
      setGoal(initial)
      setErr((e as Error).message)
      setTimeout(() => setErr(null), 3000)
    } finally {
      setSaving(false)
    }
  }, [goal.id, initial])

  const cycleStatus = useCallback(() => {
    const idx = STATUS_CYCLE.indexOf(goal.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    update({ status: next })
  }, [goal.status, update])

  const cyclePriority = useCallback(() => {
    const current = goal.priority ?? 5
    const idx = PRIORITY_CYCLE.indexOf(current)
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    update({ priority: next })
  }, [goal.priority, update])

  const overdue = isOverdue(goal.target_date, goal.status)
  const pStyle = PRIORITY_STYLES[goal.priority ?? 5] ?? PRIORITY_STYLES[5]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.025] transition-colors rounded-lg ${
        flash ? 'bg-cyan-500/5' : ''
      } ${saving ? 'opacity-70' : ''}`}
    >
      {/* Priority badge — clickable */}
      <button
        onClick={cyclePriority}
        disabled={saving}
        title="Click to change priority"
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${pStyle}`}
      >
        P{goal.priority ?? '—'}
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${goal.status === 'completed' ? 'line-through text-[var(--text-muted)]' : overdue ? 'text-red-300' : 'text-[var(--text-primary)]'}`}>
          {goal.title}
        </p>
        {goal.target_date && (
          <p className={`text-[11px] mt-0.5 ${overdue ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
            {overdue ? '⚠ Overdue · ' : ''}{fmtDate(goal.target_date)}
          </p>
        )}
      </div>

      {/* Error inline */}
      {err && <span className="text-[10px] text-red-400 flex-shrink-0 max-w-24 truncate">{err}</span>}

      {/* Status badge — clickable */}
      <button
        onClick={cycleStatus}
        disabled={saving}
        title="Click to change status"
        className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 ${STATUS_STYLES[goal.status]}`}
      >
        {saving ? '…' : goal.status}
      </button>
    </div>
  )
}
