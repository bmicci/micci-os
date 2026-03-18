'use client'

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export interface WaterfallItem {
  label: string
  value: number
  type: 'income' | 'deduction' | 'net' | 'obligation' | 'expense'
}

interface WaterfallChartProps {
  items: WaterfallItem[]
  height?: number
}

const TYPE_COLORS: Record<WaterfallItem['type'], string> = {
  income: '#22c55e',
  deduction: '#ef4444',
  obligation: '#f59e0b',
  expense: '#6b7280',
  net: '#00d4ff',
}

interface WaterfallDataPoint {
  label: string
  start: number
  value: number
  total: number
  type: WaterfallItem['type']
  isNegative: boolean
}

function buildWaterfallData(items: WaterfallItem[]): WaterfallDataPoint[] {
  let running = 0
  return items.map(item => {
    const isNeg = item.type !== 'income' && item.type !== 'net'
    const absVal = Math.abs(item.value)
    const start = isNeg ? running - absVal : running
    const end = isNeg ? running : running + absVal
    if (item.type !== 'net') {
      running = end
    }
    return {
      label: item.label,
      start: isNeg ? start : running - absVal,
      value: absVal,
      total: end,
      type: item.type,
      isNegative: isNeg,
    }
  })
}

function fmtK(v: number) {
  return '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0))
}

export default function WaterfallChart({ items, height = 260 }: WaterfallChartProps) {
  const data = buildWaterfallData(items)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'rgba(240,246,255,0.4)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtK}
          tick={{ fill: 'rgba(240,246,255,0.4)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value: unknown) => ['$' + Number(value).toLocaleString()]}
          contentStyle={{
            background: 'rgba(10,14,39,0.95)',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 12,
          }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        {/* Invisible spacer bar to set baseline */}
        <Bar dataKey="start" stackId="stack" fill="transparent" />
        {/* Visible bar */}
        <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={TYPE_COLORS[entry.type]} fillOpacity={entry.type === 'net' ? 1 : 0.85} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}
