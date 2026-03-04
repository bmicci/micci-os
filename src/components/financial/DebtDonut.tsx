'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DebtAccount {
  balance: number | null
  recommendation: string | null
  account_type: string | null
}

interface DebtDonutProps {
  accounts: DebtAccount[] | null
}

const SEGMENTS = [
  { key: 'ROLL TO HELOC',   label: 'High Rate (HELOC target)', color: '#ef4444' },
  { key: 'HOLD - 0% PROMO', label: '0% Promo',                 color: '#eab308' },
  { key: 'KEEP',            label: 'Low Rate (Keep)',           color: '#22c55e' },
  { key: 'MORTGAGE',        label: 'Mortgage',                  color: '#3b82f6' },
  { key: 'FAMILY',          label: 'Family',                    color: '#a855f7' },
]

function getSegmentKey(rec: string | null, type: string | null): string {
  if (type === 'mortgage') return 'MORTGAGE'
  if (rec === 'FAMILY') return 'FAMILY'
  if (rec?.startsWith('HOLD')) return 'HOLD - 0% PROMO'
  if (rec === 'ROLL TO HELOC') return 'ROLL TO HELOC'
  return 'KEEP'
}

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

interface TooltipPayloadItem {
  name: string
  value: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="glass-card px-3 py-2 text-sm">
      <p className="text-[var(--text-primary)] font-medium">{item.name}</p>
      <p className="text-[var(--text-secondary)] font-mono">{fmt(item.value)}</p>
    </div>
  )
}

export default function DebtDonut({ accounts }: DebtDonutProps) {
  // Aggregate balances by segment
  const totals: Record<string, number> = {}
  for (const acct of accounts ?? []) {
    const key = getSegmentKey(acct.recommendation, acct.account_type)
    totals[key] = (totals[key] ?? 0) + (acct.balance ?? 0)
  }

  const data = SEGMENTS.map((seg) => ({ ...seg, value: totals[seg.key] ?? 0 })).filter(
    (d) => d.value > 0
  )

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="glass-card p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Debt Breakdown</h3>

      {/* Donut chart */}
      <div className="relative flex-1" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — absolutely positioned */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-[var(--text-muted)]">Total Debt</p>
          <p className="text-lg font-bold gradient-text leading-tight">{fmt(total)}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((d) => (
          <div key={d.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-[var(--text-secondary)] truncate">{d.label}</span>
            </div>
            <span className="text-[var(--text-primary)] font-mono ml-2 shrink-0">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
