'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { PlanMonth } from '@/lib/finance/helocPlan'
import { HELOC_LIMIT } from '@/lib/financial-data'

interface Props {
  months: PlanMonth[]
}

function fmtRound(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export default function HELOCDrawdownTimeline({ months }: Props) {
  const timeline = months.map(m => ({
    month: m.label,
    drawn: Math.min(m.endBalance, HELOC_LIMIT),
    available: Math.max(HELOC_LIMIT - m.endBalance, 0),
    event: m.draws.length > 0
      ? m.draws.map(d => `${d.label}: ${fmtRound(d.amount)}`).join(' · ')
      : undefined,
  }))

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
          📈 HELOC Drawdown Timeline — Projected Utilization
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {months[0]?.label} → {months[months.length - 1]?.label}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={timeline} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            interval={0}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
            domain={[0, HELOC_LIMIT + 10000]}
          />
          <Tooltip
            contentStyle={{
              background: '#1a1f2e',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 8,
              fontSize: 12,
              color: '#e2e8f0',
            }}
            formatter={(value, name) => [
              fmtRound(Number(value)),
              name === 'drawn' ? 'Amount Drawn' : 'Available',
            ]}
            labelFormatter={(label) => {
              const point = timeline.find(t => t.month === label)
              return point?.event ? `${label} — ${point.event}` : label
            }}
          />
          <ReferenceLine
            y={HELOC_LIMIT}
            stroke="#ef4444"
            strokeDasharray="6 3"
            label={{
              value: `$${(HELOC_LIMIT / 1000).toFixed(0)}K Limit`,
              position: 'right',
              fill: '#ef4444',
              fontSize: 10,
            }}
          />
          <Area
            type="stepAfter"
            dataKey="drawn"
            stackId="1"
            fill="rgba(239,68,68,0.15)"
            stroke="#ef4444"
            strokeWidth={2}
            name="drawn"
          />
          <Area
            type="stepAfter"
            dataKey="available"
            stackId="1"
            fill="rgba(34,197,94,0.08)"
            stroke="#22c55e"
            strokeWidth={1}
            strokeDasharray="4 2"
            name="available"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Key events legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block" style={{ background: '#ef4444' }} /> Amount Drawn
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block" style={{ background: '#22c55e', borderStyle: 'dashed' }} /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block" style={{ background: '#ef4444', borderStyle: 'dashed' }} /> HELOC Limit
        </span>
      </div>
    </div>
  )
}
