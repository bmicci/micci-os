'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const data = [
  { name: 'SoFi', before: 1464, after: 325 },
  { name: 'Wells Fargo', before: 1100, after: 122 },
  { name: 'VFCU', before: 350, after: 106 },
  { name: 'AmEx Plat', before: 501, after: 32 },
  { name: 'AmEx Gold', before: 182, after: 10 },
  { name: 'Nordstrom', before: 40, after: 4 },
]

export default function HELOCBarChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickFormatter={(v) => `$${v}`}
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
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
        />
        <Bar dataKey="before" name="Current Payment" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="after" name="HELOC Payment" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
