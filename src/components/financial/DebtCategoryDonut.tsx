'use client'

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import type { DebtAccount } from '@/lib/financial-data'

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899']

export default function DebtCategoryDonut({ debts }: { debts: DebtAccount[] }) {
  const catData: Record<string, number> = {}
  debts
    .filter(d => d.category !== 'Mortgage')
    .forEach(d => {
      catData[d.category] = (catData[d.category] || 0) + d.balance
    })

  const data = Object.entries(catData).map(([name, value]) => ({ name, value }))

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="50%"
          outerRadius="78%"
          dataKey="value"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          contentStyle={{
            background: '#1a1a2e',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 8,
            color: '#f0f6ff',
            fontSize: 12,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
