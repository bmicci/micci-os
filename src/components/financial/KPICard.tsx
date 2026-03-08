interface KPICardProps {
  label: string
  value: string
  note?: string
  accent?: 'cyan' | 'red' | 'green' | 'amber'
}

const accentColors = {
  cyan: 'var(--accent-cyan)',
  red: '#ef4444',
  green: '#22c55e',
  amber: '#f59e0b',
}

export default function KPICard({ label, value, note, accent = 'cyan' }: KPICardProps) {
  const color = accentColors[accent]

  return (
    <div
      className="glass-card p-4 sm:p-5"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div
        className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </div>
      <div
        className="text-xl sm:text-2xl font-extrabold leading-none"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </div>
      {note && (
        <div
          className="text-[11px] mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          {note}
        </div>
      )}
    </div>
  )
}
