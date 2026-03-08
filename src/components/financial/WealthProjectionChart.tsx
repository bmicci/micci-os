'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import type { WealthScenario } from '@/lib/financial-data'
import { calcWealth } from '@/lib/financial-data'

export default function WealthProjectionChart({ scenarios }: { scenarios: WealthScenario[] }) {
  // Generate data points for ages 40-60 (years 0-20)
  const data = Array.from({ length: 21 }, (_, i) => {
    const point: Record<string, number | string> = { age: 40 + i }
    scenarios.forEach(s => {
      point[s.name] = Math.round(calcWealth(410000, s.pmt, s.r, i))
    })
    return point
  })

  const milestones = [
    { value: 1000000, label: '$1M' },
    { value: 2500000, label: '$2.5M' },
    { value: 5000000, label: '$5M' },
  ]

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="age"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          label={{ value: 'Age', position: 'insideBottomRight', offset: -5, fill: '#94a3b8', fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`}
        />
        <Tooltip
          contentStyle={{
            background: '#1a1f2e',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: '#e2e8f0',
          }}
          formatter={(value) => [`$${(Number(value) / 1e6).toFixed(2)}M`, '']}
          labelFormatter={(label) => `Age ${label}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        {milestones.map(m => (
          <ReferenceLine
            key={m.value}
            y={m.value}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="4 4"
            label={{ value: m.label, fill: '#64748b', fontSize: 10, position: 'right' }}
          />
        ))}
        {scenarios.map(s => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            name={`${s.name} (${s.label})`}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
