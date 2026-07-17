'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import type { FinancialData, ActionItem } from '@/lib/financial-data'
import { getDebtTotals, fmtK, HELOC_LIMIT } from '@/lib/financial-data'

// ═══════════════════════════════════════════════════════════════════════════
// CFO Overview v2
//   Row 1: balanced KPIs (net worth · portfolio · cash · burn · debt · heloc)
//   Row 2: Money In vs Out chart (6mo)   |  compact Action Center
//   Row 3: Where the money goes          |  Portfolio allocation donut
// ═══════════════════════════════════════════════════════════════════════════

function fmtRound(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

const dotColor: Record<string, string> = {
  red: '#ef4444',
  amber: '#f59e0b',
  blue: 'var(--accent-cyan)',
}

function daysUntil(dateStr: string): number {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T00:00:00' : dateStr)
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[parseInt(mo) - 1]} ${y.slice(2)}`
}

// ── Clickable KPI ───────────────────────────────────────────────────────────
function KpiCard({ label, value, note, accent, onClick }: {
  label: string
  value: string
  note: string
  accent?: 'green' | 'red' | 'amber' | 'cyan'
  onClick?: () => void
}) {
  const accentColor =
    accent === 'green' ? '#22c55e' :
    accent === 'red' ? '#ef4444' :
    accent === 'amber' ? '#f59e0b' :
    'var(--accent-cyan)'
  return (
    <button
      onClick={onClick}
      className="glass-card p-4 text-left transition-all hover:scale-[1.02] cursor-pointer w-full"
      style={{ borderTop: `2px solid ${accentColor}` }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-[22px] font-extrabold mt-1" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {note}
      </div>
    </button>
  )
}

// ── Compact Action Center (rail) ────────────────────────────────────────────
// Money-scoped view of the unified action list — /tasks shows every category.
const MONEY_CATS = new Set(['finance', 'heloc', 'tax', 'legal'])

function ActionCenter({ items: initialItems }: { items: ActionItem[] }) {
  const [items, setItems] = useState(
    initialItems.filter(i => !i.category || MONEY_CATS.has(i.category)),
  )
  const [showAll, setShowAll] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const VISIBLE = 5

  const active = items
    .filter(i => (i.status ?? 'active') === 'active')
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      const order = { red: 0, amber: 1, blue: 2 }
      return order[a.priority] - order[b.priority]
    })
  const done = items
    .filter(i => i.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const visible = showAll ? active : active.slice(0, VISIBLE)

  async function setStatus(item: ActionItem, status: 'active' | 'done') {
    if (!item.id) return
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, status, completedAt: status === 'done' ? new Date().toISOString() : null }
      : i))
    try {
      const res = await fetch('/api/finance/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status } : i))
    }
  }

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
          🎯 Actions
        </h3>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{active.length} open</span>
      </div>

      <ul className="space-y-0">
        {visible.map(item => {
          const days = item.dueDate ? daysUntil(item.dueDate) : null
          const chipColor = days !== null && days <= 14 ? '#ef4444' : days !== null && days <= 45 ? '#f59e0b' : 'var(--text-muted)'
          return (
            <li key={item.id ?? item.title}
              className="flex items-center gap-2 py-1.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {item.id ? (
                <input type="checkbox" checked={false} onChange={() => setStatus(item, 'done')}
                  className="shrink-0 w-3 h-3 cursor-pointer accent-[#22c55e]" title="Mark complete" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor[item.priority] }} />
              )}
              <span className="flex-1 min-w-0 text-[11.5px] truncate" title={`${item.title} — ${item.detail}`}
                style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </span>
              {item.amount ? (
                <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {fmtK(item.amount)}
                </span>
              ) : null}
              {days !== null && (
                <span className="text-[9px] font-bold shrink-0 px-1 py-0.5 rounded" style={{ color: chipColor, background: 'rgba(255,255,255,0.05)' }}>
                  {days < 0 ? `${-days}d late` : days === 0 ? 'today' : `${days}d`}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex justify-between items-center mt-2">
        {active.length > VISIBLE ? (
          <button onClick={() => setShowAll(s => !s)} className="text-[10px] font-semibold" style={{ color: 'var(--accent-cyan)' }}>
            {showAll ? 'Show less' : `+${active.length - VISIBLE} more`}
          </button>
        ) : <span />}
        {done.length > 0 && (
          <button onClick={() => setShowDone(s => !s)} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {showDone ? '▾' : '▸'} {done.length} done
          </button>
        )}
      </div>

      {showDone && (
        <ul className="mt-1.5 space-y-1">
          {done.map(item => (
            <li key={item.id ?? item.title} className="flex items-center gap-1.5 text-[10.5px]">
              <span style={{ color: '#22c55e' }}>✓</span>
              <span className="line-through truncate" style={{ color: 'var(--text-muted)' }}>{item.title}</span>
              {item.id && (
                <button onClick={() => setStatus(item, 'active')}
                  className="text-[9px] ml-auto px-1 rounded shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                  undo
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function OverviewTab({ data, onNavigate }: {
  data: FinancialData
  onNavigate?: (tab: string) => void
}) {
  const { debts, actionItems, assets, burnAnalysis, runwayProjection, portfolio, monthlyFlows } = data
  const totals = getDebtTotals(debts)
  const go = (tab: string) => onNavigate?.(tab)

  const derived = useMemo(() => {
    const totalAssets = assets.home + assets.retirement + assets.brokerage + assets.cash + assets.savings + assets.vehicles
    const totalDebts = debts.reduce((s, d) => s + d.balance, 0)
    const netWorth = totalAssets - totalDebts
    const liquid = assets.cash + assets.savings
    // Cliff-aware: real burn is pre- or post-benefits depending on today,
    // and runway comes from the day-by-day projected cash-out date rather
    // than assuming today's burn rate holds forever.
    const burn = runwayProjection.phase === 'post-cliff' ? runwayProjection.postCliffMonthlyBurn : runwayProjection.preCliffMonthlyBurn
    const runwayMonths = runwayProjection.cashOutDate
      ? Math.max(0, (new Date(runwayProjection.cashOutDate + 'T00:00:00').getTime() - Date.now()) / (30.44 * 86400000))
      : Infinity
    const helocBal = debts.find(d => d.category === 'HELOC')?.balance ?? 0
    return { netWorth, liquid, burn, runwayMonths, helocHeadroom: HELOC_LIMIT - helocBal }
  }, [debts, assets, runwayProjection])

  const flowData = monthlyFlows.map(f => ({ ...f, label: fmtMonth(f.month) }))
  const topCats = burnAnalysis.hasData ? burnAnalysis.byCategory.slice(0, 8) : []
  const maxCat = topCats[0]?.monthly ?? 1
  const portfolioTotal = portfolio ? portfolio.value + portfolio.employerSupplement : assets.retirement

  return (
    <div className="space-y-4">
      {/* ── Row 1: KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Net Worth" value={fmtK(derived.netWorth)}
          note="Assets − debts" accent="cyan" onClick={() => go('networth')} />
        <KpiCard label="Portfolio" value={fmtK(portfolioTotal)}
          note={portfolio ? `Live · ${portfolio.gl >= 0 ? '+' : ''}${portfolio.glPct}% unrealized` : 'Import positions'}
          accent="green" onClick={() => go('investments')} />
        <KpiCard label="Liquid Cash" value={fmtRound(derived.liquid)}
          note={`≈ ${derived.runwayMonths === Infinity ? '∞' : derived.runwayMonths.toFixed(1)} months of runway`}
          accent="amber" onClick={() => go('cashflow')} />
        <KpiCard label="Net Burn / Mo" value={fmtRound(Math.max(derived.burn, 0))}
          note={burnAnalysis.hasData ? 'Real · last 90 days' : 'Estimated'}
          accent="red" onClick={() => go('cashflow')} />
        <KpiCard label="Debt (excl. mortgage)" value={fmtK(totals.total)}
          note="Incl. HELOC drawn" accent="red" onClick={() => go('debtpayoff')} />
        <KpiCard label="HELOC Headroom" value={fmtRound(derived.helocHeadroom)}
          note="Left on the line" accent="green" onClick={() => go('heloc')} />
      </div>

      {/* ── Main band: two interlocked column stacks — flex-1 absorbers keep
             both columns bottom-aligned, so no height holes are possible ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Left stack: money flow → spending */}
        <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              💸 Money In vs Out — last 6 months
            </h3>
            <button onClick={() => go('cashflow')} className="text-[10px] font-semibold" style={{ color: 'var(--accent-cyan)' }}>
              Cash Flow →
            </button>
          </div>
          <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
            Real income vs real spend from imported transactions
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={flowData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(240,246,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(240,246,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => fmtK(v)} width={52} />
              <Tooltip
                contentStyle={{ background: '#0a0e27', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => [fmtRound(Number(v)), name === 'income' ? 'Income' : 'Spend']}
              />
              <Bar dataKey="income" name="income" fill="#22c55e" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
              <Bar dataKey="spend" name="spend" fill="#ef4444" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5 flex-1 cursor-pointer transition-all hover:scale-[1.005]" onClick={() => go('budget')}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              🧾 Where the money goes — last 90 days
            </h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>per month · click for detail</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {topCats.map(c => (
              <div key={c.cat} className="flex items-center gap-3">
                <div className="w-[130px] text-[11.5px] truncate shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  {c.cat}
                </div>
                <div className="flex-1 h-3 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded" style={{ width: `${(c.monthly / maxCat) * 100}%`, background: c.color, minWidth: 3 }} />
                </div>
                <div className="w-[58px] text-right text-[11.5px] font-mono font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
                  {fmtRound(c.monthly)}
                </div>
              </div>
            ))}
            {topCats.length === 0 && (
              <div className="text-[12px] py-4" style={{ color: 'var(--text-muted)' }}>
                No recent transactions — import CSVs to see live spend.
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Right stack: actions → portfolio */}
        <div className="flex flex-col gap-4">
        <ActionCenter items={actionItems} />

        {/* Portfolio — today's performance & movers */}
        <div className="glass-card p-5 flex-1 cursor-pointer transition-all hover:scale-[1.01]" onClick={() => go('investments')}>
          <div className="flex justify-between items-baseline">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>📈 Portfolio — today</h3>
            {portfolio?.updatedAt && (
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                prices {new Date(portfolio.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {portfolio ? (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[20px] font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {fmtRound(portfolioTotal)}
                </span>
                <span className="text-[12px] font-mono font-bold"
                  style={{ color: portfolio.dayChange >= 0 ? '#22c55e' : '#ef4444' }}>
                  {portfolio.dayChange >= 0 ? '▲' : '▼'} {fmtRound(Math.abs(portfolio.dayChange))} ({portfolio.dayChangePct >= 0 ? '+' : ''}{portfolio.dayChangePct}%) today
                </span>
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                All-time {portfolio.gl >= 0 ? '+' : ''}{fmtK(portfolio.gl)} ({portfolio.glPct}%) · employer plan {fmtK(portfolio.employerSupplement)} incl.
              </div>

              {/* Value sparkline — accumulates daily from the price cron */}
              {portfolio.history.length > 1 && (
                <div className="mt-2 -mx-1">
                  <ResponsiveContainer width="100%" height={54}>
                    <AreaChart data={portfolio.history} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <Tooltip
                        contentStyle={{ background: '#0a0e27', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 8, fontSize: 10 }}
                        formatter={(v) => [fmtRound(Number(v)), 'Value']}
                        labelFormatter={(_, p) => (p?.[0]?.payload?.date ?? '') as string}
                      />
                      <Area type="monotone" dataKey="value" stroke="var(--accent-cyan)" strokeWidth={1.5}
                        fill="url(#sparkFill)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Today's movers — diverging bars */}
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Today&apos;s movers
                </div>
                {portfolio.movers.slice(0, 6).map(m => {
                  const maxPct = Math.max(...portfolio.movers.map(x => Math.abs(x.pct)), 0.1)
                  const width = Math.min(Math.abs(m.pct) / maxPct, 1) * 50
                  const up = m.pct >= 0
                  return (
                    <div key={m.ticker} className="flex items-center gap-2 text-[11px]">
                      <span className="w-[44px] font-mono font-semibold shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {m.ticker}
                      </span>
                      <div className="flex-1 flex items-center h-3">
                        <div className="w-1/2 flex justify-end">
                          {!up && <div className="h-2.5 rounded-l" style={{ width: `${width}%`, background: '#ef4444', minWidth: 2 }} />}
                        </div>
                        <div className="w-px h-3 shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }} />
                        <div className="w-1/2">
                          {up && <div className="h-2.5 rounded-r" style={{ width: `${width}%`, background: '#22c55e', minWidth: 2 }} />}
                        </div>
                      </div>
                      <span className="w-[52px] text-right font-mono font-semibold shrink-0"
                        style={{ color: up ? '#22c55e' : '#ef4444' }}>
                        {up ? '+' : ''}{m.pct}%
                      </span>
                    </div>
                  )
                })}
                {portfolio.movers.length === 0 && (
                  <div className="text-[11px] py-2" style={{ color: 'var(--text-muted)' }}>
                    Day-change data arrives with the next price refresh.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-[12px] py-6" style={{ color: 'var(--text-muted)' }}>
              No live positions — import portfolio CSVs at /finance/investments
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
