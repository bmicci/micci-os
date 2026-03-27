'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { HelocKPIs } from '@/lib/financial-data'
import { HELOC_LIMIT, HELOC_RATE, PROMOS } from '@/lib/financial-data'

interface Props {
  helocKPIs: HelocKPIs
}

function fmtRound(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export default function HELOCDrawdownTimeline({ helocKPIs }: Props) {
  // Build month-by-month HELOC utilization from immediate roll through promo payoffs
  const kpi = helocKPIs
  const startDate = new Date('2026-03-19')

  // Sort promos by expiry date
  const sortedPromos = [...PROMOS]
    .filter(p => p.balance > 0)
    .sort((a, b) => new Date(a.expires).getTime() - new Date(b.expires).getTime())

  // Build timeline data points
  const timeline: { month: string; drawn: number; available: number; event?: string }[] = []

  let currentDrawn = kpi.immediateRoll

  // Start point: March 2026
  timeline.push({
    month: 'Mar 26',
    drawn: currentDrawn,
    available: HELOC_LIMIT - currentDrawn,
    event: 'HELOC closes + immediate roll',
  })

  // Generate monthly points through Dec 2027
  const months = [
    'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26',
    'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26',
    'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27',
  ]

  const monthDates: Record<string, Date> = {
    'Apr 26': new Date('2026-04-01'),
    'May 26': new Date('2026-05-01'),
    'Jun 26': new Date('2026-06-01'),
    'Jul 26': new Date('2026-07-01'),
    'Aug 26': new Date('2026-08-01'),
    'Sep 26': new Date('2026-09-01'),
    'Oct 26': new Date('2026-10-01'),
    'Nov 26': new Date('2026-11-01'),
    'Dec 26': new Date('2026-12-01'),
    'Jan 27': new Date('2027-01-01'),
    'Feb 27': new Date('2027-02-01'),
    'Mar 27': new Date('2027-03-01'),
    'Apr 27': new Date('2027-04-01'),
    'May 27': new Date('2027-05-01'),
    'Jun 27': new Date('2027-06-01'),
  }

  for (const month of months) {
    const monthDate = monthDates[month]
    // Check if any promos expire this month — draw from HELOC to pay them
    let events: string[] = []
    for (const promo of sortedPromos) {
      const expiryDate = new Date(promo.expires)
      // Pay promo the month it expires (or the month before)
      const payMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 1)
      if (payMonth.getTime() === monthDate.getTime()) {
        currentDrawn += promo.balance
        events.push(`Pay ${promo.name}: ${fmtRound(promo.balance)}`)
      }
    }

    timeline.push({
      month,
      drawn: Math.min(currentDrawn, HELOC_LIMIT),
      available: Math.max(HELOC_LIMIT - currentDrawn, 0),
      event: events.length > 0 ? events.join(' · ') : undefined,
    })
  }

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
          📈 HELOC Drawdown Timeline — Projected Utilization
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Mar 2026 → Jun 2027
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={timeline} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            interval={1}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
            domain={[0, HELOC_LIMIT + 10000]}
          />
          <Tooltip
            contentStyle={{
              background: '#1a1f2e',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 8,
              fontSize: 12,
              color: '#e2e8f0',
            }}
            formatter={(value, name) => [
              fmtRound(Number(value)),
              name === 'drawn' ? 'Amount Drawn' : 'Available',
            ]}
            labelFormatter={(label) => {
              const point = timeline.find(t => t.month === label)
              return point?.event ? `${label} — ${point.event}` : label
            }}
          />
          <ReferenceLine
            y={HELOC_LIMIT}
            stroke="#ef4444"
            strokeDasharray="6 3"
            label={{
              value: `$${(HELOC_LIMIT / 1000).toFixed(0)}K Limit`,
              position: 'right',
              fill: '#ef4444',
              fontSize: 10,
            }}
          />
          <Area
            type="stepAfter"
            dataKey="drawn"
            stackId="1"
            fill="rgba(239,68,68,0.15)"
            stroke="#ef4444"
            strokeWidth={2}
            name="drawn"
          />
          <Area
            type="stepAfter"
            dataKey="available"
            stackId="1"
            fill="rgba(34,197,94,0.08)"
            stroke="#22c55e"
            strokeWidth={1}
            strokeDasharray="4 2"
            name="available"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Key events legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block" style={{ background: '#ef4444' }} /> Amount Drawn
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block" style={{ background: '#22c55e', borderStyle: 'dashed' }} /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block" style={{ background: '#ef4444', borderStyle: 'dashed' }} /> HELOC Limit
        </span>
      </div>
    </div>
  )
}
