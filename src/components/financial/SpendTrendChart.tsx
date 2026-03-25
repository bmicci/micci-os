'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MonthlySpend {
  month: string
  total: number
  [category: string]: unknown
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f59e0b',
  'Groceries': '#22c55e',
  'Shopping': '#8b5cf6',
  'Transport': '#3b82f6',
  'Health & Fitness': '#ef4444',
  'Health & Medical': '#ec4899',
  'Entertainment': '#f97316',
  'Software & Subscriptions': '#06b6d4',
  'Travel': '#14b8a6',
  'Housing': '#6366f1',
  'Utilities': '#64748b',
  'Insurance': '#a855f7',
  'Personal Care': '#e879f9',
  'Payment/Credit': '#4b5563',
  'Other': '#94a3b8',
}

function getColor(cat: string): string {
  return CATEGORY_COLORS[cat] || '#' + ((Math.abs(hashStr(cat)) % 0xFFFFFF).toString(16).padStart(6, '0'))
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

function formatMonth(m: string): string {
  const [y, mo] = m.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(mo) - 1]} ${y.slice(2)}`
}

export default function SpendTrendChart() {
  const [data, setData] = useState<MonthlySpend[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/transactions?view=monthly_spend')
        if (!res.ok) throw new Error('Failed to fetch spend data')
        const json = await res.json()
        setData(json.months || [])
        setCategories(json.categories || [])
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
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading spend data...</p>
      </div>
    )
  }

  if (error || data.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Monthly Spend Trend
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
          <p style={{ fontSize: 28, marginBottom: 8 }}>🧾</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {error || 'No transaction data yet. Import bank CSV files from the Import Center to see spend trends.'}
          </p>
        </div>
      </div>
    )
  }

  // Show top 6 categories by total spend, roll rest into "Other"
  const catTotals = new Map<string, number>()
  for (const m of data) {
    for (const cat of categories) {
      catTotals.set(cat, (catTotals.get(cat) || 0) + (Number(m[cat]) || 0))
    }
  }
  const sortedCats = Array.from(catTotals.entries())
    .filter(([c]) => c !== 'Payment/Credit')
    .sort((a, b) => b[1] - a[1])
  const topCats = sortedCats.slice(0, 6).map(([c]) => c)

  const totalSpend = data.reduce((s, m) => s + (Number(m.total) || 0), 0)
  const avgMonthly = data.length > 0 ? totalSpend / data.length : 0

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
          Monthly Spend Trend
        </h3>
        <div className="flex gap-4 text-[12px]">
          <span style={{ color: 'var(--text-muted)' }}>
            Total: <strong style={{ color: 'var(--text-primary)' }}>${totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Avg: <strong style={{ color: 'var(--accent-cyan)' }}>${avgMonthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo</strong>
          </span>
        </div>
      </div>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
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
              labelFormatter={(label) => formatMonth(String(label))}
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
            {topCats.map((cat) => (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="spend"
                fill={getColor(cat)}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
