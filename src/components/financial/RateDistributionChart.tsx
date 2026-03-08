'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { DebtAccount } from '@/lib/financial-data'

const BUCKETS = [
  { label: '0% promo', min: 0, max: 0, color: '#22c55e' },
  { label: '0–5.87%', min: 0.01, max: 5.87, color: '#22c55eaa' },
  { label: '5.88–6.85%', min: 5.88, max: 6.85, color: '#f59e0b' },
  { label: '6.86–15%', min: 6.86, max: 15, color: '#ef4444aa' },
  { label: '15–30%+', min: 15.01, max: 100, color: '#ef4444' },
]

export default function RateDistributionChart({ debts }: { debts: DebtAccount[] }) {
  const nonMortgage = debts.filter(d => d.category !== 'Mortgage')

  const data = BUCKETS.map(b => ({
    name: b.label,
    value: nonMortgage
      .filter(d => d.rate >= b.min && d.rate <= b.max)
      .reduce((s, d) => s + d.balance, 0),
    color: b.color,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
        <XAxis
          type="number"
          tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          width={80}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) =>
            '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          }
          contentStyle={{
            background: '#1a1a2e',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 8,
            color: '#f0f6ff',
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
