interface ComparisonBadgeProps {
  delta: number
  pctChange?: number
  lowerIsBetter?: boolean
  format?: 'currency' | 'percent' | 'number'
  className?: string
}

function formatDelta(delta: number, format: string): string {
  if (format === 'currency') {
    const abs = Math.abs(delta)
    const prefix = delta >= 0 ? '+$' : '-$'
    return prefix + abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  if (format === 'percent') {
    return (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%'
  }
  return (delta >= 0 ? '+' : '') + delta.toLocaleString()
}

export default function ComparisonBadge({
  delta,
  pctChange,
  lowerIsBetter = false,
  format = 'currency',
  className = '',
}: ComparisonBadgeProps) {
  const isPositive = lowerIsBetter ? delta <= 0 : delta >= 0
  const color = isPositive ? '#22c55e' : '#ef4444'
  const bg = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium ${className}`}
      style={{ background: bg, color }}
    >
      {formatDelta(delta, format)}
      {pctChange != null && (
        <span className="opacity-70">
          ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%)
        </span>
      )}
    </span>
  )
}
