'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isPast, isSameDay, addMonths, subMonths, getDay } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────

export type TaskCategory =
  | 'job_search' | 'tax' | 'health' | 'legal'
  | 'heloc' | 'finance' | 'personal' | 'career'

export type TaskStatus = 'pending' | 'completed' | 'overdue' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  title: string
  description?: string
  category: TaskCategory
  status: TaskStatus
  scheduledDate?: string // ISO date
  dueDate?: string
  priority: TaskPriority
  isRecurring: boolean
  recurrenceRule?: string
  notes?: string
  completedAt?: string
  linkedGoalId?: string
}

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string; bg: string }> = {
  job_search: { label: 'Job Search', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  tax: { label: 'Tax', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  health: { label: 'Health', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  legal: { label: 'Legal', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  heloc: { label: 'HELOC', color: '#00d4ff', bg: 'rgba(0,212,255,0.15)' },
  finance: { label: 'Finance', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  personal: { label: 'Personal', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  career: { label: 'Career', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#6b7280',
  medium: '#fbbf24',
  high: '#f97316',
  critical: '#ef4444',
}

const HARD_DEADLINES = [
  { label: 'HELOC Close (Last Day at JPMC)', date: '2026-03-19', urgency: 'critical' },
  { label: 'Federal Tax Return Due', date: '2026-04-15', urgency: 'high' },
  { label: 'DCAD Protest Deadline', date: '2026-05-15', urgency: 'high' },
  { label: 'Best Buy Promo Expires', date: '2026-06-27', urgency: 'high' },
  { label: 'Chase Promos Start Expiring', date: '2026-07-01', urgency: 'medium' },
  { label: 'Roth Conversion Deadline', date: '2026-12-31', urgency: 'medium' },
  { label: 'Citi Diamond 0% Expires', date: '2027-06-18', urgency: 'low' },
]

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

// ── Local storage helpers ────────────────────────────────────────

const STORAGE_KEY = 'micci-os-tasks'

function loadTasks(): Task[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveTasks(tasks: Task[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

// ── Main Component ─────────────────────────────────────────────────

export default function TaskManager() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 1)) // March 2026
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'all'>('all')
  const [addingFor, setAddingFor] = useState<string | null>(null) // ISO date
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('personal')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium')

  useEffect(() => {
    setTasks(loadTasks())
  }, [])

  function mutateTasks(updater: (prev: Task[]) => Task[]) {
    setTasks(prev => {
      const next = updater(prev)
      saveTasks(next)
      return next
    })
  }

  function addTask(date: string) {
    if (!newTaskTitle.trim()) return
    const task: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      status: 'pending',
      scheduledDate: date,
      priority: newTaskPriority,
      isRecurring: false,
    }
    mutateTasks(prev => [...prev, task])
    setNewTaskTitle('')
    setAddingFor(null)
  }

  function toggleTask(id: string) {
    mutateTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed', completedAt: t.status !== 'completed' ? new Date().toISOString() : undefined }
        : t,
    ))
  }

  function deleteTask(id: string) {
    mutateTasks(prev => prev.filter(t => t.id !== id))
  }

  // Build calendar weeks for the month
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Split into weeks (Mon–Fri for cleaner layout, but show all days)
  const weeks: Date[][] = []
  let week: Date[] = []
  daysInMonth.forEach((d, i) => {
    week.push(d)
    const isLastDay = i === daysInMonth.length - 1
    const isSunday = getDay(d) === 0
    if (isSunday || isLastDay) {
      weeks.push(week)
      week = []
    }
  })
  if (week.length > 0) weeks.push(week)

  // Filter tasks
  const filteredTasks = useMemo(() => {
    // Auto-mark overdue
    return tasks.map(t => {
      if (t.status === 'pending' && t.scheduledDate && isPast(new Date(t.scheduledDate)) && !isToday(new Date(t.scheduledDate))) {
        return { ...t, status: 'overdue' as TaskStatus }
      }
      return t
    }).filter(t =>
      activeCategory === 'all' || t.category === activeCategory,
    )
  }, [tasks, activeCategory])

  function tasksForDay(date: Date) {
    return filteredTasks.filter(t => t.scheduledDate && isSameDay(new Date(t.scheduledDate), date))
  }

  const upcomingDeadlines = HARD_DEADLINES.filter(d => daysUntil(d.date) > -30)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header: month nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ◀
          </button>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)', minWidth: 140, textAlign: 'center' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ▶
          </button>
        </div>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}
        >
          Today
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <CategoryPill label="All" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} color="var(--accent-cyan)" />
        {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map(cat => {
          const c = CATEGORY_CONFIG[cat]
          return (
            <CategoryPill
              key={cat}
              label={c.label}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              color={c.color}
            />
          )
        })}
      </div>

      {/* Calendar weeks */}
      <div className="flex flex-col gap-4">
        {weeks.map((weekDays, wi) => {
          const weekStart = format(weekDays[0], 'MMM d')
          const weekEnd = format(weekDays[weekDays.length - 1], 'MMM d')
          return (
            <div key={wi}>
              <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                Week {wi + 1} ({weekStart}–{weekEnd})
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${weekDays.length}, 1fr)` }}>
                {weekDays.map(day => {
                  const dayTasks = tasksForDay(day)
                  const completed = dayTasks.filter(t => t.status === 'completed').length
                  const total = dayTasks.length
                  const todayFlag = isToday(day)
                  const isAdding = addingFor === format(day, 'yyyy-MM-dd')

                  return (
                    <div
                      key={day.toISOString()}
                      className="flex flex-col gap-1.5 p-2 rounded-xl min-h-20"
                      style={{
                        background: todayFlag ? 'rgba(0,212,255,0.08)' : 'var(--card-bg)',
                        border: `1px solid ${todayFlag ? 'rgba(0,212,255,0.4)' : 'var(--card-border)'}`,
                      }}
                    >
                      {/* Day header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: todayFlag ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                          {format(day, 'EEE d')}
                        </span>
                        {total > 0 && (
                          <span className="text-[10px] font-mono" style={{ color: completed === total ? '#22c55e' : 'var(--text-muted)' }}>
                            {completed}/{total}
                          </span>
                        )}
                      </div>

                      {/* Tasks */}
                      {dayTasks.map(task => (
                        <TaskChip key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                      ))}

                      {/* Add button / input */}
                      {isAdding ? (
                        <div className="flex flex-col gap-1 mt-1">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Task title…"
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') addTask(format(day, 'yyyy-MM-dd'))
                              if (e.key === 'Escape') { setAddingFor(null); setNewTaskTitle('') }
                            }}
                            className="w-full px-2 py-1 rounded text-xs"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--text-primary)', outline: 'none' }}
                          />
                          <div className="flex gap-1">
                            <select
                              value={newTaskCategory}
                              onChange={e => setNewTaskCategory(e.target.value as TaskCategory)}
                              className="flex-1 px-1 py-0.5 rounded text-[10px]"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)', outline: 'none' }}
                            >
                              {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map(c => (
                                <option key={c} value={c} style={{ background: '#0a0e27' }}>
                                  {CATEGORY_CONFIG[c].label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => addTask(format(day, 'yyyy-MM-dd'))}
                              className="px-2 py-0.5 rounded text-[10px]"
                              style={{ background: 'var(--accent-gradient)', color: '#050505' }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingFor(format(day, 'yyyy-MM-dd')); setNewTaskTitle('') }}
                          className="text-[10px] text-left opacity-0 hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          + add task
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hard Deadlines footer */}
      <div className="mt-2">
        <div className="text-xs font-semibold mb-3 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: '#ef4444' }}>⚠</span> Hard Deadlines
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {upcomingDeadlines.map(d => {
            const days = daysUntil(d.date)
            const color = d.urgency === 'critical' ? '#ef4444' : d.urgency === 'high' ? '#f59e0b' : d.urgency === 'medium' ? '#60a5fa' : '#6b7280'
            return (
              <div key={d.label} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'var(--card-bg)', borderLeft: `3px solid ${color}`, border: `1px solid ${color}33` }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                <span className="text-xs font-mono font-bold ml-3 shrink-0"
                  style={{ color }}>
                  {days > 0 ? `${days}d` : days === 0 ? 'TODAY' : `${Math.abs(days)}d ago`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function CategoryPill({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
      style={{
        background: active ? color + '25' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : 'var(--text-muted)',
      }}
    >
      {label}
    </button>
  )
}

function TaskChip({ task, onToggle, onDelete }: {
  task: Task; onToggle: (id: string) => void; onDelete: (id: string) => void;
}) {
  const cat = CATEGORY_CONFIG[task.category]
  const isComplete = task.status === 'completed'
  const isOverdue = task.status === 'overdue'

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg group"
      style={{
        background: isComplete ? 'rgba(34,197,94,0.08)' : isOverdue ? 'rgba(239,68,68,0.08)' : cat.bg,
        border: `1px solid ${isComplete ? 'rgba(34,197,94,0.2)' : isOverdue ? 'rgba(239,68,68,0.2)' : cat.color + '33'}`,
        opacity: isComplete ? 0.7 : 1,
      }}
    >
      <button
        onClick={() => onToggle(task.id)}
        className="shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center"
        style={{
          background: isComplete ? '#22c55e' : 'transparent',
          borderColor: isComplete ? '#22c55e' : cat.color,
        }}
      >
        {isComplete && <span style={{ color: '#050505', fontSize: 8, lineHeight: 1 }}>✓</span>}
      </button>
      <span
        className="text-[10px] flex-1 leading-tight"
        style={{
          color: isComplete ? '#22c55e' : isOverdue ? '#ef4444' : 'var(--text-primary)',
          textDecoration: isComplete ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </span>
      {/* Priority dot */}
      <span
        className="shrink-0 w-1.5 h-1.5 rounded-full"
        style={{ background: PRIORITY_COLORS[task.priority] }}
        title={task.priority}
      />
      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[10px] transition-opacity ml-0.5"
        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        ×
      </button>
    </div>
  )
}
