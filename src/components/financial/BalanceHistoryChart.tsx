'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Snapshot {
  id: string
  account_name: string
  snapshot_date: string
  total_charges: number
  total_credits: number
  transaction_count: number
}

interface ChartPoint {
  date: string
  [accountName: string]: unknown
}

const ACCOUNT_COLORS = [
  '#00d4ff', '#f59e0b', '#ef4444', '#22c55e', '#8b5cf6',
  '#ec4899', '#3b82f6', '#14b8a6', '#f97316', '#6366f1',
]

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m) - 1]} ${parseInt(day)}`
}

export default function BalanceHistoryChart() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/transactions?view=balance_history')
        if (!res.ok) throw new Error('Failed to fetch balance history')
        const json = await res.json()
        setSnapshots(json.snapshots || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-5" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading balance history...</p>
      </div>
    )
  }

  if (error || snapshots.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Import History
        </h3>
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            borderRadius: 10,
            border: '1px dashed rgba(0,212,255,0.2)',
            background: 'rgba(0,212,255,0.02)',
          }}
        >
          <p style={{ fontSize: 28, marginBottom: 8 }}>📈</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {error || 'No balance snapshots yet. Each transaction import creates a snapshot automatically.'}
          </p>
        </div>
      </div>
    )
  }

  // Group snapshots by date, with each account as a line
  const accounts = Array.from(new Set(snapshots.map(s => s.account_name)))
  const dateMap = new Map<string, Record<string, unknown>>()

  for (const snap of snapshots) {
    if (!dateMap.has(snap.snapshot_date)) {
      dateMap.set(snap.snapshot_date, { date: snap.snapshot_date })
    }
    const point = dateMap.get(snap.snapshot_date)!
    point[snap.account_name] = snap.total_charges
    point[`${snap.account_name}_count`] = snap.transaction_count
  }

  const chartData = Array.from(dateMap.values())
    .sort((a, b) => String(a.date).localeCompare(String(b.date))) as ChartPoint[]

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
          Import History — Charges by Account
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: 'rgba(240,246,255,0.5)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fill: 'rgba(240,246,255,0.5)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                background: '#0a0e27',
                border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(label) => formatDate(String(label))}
              formatter={(value, name) => [
                `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                String(name),
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            {accounts.map((acct, i) => (
              <Line
                key={acct}
                type="monotone"
                dataKey={acct}
                stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
