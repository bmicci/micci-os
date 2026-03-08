'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const data = [
  { date: 'Mar 1', amount: -3993.80, label: 'Mortgage + Dad + AmEx Loan', balance: 4006 },
  { date: 'Mar 2', amount: -769.78, label: 'Citizens Pay FINAL', balance: 3236 },
  { date: 'Mar 5', amount: -1494.07, label: 'SoFi + PayPal', balance: 1742 },
  { date: 'Mar 6–9', amount: -507.77, label: 'Chase Cards + Nordstrom + NFM', balance: 1234 },
  { date: 'Mar 10', amount: -2216.97, label: 'AmEx Gold + Apple Card', balance: -983 },
  { date: 'Mar 14', amount: -124, label: 'Citi Diamond', balance: -1107 },
  { date: 'Mar 15', amount: 4652, label: '💰 Paycheck', balance: 3545 },
  { date: 'Mar 20–21', amount: -927.47, label: 'LightStream + VFCU', balance: 2618 },
  { date: 'Mar 31', amount: 1598, label: '💰 Partial Paycheck', balance: 4216 },
]

export default function RunwayCashFlowChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={{
            background: '#1a1f2e',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: '#e2e8f0',
          }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
          labelFormatter={(label) => `${label}`}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
        <Bar
          dataKey="amount"
          radius={[4, 4, 0, 0]}
          fill="#3b82f6"
          name="Cash Flow"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
