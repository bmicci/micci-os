'use client'

import { useState, useEffect } from 'react'

interface Milestone {
  id: string
  text: string
  completed: boolean
}

interface GoalProgress {
  goalId: string
  progress: number // 0–100
  milestones: Milestone[]
  lastReviewedAt?: string
  notes?: string
}

const STORAGE_KEY = 'micci-os-goal-progress'

function loadProgress(): Record<string, GoalProgress> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveProgress(data: Record<string, GoalProgress>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ── Progress Ring SVG ────────────────────────────────────────────

export function ProgressRing({
  progress, size = 40, strokeWidth = 4, color = 'var(--accent-cyan)',
}: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = (progress / 100) * circ

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      <text x={size / 2} y={size / 2 + 4}
        textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size * 0.22, fill: color, fontWeight: 700, transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}>
        {progress}%
      </text>
    </svg>
  )
}

// ── Quarterly Review Banner ─────────────────────────────────────

export function QuarterlyReviewBanner({ onDismiss }: { onDismiss: () => void }) {
  const REVIEW_KEY = 'micci-os-last-goal-review'
  const [show, setShow] = useState(false)

  useEffect(() => {
    const last = localStorage.getItem(REVIEW_KEY)
    if (!last) { setShow(true); return }
    const daysSince = (Date.now() - new Date(last).getTime()) / 86_400_000
    if (daysSince >= 90) setShow(true)
  }, [])

  function dismiss() {
    localStorage.setItem(REVIEW_KEY, new Date().toISOString())
    setShow(false)
    onDismiss()
  }

  if (!show) return null

  return (
    <div className="flex items-center justify-between p-4 rounded-xl mb-4"
      style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
      <div>
        <div className="text-sm font-semibold" style={{ color: '#fbbf24' }}>
          📋 Quarterly Goal Review
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          It&apos;s been 90+ days. Take a few minutes to review your goals — mark what&apos;s on track, behind, or pivoted.
        </div>
      </div>
      <button
        onClick={dismiss}
        className="ml-4 text-xs px-3 py-1.5 rounded-lg shrink-0"
        style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
      >
        Mark Done
      </button>
    </div>
  )
}

// ── Goal Detail Panel (progress + milestones) ───────────────────

interface GoalProgressPanelProps {
  goalId: string
  goalText: string
  sectionColor?: string
  onCreateTask?: (goalText: string, goalId: string) => void
}

export default function GoalProgressPanel({
  goalId, goalText, sectionColor = 'var(--accent-cyan)', onCreateTask,
}: GoalProgressPanelProps) {
  const [data, setData] = useState<GoalProgress>({
    goalId,
    progress: 0,
    milestones: [],
  })
  const [newMilestone, setNewMilestone] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const all = loadProgress()
    if (all[goalId]) setData(all[goalId])
    setLoading(false)
  }, [goalId])

  function mutate(updater: (prev: GoalProgress) => GoalProgress) {
    setData(prev => {
      const next = updater(prev)
      const all = loadProgress()
      all[goalId] = next
      saveProgress(all)
      return next
    })
  }

  function setProgress(v: number) {
    mutate(p => ({ ...p, progress: Math.max(0, Math.min(100, v)) }))
  }

  function addMilestone() {
    if (!newMilestone.trim()) return
    mutate(p => ({
      ...p,
      milestones: [...p.milestones, { id: crypto.randomUUID(), text: newMilestone.trim(), completed: false }],
    }))
    setNewMilestone('')
  }

  function toggleMilestone(id: string) {
    mutate(p => {
      const next = p.milestones.map(m => m.id === id ? { ...m, completed: !m.completed } : m)
      const completedCount = next.filter(m => m.completed).length
      const autoProgress = next.length > 0 ? Math.round((completedCount / next.length) * 100) : p.progress
      return { ...p, milestones: next, progress: autoProgress }
    })
  }

  function removeMilestone(id: string) {
    mutate(p => ({ ...p, milestones: p.milestones.filter(m => m.id !== id) }))
  }

  // Auto-recalculate progress from milestones
  const autoProgress = data.milestones.length > 0
    ? Math.round((data.milestones.filter(m => m.completed).length / data.milestones.length) * 100)
    : data.progress

  if (loading) return null

  return (
    <div className="mt-2 p-3 rounded-xl flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Progress ring + slider */}
      <div className="flex items-center gap-3">
        <ProgressRing progress={autoProgress} color={sectionColor} size={44} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Progress</span>
            <span className="text-xs font-mono font-bold" style={{ color: sectionColor }}>{autoProgress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={autoProgress}
            onChange={e => setProgress(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none"
            style={{ background: `linear-gradient(to right, ${sectionColor} ${autoProgress}%, rgba(255,255,255,0.1) ${autoProgress}%)` }}
          />
        </div>
      </div>

      {/* Milestones */}
      {data.milestones.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.milestones.map(m => (
            <div key={m.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleMilestone(m.id)}
                className="shrink-0 w-4 h-4 rounded border flex items-center justify-center"
                style={{ background: m.completed ? sectionColor : 'transparent', borderColor: sectionColor }}
              >
                {m.completed && <span style={{ color: '#050505', fontSize: 9, lineHeight: 1 }}>✓</span>}
              </button>
              <span className="text-xs flex-1" style={{
                color: m.completed ? 'var(--text-muted)' : 'var(--text-secondary)',
                textDecoration: m.completed ? 'line-through' : 'none',
              }}>
                {m.text}
              </span>
              <button
                onClick={() => removeMilestone(m.id)}
                className="opacity-0 group-hover:opacity-100 text-[10px] transition-opacity"
                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add milestone */}
      <div className="flex gap-1.5">
        <input
          type="text"
          placeholder="Add milestone…"
          value={newMilestone}
          onChange={e => setNewMilestone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addMilestone()}
          className="flex-1 px-2 py-1 rounded text-xs"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', outline: 'none' }}
        />
        <button
          onClick={addMilestone}
          className="px-2 py-1 rounded text-[10px]"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          +
        </button>
        {onCreateTask && (
          <button
            onClick={() => onCreateTask(goalText, goalId)}
            className="px-2 py-1 rounded text-[10px] whitespace-nowrap"
            style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            → Task
          </button>
        )}
      </div>
    </div>
  )
}
