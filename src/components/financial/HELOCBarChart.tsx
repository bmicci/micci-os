'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { HELOCAccount } from '@/lib/financial-data'
import { HELOC_RATE } from '@/lib/financial-data'

interface Props {
  helocAccounts: HELOCAccount[]
}

export default function HELOCBarChart({ helocAccounts }: Props) {
  // Only show roll accounts (these are the ones that benefit from HELOC)
  const rollAccounts = helocAccounts.filter(a => a.decision === 'roll')

  const data = rollAccounts.map(a => {
    // Short display name
    const name = a.name
      .replace(' Personal Loan', '')
      .replace(' (3002)', '')
      .replace(' (4000)', '')
      .replace(' (Synchrony)', '')
      .replace('Virginia FCU/', '')
      .replace('Wells Fargo/', '')

    const helocPayment = Math.round(a.balance * (HELOC_RATE / 100) / 12)

    return {
      name: name.length > 12 ? name.slice(0, 12) + '…' : name,
      before: Math.round(a.moNow),
      after: helocPayment,
    }
  })

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
