// DeadlineTimeline — critical financial deadlines with countdown
// Pure server component — days remaining computed in page.tsx and passed as props

export interface Deadline {
  date: string
  label: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  note: string
  daysRemaining: number | null
}

interface DeadlineTimelineProps {
  deadlines: Deadline[]
}

const URGENCY_STYLES: Record<
  string,
  { border: string; badge: string; countdownColor: string }
> = {
  critical: {
    border: 'border-l-red-500',
    badge: 'bg-red-500/20 text-red-300 border border-red-500/30',
    countdownColor: 'text-red-400',
  },
  high: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    countdownColor: 'text-orange-400',
  },
  medium: {
    border: 'border-l-yellow-500',
    badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    countdownColor: 'text-yellow-400',
  },
  low: {
    border: 'border-l-blue-500/60',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    countdownColor: 'text-blue-400',
  },
}

export default function DeadlineTimeline({ deadlines }: DeadlineTimelineProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
        ⏰ Critical Deadlines
      </h2>

      <div className="space-y-3">
        {deadlines.map((d, i) => {
          const sty = URGENCY_STYLES[d.urgency] ?? URGENCY_STYLES.low
          return (
            <div
              key={i}
              className={`glass-card p-4 border-l-4 ${sty.border}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${sty.badge}`}>
                      {d.urgency}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{d.date}</span>
                    {d.daysRemaining != null && (
                      <span className={`text-xs font-mono font-semibold ${sty.countdownColor}`}>
                        {d.daysRemaining}d remaining
                      </span>
                    )}
                    {d.daysRemaining != null && d.daysRemaining <= 7 && (
                      <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-semibold animate-pulse">
                        ⚠️ THIS WEEK
                      </span>
                    )}
                  </div>

                  <p className="font-semibold text-[var(--text-primary)]">{d.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {d.note}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
