'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint, StrategyKey } from '@/lib/finance/masterPlan'

const LABEL: Record<StrategyKey, string> = { A: 'A: Balanced', B: 'B: Aggressive', C: 'C: Live now' }
const fmtK = (n: number) => `$${Math.round(n / 1000)}K`
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

interface TipProps { active?: boolean; label?: string; payload?: { dataKey: string; value: number; color: string }[] }
function Tip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="glass-card px-3 py-2 text-xs" style={{ borderRadius: 12 }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{monthLabel(label)} (month end)</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
          <span><span style={{ color: p.color }}>●</span> {p.dataKey === 'actual' ? 'Actual today' : LABEL[p.dataKey as StrategyKey]}</span>
          <span>{usd(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function PlanVsActualChart({ data, strategy }: { data: ChartPoint[]; strategy: StrategyKey }) {
  return (
    <div style={{ width: '100%', height: 300 }} role="img"
      aria-label={`Non-mortgage debt by month for strategies A, B and C, with strategy ${strategy} highlighted and today's actual balance marked.`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} interval="preserveStartEnd" minTickGap={28}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
          <YAxis tickFormatter={fmtK} width={52} domain={[0, 'auto']}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} />
          {(['A', 'B', 'C'] as StrategyKey[]).map(s => (
            <Line key={s} type="monotone" dataKey={s} dot={false} isAnimationActive={false}
              stroke={s === strategy ? '#5ee6ff' : 'rgba(255,255,255,0.28)'}
              strokeWidth={s === strategy ? 2.5 : 1.25}
              strokeDasharray={s === strategy ? undefined : '4 4'} />
          ))}
          <Line type="monotone" dataKey="actual" stroke="#a78bfa" strokeWidth={0} isAnimationActive={false}
            dot={{ r: 6, fill: '#a78bfa', stroke: '#070b1a', strokeWidth: 2 }} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
