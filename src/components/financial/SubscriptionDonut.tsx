'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function SubscriptionDonut({
  cancelTotal,
  reviewTotal,
  keepTotal,
}: {
  cancelTotal: number
  reviewTotal: number
  keepTotal: number
}) {
  const data = [
    { name: 'Cancel Now', value: cancelTotal, color: '#ef4444' },
    { name: 'Under Review', value: reviewTotal, color: '#f59e0b' },
    { name: 'Keep', value: keepTotal, color: '#22c55e' },
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={100}
          paddingAngle={3}
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
          formatter={(value) => [`$${Number(value).toFixed(2)}/mo`, '']}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
