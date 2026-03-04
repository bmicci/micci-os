import Link from 'next/link'

interface Goal {
  id: string
  title: string
  status: string
  priority: number | null
  target_date: string | null
}

interface Props {
  goals: Goal[] | null
}

const P_COLORS: Record<number, string> = {
  1: 'text-red-400 bg-red-500/10',
  2: 'text-orange-400 bg-orange-500/10',
  3: 'text-yellow-400 bg-yellow-500/10',
}

function isOverdue(d: string | null) {
  return d ? new Date(d) < new Date() : false
}

export default function GoalsSummary({ goals }: Props) {
  const all = goals ?? []
  const active = all.filter(g => g.status === 'active')
  const overdue = active.filter(g => isOverdue(g.target_date))
  const p1s = active.filter(g => g.priority === 1).slice(0, 5)
  const rest = active.filter(g => g.priority !== 1).sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9)).slice(0, 3 - p1s.length)
  const shown = [...p1s, ...rest].slice(0, 5)

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          🎯 Active Goals
        </h2>
        <Link href="/goals" className="text-xs text-[var(--accent-cyan)] hover:underline">
          View all →
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-[var(--text-secondary)]">
          {active.length} active
        </span>
        {overdue.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/25">
            {overdue.length} overdue
          </span>
        )}
        {p1s.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">
            {p1s.length} P1
          </span>
        )}
      </div>

      {/* Goal list */}
      <div className="flex flex-col gap-2">
        {shown.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">No active goals</p>
        )}
        {shown.map((g) => {
          const pClass = P_COLORS[g.priority ?? 5] ?? 'text-gray-400 bg-gray-500/10'
          const od = isOverdue(g.target_date)
          return (
            <div key={g.id} className="flex items-center gap-2.5 py-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${pClass}`}>
                P{g.priority ?? '—'}
              </span>
              <p className={`text-sm flex-1 min-w-0 truncate ${od ? 'text-red-300' : 'text-[var(--text-primary)]'}`}>
                {g.title}
              </p>
              {od && <span className="text-[10px] text-red-400 flex-shrink-0">overdue</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
