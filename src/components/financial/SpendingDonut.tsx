'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { SpendingCategory } from '@/lib/financial-data'

export default function SpendingDonut({ categories }: { categories: SpendingCategory[] }) {
  const data = categories.map(c => ({ name: c.cat, value: c.annual, color: c.color }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={2}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} stroke="rgba(0,0,0,0.3)" />
          ))}
        </Pie>
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
          layout="horizontal"
          verticalAlign="bottom"
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
