import type { FinancialData } from '@/lib/financial-data'
import { getDebtTotals, getModuleCounts, fmtK, fmt } from '@/lib/financial-data'
import KPICard from './KPICard'
import DebtDonut from './DebtDonut'

// ── Priority dot colors ──
const dotColor = {
  red: '#ef4444',
  amber: '#f59e0b',
  blue: 'var(--accent-cyan)',
}

// ── Status styling ──
const statusStyle = {
  done: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: '✅ Complete' },
  progress: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: '🔵 In Progress' },
  pending: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: '⬜ Pending' },
  urgent: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: '🔴 Urgent' },
}

export default function OverviewTab({ data }: { data: FinancialData }) {
  const { debts, modules, deadlines, actionItems } = data
  const totals = getDebtTotals(debts)
  const modCounts = getModuleCounts(modules)

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          label="Total Debt (excl. mortgage)"
          value={fmtK(totals.total)}
          note="Mortgage: $498,903 @ 3.375%"
          accent="red"
        />
        <KPICard
          label="Immediate HELOC Roll"
          value="$110,630"
          note="At close — high-rate accounts"
        />
        <KPICard
          label="Monthly Payment Relief"
          value="$2,860"
          note="After HELOC replaces high-rate debt"
          accent="green"
        />
        <KPICard
          label="March Cash Buffer"
          value="~$3,686"
          note="After all March obligations"
          accent="amber"
        />
        <KPICard
          label="HELOC Available"
          value="$85,000"
          note="After initial roll · covers all promos"
        />
        <KPICard
          label="Modules Complete"
          value={`${modCounts.complete}/${modCounts.total}`}
          note={`${modCounts.inProgress} in progress`}
        />
      </div>

      {/* Action Items + Module Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Action Items */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            🚨 Immediate Action Items
          </h3>
          <ul className="space-y-0">
            {actionItems.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 py-2.5"
                style={{ borderBottom: i < actionItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <span
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ background: dotColor[item.priority] }}
                />
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.detail}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Module Progress */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            📊 Module Progress
          </h3>
          <div className="space-y-0">
            {modules.map((m) => {
              const s = statusStyle[m.status]
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 py-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0"
                    style={{ background: s.bg, color: s.color }}
                  >
                    M{m.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {m.name}
                    </div>
                    <div className="h-[5px] rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${m.pct}%`, background: s.color }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {m.pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Debt Donut + Key Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Debt Breakdown Donut */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              💰 Debt Breakdown by Type
            </h3>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>excl. mortgage</span>
          </div>
          <DebtDonut debts={debts} />
        </div>

        {/* Key Deadlines */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            📅 Key Deadlines — 2026
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</th>
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Event</th>
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Amount</th>
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((d, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: i < deadlines.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                  >
                    <td className="py-2 px-3 font-semibold whitespace-nowrap text-[12px]" style={{ color: 'var(--text-primary)' }}>
                      {d.date}
                    </td>
                    <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      {d.event}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {d.amount ? fmt(d.amount) : '—'}
                    </td>
                    <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      {d.risk}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
