import { RULES, SUCCESS } from '@/lib/planner-data'

export default function RulesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">⚙️ Operating Rules</h2>
        <p className="text-xs text-[var(--text-muted)]">Guard against burnout and reactive mode.</p>
      </div>

      <div className="space-y-2">
        {RULES.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3"
          >
            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] shrink-0">
              {i + 1}
            </span>
            <span className="text-sm text-[var(--text-secondary)] leading-snug">{r}</span>
          </div>
        ))}
      </div>

      <div className="bg-[var(--card-bg)] border border-red-500/30 rounded-xl px-4 py-4">
        <h3 className="text-sm font-bold text-red-400 mb-3">Success = End of 3 Weeks</h3>
        <div className="space-y-1.5">
          {SUCCESS.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-muted)] leading-snug">
              <span className="shrink-0 mt-0.5">✅</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
