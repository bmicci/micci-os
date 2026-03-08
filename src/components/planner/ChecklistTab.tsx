import { MAR19, CAT, CC } from '@/lib/planner-data'

interface Props {
  completions: Set<string>
  toggle: (key: string) => void
}

export default function ChecklistTab({ completions, toggle }: Props) {
  const done = MAR19.filter((_, i) => completions.has(`cl-${i}`)).length

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">📋 March 19 Deadline</h2>
          <p className="text-xs text-[var(--text-muted)]">Must complete before JPMC last day. Tap to check off.</p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Done</div>
          <div
            className="text-2xl font-bold"
            style={{ color: done === MAR19.length ? '#34d399' : done >= MAR19.length / 2 ? '#fbbf24' : '#818cf8' }}
          >
            {done}/{MAR19.length}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.round((done / MAR19.length) * 100)}%`,
            background: done === MAR19.length ? '#34d399' : 'var(--accent-gradient)',
          }}
        />
      </div>

      <div className="space-y-2 pt-1">
        {MAR19.map((item, i) => {
          const key = `cl-${i}`
          const checked = completions.has(key)
          const color = CC[item.c]

          return (
            <button
              key={i}
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 cursor-pointer"
              style={{
                background: checked ? 'rgba(20,83,45,0.3)' : 'var(--card-bg)',
                borderColor: checked ? 'rgba(52,211,153,0.3)' : 'var(--card-border)',
                opacity: checked ? 0.65 : 1,
              }}
            >
              {/* Checkbox */}
              <div
                className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all"
                style={{
                  borderColor: checked ? '#34d399' : 'rgba(255,255,255,0.15)',
                  background: checked ? 'rgba(20,83,45,0.6)' : 'transparent',
                }}
              >
                {checked && <span className="text-[11px] text-emerald-400">✓</span>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color }}>
                  {CAT[item.c].label}
                </div>
                <div
                  className="text-sm leading-snug"
                  style={{
                    color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: checked ? 'line-through' : 'none',
                  }}
                >
                  {item.t}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
