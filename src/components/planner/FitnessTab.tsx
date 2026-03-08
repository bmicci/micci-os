import { WEEKLY_TEMPLATE, RECOVERY_STACK, CLASSPASS } from '@/lib/planner-data'

export default function FitnessTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">💪 Fitness Blueprint</h2>
        <p className="text-xs text-[var(--text-muted)]">AM: stretch → heavy lift. PM: walk. ClassPass 2x/week evenings. Weekend recovery.</p>
      </div>

      {/* Weekly template */}
      <div className="bg-[var(--card-bg)] border border-emerald-500/30 rounded-xl px-4 py-4">
        <h3 className="text-sm font-bold text-emerald-400 mb-3">Weekly Template</h3>
        <div className="space-y-2.5">
          {WEEKLY_TEMPLATE.map((r, i) => (
            <div key={i} className="flex gap-3 text-xs leading-snug">
              <span className="font-bold text-[var(--text-primary)] w-8 shrink-0">{r.d}</span>
              <div className="flex-1 space-y-0.5">
                <div>
                  <span className="text-yellow-400 font-semibold">AM: </span>
                  <span className="text-[var(--text-muted)]">{r.am}</span>
                </div>
                <div>
                  <span className="text-indigo-400 font-semibold">PM: </span>
                  <span className="text-[var(--text-muted)]">{r.pm}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recovery stack */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">🧊 Recovery Stack</h3>
        <div className="space-y-2">
          {RECOVERY_STACK.map((r, i) => (
            <div key={i} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 flex gap-3 items-start">
              <span className="text-lg shrink-0">{r.icon}</span>
              <div>
                <div className="text-sm font-semibold text-cyan-400 mb-0.5">{r.title}</div>
                <div className="text-xs text-[var(--text-muted)] leading-snug">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ClassPass */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">🧘 ClassPass — Dallas (Tue + Thu 5-6 PM)</h3>
        <div className="space-y-2">
          {CLASSPASS.map((r, i) => (
            <div key={i} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3">
              <div className="text-sm font-semibold text-violet-400 mb-0.5">{r.type}</div>
              <div className="text-xs text-[var(--text-muted)] leading-snug">{r.studios}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
