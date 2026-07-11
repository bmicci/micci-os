'use client'

import { useMemo, useState } from 'react'
import type { FinancialData, ActionItem } from '@/lib/financial-data'
import { getDebtTotals, fmtK, HELOC_LIMIT } from '@/lib/financial-data'

// ═══════════════════════════════════════════════════════════════════════════
// CFO Overview — the rolled-up "how am I doing, what do I do next" view.
//   Row 1: clickable KPIs (each jumps to its detail tab)
//   Row 2: Action Center (trackable — check off when done) + Cash snapshot
//   Row 3: Spending snapshot (recent 90d) + Investments snapshot (live)
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

function dueChip(dueDate: string | null | undefined) {
  if (!dueDate) return null
  const days = daysUntil(dueDate)
  const color = days < 0 ? '#ef4444' : days <= 14 ? '#ef4444' : days <= 45 ? '#f59e0b' : 'var(--text-muted)'
  const label = days < 0 ? `${-days}d overdue` : days === 0 ? 'today' : days < 90
    ? `${days}d`
    : new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ background: `${days <= 14 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)'}`, color }}>
      {label}
    </span>
  )
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

// ── Action Center ───────────────────────────────────────────────────────────
function ActionCenter({ items: initialItems }: { items: ActionItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [showDone, setShowDone] = useState(false)
  const trackable = items.some(i => i.id)

  const active = items
    .filter(i => (i.status ?? 'active') === 'active')
    .sort((a, b) => {
      // Dated items first by date, then priority
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      const order = { red: 0, amber: 1, blue: 2 }
      return order[a.priority] - order[b.priority]
    })
  const done = items
    .filter(i => i.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  async function setStatus(item: ActionItem, status: 'active' | 'done') {
    if (!item.id) return
    // Optimistic update
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
      // Roll back on failure
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status } : i))
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
          🎯 Action Center
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {active.length} open{trackable ? ' · check off when complete' : ''}
        </span>
      </div>

      <ul className="space-y-0">
        {active.map((item) => (
          <li key={item.id ?? item.title}
            className="flex items-start gap-3 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {item.id ? (
              <input
                type="checkbox"
                checked={false}
                onChange={() => setStatus(item, 'done')}
                className="mt-1 shrink-0 w-3.5 h-3.5 cursor-pointer accent-[#22c55e]"
                title="Mark complete"
              />
            ) : (
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: dotColor[item.priority] }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor[item.priority] }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </span>
                {item.amount ? (
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {fmtRound(item.amount)}
                  </span>
                ) : null}
                {dueChip(item.dueDate)}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {item.detail}
              </div>
            </div>
          </li>
        ))}
        {active.length === 0 && (
          <li className="py-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
            All clear — nothing needs your attention. 🎉
          </li>
        )}
      </ul>

      {done.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowDone(s => !s)}
            className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            {showDone ? '▾' : '▸'} {done.length} completed
          </button>
          {showDone && (
            <ul className="mt-2 space-y-1.5">
              {done.map(item => (
                <li key={item.id ?? item.title} className="flex items-center gap-2 text-[12px]">
                  <span style={{ color: '#22c55e' }}>✓</span>
                  <span className="line-through" style={{ color: 'var(--text-muted)' }}>{item.title}</span>
                  {item.amount ? (
                    <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{fmtRound(item.amount)}</span>
                  ) : null}
                  {item.id && (
                    <button onClick={() => setStatus(item, 'active')}
                      className="text-[10px] ml-auto px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                      undo
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function OverviewTab({ data, onNavigate }: {
  data: FinancialData
  onNavigate?: (tab: string) => void
}) {
  const { debts, actionItems, assets, burnAnalysis, incomeBridge, portfolio } = data
  const totals = getDebtTotals(debts)
  const go = (tab: string) => onNavigate?.(tab)

  const derived = useMemo(() => {
    const totalAssets = assets.home + assets.retirement + assets.brokerage + assets.cash + assets.savings + assets.vehicles
    const totalDebts = debts.reduce((s, d) => s + d.balance, 0)
    const netWorth = totalAssets - totalDebts
    const liquid = assets.cash + assets.savings
    const burn = burnAnalysis.hasData ? burnAnalysis.monthlyNetBurn : incomeBridge.monthlyOutflow - incomeBridge.consultingMonthlyNet
    const runwayMonths = burn > 0 ? liquid / burn : Infinity
    const helocBal = debts.find(d => d.category === 'HELOC')?.balance ?? 0
    const helocHeadroom = HELOC_LIMIT - helocBal
    return { netWorth, liquid, burn, runwayMonths, helocHeadroom }
  }, [debts, assets, burnAnalysis, incomeBridge])

  const topCats = burnAnalysis.hasData ? burnAnalysis.byCategory.slice(0, 6) : []
  const maxCat = topCats[0]?.monthly ?? 1

  return (
    <div className="space-y-5">
      {/* ── Row 1: KPIs (clickable) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Net Worth" value={fmtK(derived.netWorth)}
          note="Assets − debts · click for breakdown" accent="cyan" onClick={() => go('networth')} />
        <KpiCard label="Cash Runway"
          value={derived.runwayMonths === Infinity ? '∞' : `${derived.runwayMonths.toFixed(1)} mo`}
          note={`${fmtK(derived.liquid)} liquid ÷ ${fmtK(Math.max(derived.burn, 0))}/mo burn`}
          accent={derived.runwayMonths < 4 ? 'red' : 'amber'} onClick={() => go('cashflow')} />
        <KpiCard label="Monthly Burn" value={fmtRound(Math.max(derived.burn, 0))}
          note={burnAnalysis.hasData ? 'Real · last 90d of transactions' : 'Estimated'}
          accent="red" onClick={() => go('cashflow')} />
        <KpiCard label="Liquid Cash" value={fmtRound(derived.liquid)}
          note={`Checking ${fmtK(assets.cash)} + savings ${fmtK(assets.savings)}`}
          accent="amber" onClick={() => go('networth')} />
        <KpiCard label="Debt (excl. mortgage)" value={fmtK(totals.total)}
          note="Incl. HELOC drawn · click for payoff plan" accent="red" onClick={() => go('debtpayoff')} />
        <KpiCard label="HELOC Headroom" value={fmtRound(derived.helocHeadroom)}
          note="Left on the line · drawdown plan" accent="green" onClick={() => go('heloc')} />
      </div>

      {/* ── Row 2: Action Center + Cash snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
        <div className="lg:col-span-2">
          <ActionCenter items={actionItems} />
        </div>

        <div className="space-y-4">
          {/* Cash flow snapshot */}
          <div className="glass-card p-5 cursor-pointer transition-all hover:scale-[1.01]" onClick={() => go('cashflow')}>
            <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              💧 Cash Flow — this month
            </h3>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Income</span>
                <span className="font-mono font-semibold" style={{ color: '#22c55e' }}>
                  +{fmtRound(burnAnalysis.hasData ? burnAnalysis.monthlyIncome : incomeBridge.consultingMonthlyNet)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Spend (real, 90d avg)</span>
                <span className="font-mono font-semibold" style={{ color: '#ef4444' }}>
                  −{fmtRound(burnAnalysis.hasData ? burnAnalysis.monthlySpend : incomeBridge.monthlyOutflow)}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-[13px] font-bold"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>Net burn</span>
                <span className="font-mono" style={{ color: '#ef4444' }}>
                  −{fmtRound(Math.max(derived.burn, 0))}
                </span>
              </div>
              <div className="text-[11px] pt-1" style={{ color: 'var(--text-muted)' }}>
                Covered from savings · {derived.runwayMonths === Infinity ? '∞' : derived.runwayMonths.toFixed(1)} months of runway
              </div>
            </div>
          </div>

          {/* Investments snapshot */}
          <div className="glass-card p-5 cursor-pointer transition-all hover:scale-[1.01]" onClick={() => go('investments')}>
            <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              📈 Portfolio — live
            </h3>
            {portfolio ? (
              <>
                <div className="text-[22px] font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {fmtRound(portfolio.value + portfolio.employerSupplement)}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  IRA {fmtK(portfolio.value)} at market + employer plan {fmtK(portfolio.employerSupplement)}
                </div>
                <div className="flex justify-between mt-3 text-[12px]">
                  <span style={{ color: 'var(--text-muted)' }}>Unrealized G/L</span>
                  <span className="font-mono font-semibold" style={{ color: portfolio.gl >= 0 ? '#22c55e' : '#ef4444' }}>
                    {portfolio.gl >= 0 ? '+' : ''}{fmtRound(portfolio.gl)} ({portfolio.glPct}%)
                  </span>
                </div>
                {portfolio.updatedAt && (
                  <div className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                    Prices as of {new Date(portfolio.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                No live positions — import portfolio CSVs at /finance/investments
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Spending snapshot ── */}
      {topCats.length > 0 && (
        <div className="glass-card p-5 cursor-pointer transition-all hover:scale-[1.005]" onClick={() => go('budget')}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              🧾 Where the money goes — last 90 days
            </h3>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              per month · click for full breakdown
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {topCats.map(c => (
              <div key={c.cat} className="flex items-center gap-3">
                <div className="w-[140px] text-[12px] truncate shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  {c.cat}
                </div>
                <div className="flex-1 h-3 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded" style={{ width: `${(c.monthly / maxCat) * 100}%`, background: c.color, minWidth: 3 }} />
                </div>
                <div className="w-[64px] text-right text-[12px] font-mono font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
                  {fmtRound(c.monthly)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
