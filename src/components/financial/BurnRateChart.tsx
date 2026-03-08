'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { BurnRateItem } from '@/lib/financial-data'

export default function BurnRateChart({ burnRate }: { burnRate: BurnRateItem[] }) {
  const data = burnRate.map(b => ({
    name: b.label.length > 20 ? b.label.slice(0, 18) + '…' : b.label,
    current: b.current,
    survival: b.survival,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          type="number"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <Tooltip
          contentStyle={{
            background: '#1a1f2e',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: '#e2e8f0',
          }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        <Bar dataKey="current" name="Current /mo" fill="#ef4444" radius={[0, 4, 4, 0]} />
        <Bar dataKey="survival" name="Survival /mo" fill="#22c55e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
