import Link from 'next/link'

interface Supplement { id: string; name: string; is_active: boolean; timing: string | null }
interface HormoneProtocol {
  id: string
  name: string
  substance: string
  dosage: string | null
  day_of_week: string[] | null
  time_of_day: string | null
  is_active: boolean
}

interface Props {
  supplements: Supplement[] | null
  protocols: HormoneProtocol[] | null
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function HealthQuickView({ supplements, protocols }: Props) {
  const supps = supplements ?? []
  const protos = protocols ?? []

  const activeSupps = supps.filter(s => s.is_active)
  const todayDay = DAYS[new Date().getDay()]

  const todayProtocols = protos.filter(p =>
    p.is_active && (p.day_of_week?.includes(todayDay) || p.day_of_week?.includes('Daily'))
  )

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          🏋️ Health Quick View
        </h2>
        <Link href="/health" className="text-xs text-[var(--accent-cyan)] hover:underline">
          Full protocols →
        </Link>
      </div>

      {/* Supplement count */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-[var(--text-secondary)]">
          {activeSupps.length} active supplements
        </span>
        {todayProtocols.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
            {todayProtocols.length} protocols today
          </span>
        )}
      </div>

      {/* Today's protocols */}
      {todayProtocols.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Today — {todayDay}</p>
          {todayProtocols.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] truncate">{p.substance}</p>
                {p.dosage && <p className="text-[11px] text-[var(--text-muted)]">{p.dosage}</p>}
              </div>
              {p.time_of_day && (
                <span className="text-[10px] text-[var(--text-muted)] font-mono flex-shrink-0">{p.time_of_day}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Top supplements</p>
          {activeSupps.slice(0, 4).map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <p className="text-sm text-[var(--text-secondary)] flex-1 min-w-0 truncate">{s.name}</p>
              {s.timing && <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{s.timing}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
