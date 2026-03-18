interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  change?: number // positive = green, negative = red
  accent?: boolean
  className?: string
}

function fmt(v: string | number): string {
  if (typeof v === 'number') {
    if (Math.abs(v) >= 1000) {
      return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
    return String(v)
  }
  return v
}

export default function MetricCard({ label, value, sub, change, accent, className = '' }: MetricCardProps) {
  const changeColor = change == null ? '' : change >= 0 ? '#22c55e' : '#ef4444'
  const changePrefix = change == null ? '' : change >= 0 ? '+' : ''

  return (
    <div
      className={`flex flex-col gap-1 p-4 rounded-xl transition-all ${className}`}
      style={{
        background: accent ? 'rgba(0,212,255,0.08)' : 'var(--card-bg)',
        border: `1px solid ${accent ? 'rgba(0,212,255,0.3)' : 'var(--card-border)'}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className="text-xl font-bold font-mono"
          style={{ color: accent ? 'var(--accent-cyan)' : 'var(--text-primary)' }}
        >
          {fmt(value)}
        </span>
        {change != null && (
          <span className="text-xs font-medium font-mono" style={{ color: changeColor }}>
            {changePrefix}{fmt(change)}
          </span>
        )}
      </div>
      {sub && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}
