'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface BudgetCategory {
  id: string
  name: string
  monthly_actual: number | null
  annual_actual: number | null
  survival_budget: number | null
  pct_of_total: number | null
  color: string | null
}

interface Props {
  categories: BudgetCategory[] | null
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function BudgetBreakdown({ categories }: Props) {
  const cats = (categories ?? []).sort((a, b) => (b.monthly_actual ?? 0) - (a.monthly_actual ?? 0))

  const totalActual = cats.reduce((s, c) => s + (c.monthly_actual ?? 0), 0)
  const totalSurvival = cats.reduce((s, c) => s + (c.survival_budget ?? 0), 0)
  const gap = totalActual - totalSurvival

  const chartData = cats.map((c) => ({
    name: c.name.replace('&', '&').slice(0, 14),
    Actual: c.monthly_actual ?? 0,
    Survival: c.survival_budget ?? 0,
    color: c.color ?? '#00d4ff',
  }))

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
        📊 Budget Breakdown
      </h2>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="glass-card px-4 py-2 flex flex-col">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Monthly Actual</span>
          <span className="text-lg font-bold font-mono text-red-400">{fmt(totalActual)}</span>
        </div>
        <div className="glass-card px-4 py-2 flex flex-col">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Survival Budget</span>
          <span className="text-lg font-bold font-mono gradient-text">{fmt(totalSurvival)}</span>
        </div>
        <div className="glass-card px-4 py-2 flex flex-col">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Gap</span>
          <span className={`text-lg font-bold font-mono ${gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {gap > 0 ? '+' : ''}{fmt(gap)}
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="glass-card p-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 60 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'rgba(240,246,255,0.45)', fontFamily: 'var(--font-geist-mono)' }}
              angle={-35}
              textAnchor="end"
              interval={0}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(240,246,255,0.45)', fontFamily: 'var(--font-geist-mono)' }}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Actual" name="Actual" radius={[3, 3, 0, 0]}>
              {chartData.map((c, i) => (
                <Cell key={i} fill={c.color} fillOpacity={0.85} />
              ))}
            </Bar>
            <Bar dataKey="Survival" name="Survival" fill="rgba(0,212,255,0.25)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-medium">Category</th>
              <th className="px-4 py-3 text-right text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-medium">Monthly</th>
              <th className="px-4 py-3 text-right text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-medium hidden sm:table-cell">Annual</th>
              <th className="px-4 py-3 text-right text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-medium">Survival</th>
              <th className="px-4 py-3 text-right text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-medium">Gap</th>
              <th className="px-4 py-3 text-right text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-medium hidden md:table-cell">% Total</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => {
              const gap = (c.monthly_actual ?? 0) - (c.survival_budget ?? 0)
              return (
                <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: c.color ?? '#888' }}
                    />
                    <span className="text-[var(--text-primary)]">{c.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--text-secondary)]">
                    {fmt(c.monthly_actual ?? 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--text-muted)] hidden sm:table-cell">
                    {fmt(c.annual_actual ?? 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--text-secondary)]">
                    {fmt(c.survival_budget ?? 0)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {gap > 0 ? '+' : ''}{fmt(gap)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-muted)] hidden md:table-cell">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(c.pct_of_total ?? 0, 100)}%`, background: c.color ?? '#00d4ff' }}
                        />
                      </div>
                      <span className="font-mono text-[10px] w-8 text-right">{((c.pct_of_total ?? 0)).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10">
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs font-semibold">TOTAL</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-red-400">{fmt(totalActual)}</td>
              <td className="px-4 py-3 text-right font-mono text-[var(--text-muted)] hidden sm:table-cell">
                {fmt(cats.reduce((s, c) => s + (c.annual_actual ?? 0), 0))}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold gradient-text">{fmt(totalSurvival)}</td>
              <td className={`px-4 py-3 text-right font-mono font-bold ${gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {gap > 0 ? '+' : ''}{fmt(gap)}
              </td>
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
