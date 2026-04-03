'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { MonthlyProjection } from '@/types/finance'

interface Props {
  projections: MonthlyProjection[]
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}

// Custom tooltip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null

  const projection = payload[0]?.payload as MonthlyProjection | undefined

  return (
    <div
      className="p-3 rounded-lg shadow-xl text-[12px]"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(0,212,255,0.2)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fmtK(entry.value)}
          </span>
        </div>
      ))}
      {projection?.events && projection.events.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {projection.events.map((e, i) => (
            <div key={i} className="text-[11px]" style={{ color: '#f59e0b' }}>
              ⚡ {e}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CashFlowProjectionChart({ projections }: Props) {
  // Transform data for chart
  const chartData = projections.map(p => ({
    ...p,
    outflow: p.obligations + p.livingExpenses,
    hasEvent: p.events.length > 0,
  }))

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtK}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />

          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />

          {/* Stacked bars for income vs outflow */}
          <Bar
            dataKey="income"
            name="Income"
            fill="#22c55e"
            fillOpacity={0.7}
            radius={[3, 3, 0, 0]}
            barSize={20}
          />
          <Bar
            dataKey="outflow"
            name="Outflow"
            fill="#ef4444"
            fillOpacity={0.5}
            radius={[3, 3, 0, 0]}
            barSize={20}
          />

          {/* Free cash line */}
          <Line
            type="monotone"
            dataKey="freeCash"
            name="Free Cash"
            stroke="#00d4ff"
            strokeWidth={2}
            dot={{ r: 3, fill: '#00d4ff', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#00d4ff', stroke: '#fff', strokeWidth: 2 }}
          />

          {/* Cumulative savings trend */}
          <Line
            type="monotone"
            dataKey="cumulativeSavings"
            name="Cumulative Savings"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
