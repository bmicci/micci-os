'use client'

import type { PromoDeadline, HelocKPIs } from '@/lib/financial-data'
import { fmt } from '@/lib/financial-data'

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PromoDeadlinesTab({ promos, helocKPIs }: { promos: PromoDeadline[]; helocKPIs: HelocKPIs }) {
  const sorted = [...promos].sort((a, b) => new Date(a.expires).getTime() - new Date(b.expires).getTime())
  const totalPromo = promos.reduce((s, p) => s + p.balance, 0)

  return (
    <div className="space-y-5">
      {/* Strategy Banner */}
      <div
        className="rounded-lg p-4 text-[13px]"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
      >
        <strong style={{ color: '#f59e0b' }}>⚠ Strategy:</strong>{' '}
        <span style={{ color: 'var(--text-secondary)' }}>
          All 0% promo balances are safe as long as they're paid from HELOC BEFORE expiry.
          Total promo balance: <strong style={{ color: 'var(--text-primary)' }}>{fmt(totalPromo)}</strong> across {promos.length} accounts.
          HELOC has <strong style={{ color: 'var(--text-primary)' }}>{fmt(helocKPIs.finalBuffer)}</strong> available after initial roll — {helocKPIs.finalBuffer >= totalPromo ? 'more than enough to cover all promos' : 'may need additional funds for full coverage'}.
        </span>
      </div>

      {/* Promo Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((p) => {
          const days = daysUntil(p.expires)
          const isExpired = days < 0
          const isUrgent = !isExpired && days < 90
          const isWarning = !isExpired && !isUrgent && days < 180

          const urgencyColor = isExpired ? '#22c55e' : isUrgent ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e'
          const borderColor = isExpired ? 'rgba(34,197,94,0.4)' : isUrgent ? 'rgba(239,68,68,0.4)' : isWarning ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)'
          const daysLabel = isExpired ? '✅ EXPIRED/PAID' : days === 0 ? 'DUE TODAY' : `${days} days`

          return (
            <div
              key={p.name}
              className="glass-card p-4"
              style={{ borderTop: `3px solid ${borderColor}` }}
            >
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                {p.acct}
              </div>
              <div className="text-[13px] font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {p.name}
              </div>
              <div
                className="text-[28px] font-extrabold leading-none my-2"
                style={{ color: urgencyColor }}
              >
                {daysLabel}
              </div>
              <div className="text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                {fmt(p.balance)} at 0% → expires{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{formatDate(p.expires)}</strong>
              </div>
              {p.risk ? (
                <div className="text-[12px] mb-2" style={{ color: '#ef4444' }}>
                  ⚠ Deferred interest at risk: {fmt(p.risk)}
                </div>
              ) : null}
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {p.note}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
