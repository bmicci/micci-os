'use client'

import type { UpcomingItem } from '@/lib/finance/upcoming'

// Everything time-critical in one place: predicted bills, promo cliffs,
// and due actions — date-sorted so the next thing is at the top.

const KIND_META: Record<UpcomingItem['kind'], { icon: string; color: string }> = {
  promo: { icon: '⏳', color: '#ef4444' },
  action: { icon: '🎯', color: '#f59e0b' },
  bill: { icon: '💳', color: '#60a5fa' },
}

function whenLabel(daysAway: number, date: string): string {
  if (daysAway < 0) return `${Math.abs(daysAway)}d overdue`
  if (daysAway === 0) return 'today'
  if (daysAway === 1) return 'tomorrow'
  if (daysAway <= 14) return `in ${daysAway}d`
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function UpNextRail({ items, limit = 8, compact = false }: {
  items: UpcomingItem[]
  limit?: number
  compact?: boolean
}) {
  const shown = items.slice(0, limit)
  const billTotal = items.filter(i => i.kind === 'bill').reduce((s, i) => s + (i.amount ?? 0), 0)

  return (
    <div className={compact ? '' : 'glass-card p-5'}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
          📅 Up Next
        </h3>
        <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
          next 45 days{billTotal > 0 ? ` · ~$${Math.round(billTotal).toLocaleString()} in bills` : ''}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="text-[12px] py-3" style={{ color: 'var(--text-muted)' }}>
          Nothing scheduled in the next 45 days. Bills appear here automatically once a
          merchant charges twice.
        </p>
      ) : (
        <div>
          {shown.map((item, i) => {
            const meta = KIND_META[item.kind]
            const color = item.urgent ? meta.color : 'var(--text-secondary)'
            return (
              <div key={`${item.kind}-${item.label}-${i}`}
                className="flex items-center gap-3 py-2 text-[12.5px]"
                style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 13 }}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium" style={{ color: item.urgent ? meta.color : 'var(--text-primary)' }}>
                    {item.label}
                  </div>
                  {!compact && (
                    <div className="text-[10.5px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {item.detail}
                    </div>
                  )}
                </div>
                {item.amount != null && (
                  <span className="font-mono text-[11.5px] shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    ${Math.round(item.amount).toLocaleString()}
                  </span>
                )}
                <span className="font-mono text-[11px] shrink-0 text-right" style={{ color, minWidth: 62 }}>
                  {whenLabel(item.daysAway, item.date)}
                </span>
              </div>
            )
          })}
          {items.length > limit && (
            <p className="text-[10.5px] mt-2" style={{ color: 'var(--text-muted)' }}>
              + {items.length - limit} more
            </p>
          )}
        </div>
      )}
    </div>
  )
}
