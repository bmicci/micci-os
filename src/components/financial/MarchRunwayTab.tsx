'use client'

import type { Bill } from '@/lib/financial-data'
import { fmt } from '@/lib/financial-data'
import KPICard from './KPICard'
import RunwayCashFlowChart from './RunwayCashFlowChart'

const statusBadge = (s: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    autopay: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: '✅ Autopay' },
    paid: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: '✅ Paid' },
    confirm: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '⚠ Confirm' },
    manual: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Manual' },
    recurring: { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', label: '🔁 Recurring' },
  }
  const style = map[s] || map.recurring
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  )
}

export default function MarchRunwayTab({ bills }: { bills: Bill[] }) {
  const totalBills = bills.reduce((s, b) => s + b.amount, 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="Starting Balance (est.)" value="~$8,000" note="Enter actual in Excel tracker" />
        <KPICard label="Mar 15 Paycheck" value="$4,652" note="Semi-monthly · $153,400/24" accent="green" />
        <KPICard label="Mar 31 Partial Check" value="~$1,598" note="Mar 16–19 · 4 days" />
        <KPICard label="Total Cash Available" value="~$14,250" note="$8K + $4,652 + $1,598" />
        <KPICard label="Total March Obligations" value="~$10,564" note="Confirmed strategy" accent="red" />
        <KPICard label="End-of-March Buffer" value="~$3,686" note="Before severance begins" accent="amber" />
      </div>

      {/* Bills Table */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
            March Bill Calendar
          </h3>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            All amounts verified from statements
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {['Due Date', 'Payee / Account', 'Amount', 'Type', 'Status', 'Notes'].map(h => (
                  <th
                    key={h}
                    className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.map((b, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: i < bills.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                >
                  <td className="py-2 px-3 text-[12px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                    {b.date}
                  </td>
                  <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                    {b.payee}
                  </td>
                  <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {fmt(b.amount)}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                    >
                      {b.type}
                    </span>
                  </td>
                  <td className="py-2 px-3">{statusBadge(b.status)}</td>
                  <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {b.note}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <td colSpan={2} className="py-3 px-3 text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  MARCH TOTAL (confirmed strategy)
                </td>
                <td className="py-3 px-3 text-[13px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  {fmt(totalBills)}
                </td>
                <td colSpan={3} className="py-3 px-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Base $7,950 + Plat plans $501 + Gold adj $2,112
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          March Cash Flow Timeline
        </h3>
        <RunwayCashFlowChart />
      </div>
    </div>
  )
}
