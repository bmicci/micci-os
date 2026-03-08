import { SLEEP_RULES } from '@/lib/planner-data'

export default function SleepTab() {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">🌙 Sleep Protocol</h2>
        <p className="text-xs text-[var(--text-muted)]">8 hours. 11 PM → 7 AM. Non-negotiable foundation.</p>
      </div>

      <div className="space-y-2">
        {SLEEP_RULES.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3"
          >
            <span className="text-base shrink-0">{s.icon}</span>
            <span className="text-sm text-[var(--text-secondary)] leading-snug">{s.rule}</span>
          </div>
        ))}
      </div>

      <div className="bg-[var(--card-bg)] border border-indigo-500/30 rounded-xl px-4 py-4 mt-2">
        <h3 className="text-sm font-bold text-indigo-400 mb-2">Why This Is Priority #0</h3>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Sleep multiplies everything — gym recovery, interview sharpness, decision quality on the HELOC and legal case.
          Targeting sub-200 lbs at 12% body fat requires cortisol management. Without 8 hrs, recovery tanks and discipline erodes.
        </p>
      </div>
    </div>
  )
}
