'use client'

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import type { DebtAccount } from '@/lib/financial-data'

interface DebtDonutProps {
  debts: DebtAccount[]
}

const DONUT_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e']

export default function DebtDonut({ debts }: DebtDonutProps) {
  const nonMortgage = debts.filter(d => d.category !== 'Mortgage')

  const buckets: Record<string, number> = {
    'Personal Loans': 0,
    'CC (high-rate)': 0,
    'CC (0% promo)': 0,
    'Keep (<6.85%)': 0,
  }

  nonMortgage.forEach(d => {
    if (d.decision === 'promo') buckets['CC (0% promo)'] += d.balance
    else if (d.decision === 'roll' && d.category === 'Credit Card') buckets['CC (high-rate)'] += d.balance
    else if (d.decision === 'roll' && d.category === 'Personal Loan') buckets['Personal Loans'] += d.balance
    else buckets['Keep (<6.85%)'] += d.balance
  })

  const data = Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          dataKey="value"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} fillOpacity={0.85} />
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
