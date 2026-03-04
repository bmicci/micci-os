import { createClient } from '@/lib/supabase/server'
import DocumentUpload from '@/components/DocumentUpload'

export const metadata = { title: 'Goals + Vision — Micci OS' }

// ── Types ──────────────────────────────────────────────────────────────────

interface GoalCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
  description: string | null
}

interface Goal {
  id: string
  category_id: string | null
  title: string
  description: string | null
  status: 'active' | 'completed' | 'paused' | 'archived'
  priority: number | null
  target_date: string | null
  completed_at: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
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

function isOverdue(d: string | null) {
  if (!d) return false
  return new Date(d) < new Date()
}

// ── Sub-components ─────────────────────────────────────────────────────────

function GoalRow({ goal }: { goal: Goal }) {
  const overdue = goal.status === 'active' && isOverdue(goal.target_date)
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 rounded px-2 -mx-2 transition-colors">
      <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0 mt-0.5 ${PRIORITY_STYLES[goal.priority ?? 3]}`}>
        P{goal.priority ?? 3}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${goal.status === 'completed' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
          {goal.title}
        </p>
        {goal.target_date && (
          <p className={`text-xs mt-0.5 ${overdue ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
            {overdue ? '⚠ ' : ''}Due {fmtDate(goal.target_date)}
          </p>
        )}
      </div>
      <span className={`text-[10px] font-medium rounded px-2 py-0.5 shrink-0 capitalize ${STATUS_STYLES[goal.status]}`}>
        {goal.status}
      </span>
    </div>
  )
}

function CategoryCard({ category, goals }: { category: GoalCategory; goals: Goal[] }) {
  const active    = goals.filter((g) => g.status === 'active').length
  const completed = goals.filter((g) => g.status === 'completed').length
  const total     = goals.length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0

  const sorted = [...goals].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (b.status === 'completed' && a.status !== 'completed') return -1
    return (a.priority ?? 5) - (b.priority ?? 5)
  })

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-white/8">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">{category.icon ?? '🎯'}</span>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{category.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>{active} active</span>
            {completed > 0 && <span>· {completed} done</span>}
          </div>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: category.color ?? 'var(--accent-cyan)' }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">{pct}%</span>
          </div>
        )}
      </div>
      <div className="px-4 pb-2">
        {sorted.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-4 text-center">No goals yet</p>
        ) : (
          sorted.map((g) => <GoalRow key={g.id} goal={g} />)
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function GoalsPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: goals }] = await Promise.all([
    supabase.from('goal_categories').select('*').order('name'),
    supabase.from('goals').select('*').order('priority').order('target_date'),
  ])

  const cats     = (categories ?? []) as GoalCategory[]
  const allGoals = (goals ?? []) as Goal[]

  const totalActive    = allGoals.filter((g) => g.status === 'active').length
  const totalCompleted = allGoals.filter((g) => g.status === 'completed').length
  const p1Active       = allGoals.filter((g) => g.status === 'active' && g.priority === 1).length
  const overdue        = allGoals.filter((g) => g.status === 'active' && isOverdue(g.target_date)).length

  const goalsByCategory = cats.reduce<Record<string, Goal[]>>((acc, cat) => {
    acc[cat.id] = allGoals.filter((g) => g.category_id === cat.id)
    return acc
  }, {})

  const sortedCats = [...cats].sort((a, b) => {
    const aActive = (goalsByCategory[a.id] ?? []).filter((g) => g.status === 'active').length
    const bActive = (goalsByCategory[b.id] ?? []).filter((g) => g.status === 'active').length
    return bActive - aActive
  })

  return (
    <div className="px-6 md:px-10 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-1">🎯 Goals + Vision</h1>
        <p className="text-[var(--text-secondary)] text-sm">Active goals · Progress tracking · Life categories</p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white/5 rounded-lg px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Active</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{totalActive}</p>
        </div>
        <div className="bg-white/5 rounded-lg px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">P1 Priority</p>
          <p className="text-2xl font-semibold text-red-400">{p1Active}</p>
        </div>
        {overdue > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-xs text-red-400/70 uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-semibold text-red-400">{overdue}</p>
          </div>
        )}
        <div className="bg-white/5 rounded-lg px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-semibold text-green-400">{totalCompleted}</p>
        </div>
        <div className="bg-white/5 rounded-lg px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Categories</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{cats.length}</p>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedCats.map((cat) => (
          <CategoryCard key={cat.id} category={cat} goals={goalsByCategory[cat.id] ?? []} />
        ))}
      </div>

      {/* Document Upload */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">📎 Documents</h2>
        <DocumentUpload section="goals" />
      </section>
    </div>
  )
}
