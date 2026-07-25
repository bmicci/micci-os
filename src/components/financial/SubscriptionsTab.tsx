'use client'

import type { RecurringAnalysis, RecurringCharge } from '@/lib/financial-data'
import KPICard from './KPICard'

// Live recurring-charge view — detected from imported transactions on every
// load (see lib/finance/recurring.ts). Replaces the frozen 2025 audit list.

function formatDate(dateStr: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T00:00:00' : dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CADENCE_LABEL: Record<RecurringCharge['cadence'], string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

function PriceTrend({ pct }: { pct: number | null }) {
  if (pct == null || Math.abs(pct) < 3) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>
  }
  const up = pct > 0
  return (
    <span className="font-semibold" style={{ color: up ? '#ef4444' : '#22c55e' }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function ChargeTable({ charges, showStatusDate }: { charges: RecurringCharge[]; showStatusDate?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {['Service', 'Cadence', 'Monthly', 'Last Charged', 'Price Trend', ''].map(h => (
              <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {charges.map((c, i) => (
            <tr key={c.key} style={{ borderBottom: i < charges.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                {c.name}
                <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.category}</span>
              </td>
              <td className="py-2 px-3" style={{ color: 'var(--text-muted)' }}>
                {CADENCE_LABEL[c.cadence]}
                {c.cadence !== 'monthly' && (
                  <span className="ml-1 text-[10px]">(${c.lastAmount.toFixed(2)}/chg)</span>
                )}
              </td>
              <td className="py-2 px-3 font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                ${c.monthlyCost.toFixed(2)}
              </td>
              <td className="py-2 px-3 font-mono" style={{ color: showStatusDate ? '#f59e0b' : 'var(--text-muted)' }}>
                {formatDate(c.lastCharged)}
              </td>
              <td className="py-2 px-3">
                <PriceTrend pct={c.priceChangePct} />
              </td>
              <td className="py-2 px-3">
                {c.zombie && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                  >
                    🧟 ZOMBIE — on cancel list, still charging
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SubscriptionsTab({ recurring }: { recurring: RecurringAnalysis }) {
  if (!recurring.hasData) {
    return (
      <div className="glass-card p-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
        No imported transactions yet — drop account CSVs at <strong style={{ color: '#60a5fa' }}>/import</strong> and
        recurring charges will be detected automatically.
      </div>
    )
  }

  const subs = recurring.active.filter(c => c.kind === 'subscription')
  const bills = recurring.active.filter(c => c.kind === 'bill')
  const zombies = recurring.active.filter(c => c.zombie)

  return (
    <div className="space-y-5">
      {/* Data provenance */}
      <div
        className="rounded-lg p-3 text-[12px]"
        style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-secondary)' }}
      >
        ⚙️ Detected live from imported transactions through{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{formatDate(recurring.dataEnd)}</strong> — a merchant counts as
        recurring when it charges on a regular cadence with a stable amount. Re-import CSVs at /import to refresh.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard
          label="Active Recurring (Monthly)"
          value={`$${recurring.activeMonthlyTotal.toFixed(0)}`}
          note={`${recurring.active.length} recurring charges`}
          accent="cyan"
        />
        <KPICard
          label="Subscriptions"
          value={`$${recurring.subsMonthlyTotal.toFixed(2)}/mo`}
          note={`${subs.length} services — all cancellable`}
          accent="amber"
        />
        <KPICard
          label="Bills & Fixed"
          value={`$${recurring.billsMonthlyTotal.toFixed(0)}/mo`}
          note={`${bills.length} obligations (shop annually)`}
        />
        <KPICard
          label="Recently Stopped"
          value={`$${recurring.lapsedMonthlySavings.toFixed(0)}/mo`}
          note="Freed up in the last 6 months"
          accent="green"
        />
        <KPICard
          label="Flags"
          value={`${recurring.zombieCount} 🧟 · ${recurring.creepCount} ▲`}
          note="Zombies · price increases"
          accent={recurring.zombieCount > 0 ? 'red' : undefined}
        />
      </div>

      {/* Zombie alert */}
      {zombies.length > 0 && (
        <div
          className="rounded-lg p-4 text-[13px]"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <strong style={{ color: '#ef4444' }}>🧟 Zombie charges:</strong>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            {zombies.map(z => z.name).join(', ')} — marked cancel in the 2025 audit but still charging
            (${zombies.reduce((s, z) => s + z.monthlyCost, 0).toFixed(2)}/mo). Cancel these first.
          </span>
        </div>
      )}

      {/* Active subscriptions */}
      <div className="glass-card p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#f59e0b' }}>
          💳 Active Subscriptions — ${recurring.subsMonthlyTotal.toFixed(2)}/mo
        </h3>
        <ChargeTable charges={subs} />
      </div>

      {/* Active bills */}
      <div className="glass-card p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#60a5fa' }}>
          🏠 Bills & Fixed Obligations — ${recurring.billsMonthlyTotal.toFixed(2)}/mo
        </h3>
        <ChargeTable charges={bills} />
      </div>

      {/* Stopped charging */}
      {recurring.lapsed.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#22c55e' }}>
            ✅ Stopped Charging — no longer detected
          </h3>
          <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
            Cancelled services and paid-off obligations, newest first. Last-charged date shown in amber.
          </p>
          <ChargeTable charges={recurring.lapsed} showStatusDate />
        </div>
      )}
    </div>
  )
}
