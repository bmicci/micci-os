'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DebtAccount, PromoDeadline, HelocKPIs } from '@/lib/financial-data'
import { getDebtTotals, fmt, fmtK, HELOC_RATE, HELOC_LIMIT } from '@/lib/financial-data'
import KPICard from './KPICard'

type SortKey = 'name' | 'balance' | 'rate' | 'min'

interface StrategyResult {
  months: number
  totalInterest: number
  monthlyPayment: number
}

// ═══════════════════════════════════════════════════
// Payoff Simulators
// ═══════════════════════════════════════════════════

/**
 * Simulate payoff using avalanche (highest rate first) or snowball (lowest balance first)
 * Strategy: pay minimums on all, then apply extra $3,000/month to highest priority
 */
function simulatePayoff(
  debts: DebtAccount[],
  extraMonthly: number,
  strategy: 'avalanche' | 'snowball',
): StrategyResult {
  // Start with non-mortgage debts only, exclude 0% promos
  let remaining = debts
    .filter(d => d.category !== 'Mortgage' && d.rate > 0)
    .map(d => ({
      name: d.name,
      balance: d.balance,
      rate: d.rate,
      min: d.min ?? d.balance * (d.rate / 100) / 12,
    }))

  let totalInterest = 0
  let months = 0
  const maxMonths = 120 // Cap at 10 years

  while (remaining.length > 0 && months < maxMonths) {
    // Apply interest to all accounts
    remaining = remaining.map(a => ({
      ...a,
      balance: Math.max(0, a.balance * (1 + a.rate / 100 / 12)),
    }))

    // Calculate total minimums
    const totalMin = remaining.reduce((s, a) => s + a.min, 0)
    const extraAvailable = Math.max(0, extraMonthly - (totalMin - remaining.reduce((s, a) => s + a.balance * (a.rate / 100) / 12, 0)))

    // Interest paid this month
    const interestThisMonth = remaining.reduce((s, a) => s + a.balance * (a.rate / 100 / 12), 0)
    totalInterest += interestThisMonth

    // Pay minimums on all
    remaining = remaining.map(a => ({
      ...a,
      balance: Math.max(0, a.balance - a.min),
    }))

    // Sort by strategy to find highest priority
    const sorted =
      strategy === 'avalanche'
        ? [...remaining].sort((a, b) => b.rate - a.rate) // Highest rate first
        : [...remaining].sort((a, b) => a.balance - b.balance) // Lowest balance first

    // Apply extra to highest priority account
    if (sorted.length > 0 && sorted[0].balance > 0) {
      const extraPayment = Math.min(sorted[0].balance, extraAvailable)
      sorted[0].balance = Math.max(0, sorted[0].balance - extraPayment)
    }

    // Replace with sorted order
    remaining = sorted

    // Remove paid-off accounts
    remaining = remaining.filter(a => a.balance > 0.01)

    months++
  }

  return {
    months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthlyPayment: extraMonthly + (debts
      .filter(d => d.category !== 'Mortgage')
      .reduce((s, d) => s + (d.min ?? d.balance * (d.rate / 100) / 12), 0) / debts.length),
  }
}

/**
 * Simulate HELOC-first strategy: roll high-rate to HELOC at 6.85%, keep low-rate debt
 * Simplified: assume promos are safe, calculate based on rolled debt only
 */
function simulateHelocFirst(
  debts: DebtAccount[],
  extraMonthly: number,
): StrategyResult {
  // Roll high-rate (>6.85%) to HELOC, keep promos and low-rate
  let remaining = debts
    .filter(d => d.category !== 'Mortgage')
    .map(d => ({
      name: d.name,
      balance: d.decision === 'roll' ? d.balance : 0, // Only rolled debt counts
      rate: d.decision === 'roll' ? HELOC_RATE : d.rate,
      min: d.decision === 'roll' ? 0 : (d.min ?? 0), // HELOC has no fixed min
    }))
    .filter(a => a.balance > 0)

  let totalInterest = 0
  let months = 0
  const maxMonths = 120

  while (remaining.length > 0 && months < maxMonths) {
    // Apply interest
    remaining = remaining.map(a => ({
      ...a,
      balance: Math.max(0, a.balance * (1 + a.rate / 100 / 12)),
    }))

    const interestThisMonth = remaining.reduce((s, a) => s + a.balance * (a.rate / 100 / 12), 0)
    totalInterest += interestThisMonth

    // Distribute payment: minimums first, then extra to HELOC (highest rate)
    const totalMin = remaining.reduce((s, a) => s + a.min, 0)
    const extraAvailable = Math.max(0, extraMonthly)

    remaining = remaining.map(a => ({
      ...a,
      balance: Math.max(0, a.balance - a.min - extraAvailable),
    }))

    remaining = remaining.filter(a => a.balance > 0.01)
    months++
  }

  return {
    months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthlyPayment: extraMonthly,
  }
}

/**
 * Generate 36-month projection for HELOC-first strategy
 */
function generatePayoffTimeline(debts: DebtAccount[], extraMonthly: number): Array<{ month: number; balance: number }> {
  const nonMortgage = debts.filter(d => d.category !== 'Mortgage')
  const currentTotal = nonMortgage.reduce((s, d) => s + d.balance, 0)

  const monthlyPayment = extraMonthly
  const totalMin = nonMortgage.reduce((s, d) => s + (d.min ?? d.balance * (d.rate / 100) / 12), 0)

  const timeline: Array<{ month: number; balance: number }> = []
  let remaining = currentTotal

  for (let i = 0; i <= 36; i++) {
    timeline.push({ month: i, balance: Math.max(0, remaining) })

    if (remaining > 0) {
      // Weighted average interest rate on remaining
      const avgRate =
        nonMortgage.length > 0
          ? nonMortgage.reduce((s, d) => s + d.balance * d.rate, 0) / currentTotal
          : 0
      const interestThisMonth = remaining * (avgRate / 100) / 12
      remaining = Math.max(0, remaining - monthlyPayment - totalMin + interestThisMonth)
    }
  }

  return timeline
}

/**
 * Decision badge styling
 */
const decisionBadge = (d: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    roll: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: '✅ ROLL' },
    keep: { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', label: '🚫 KEEP' },
    promo: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '⏳ 0% PROMO' },
  }
  const s = map[d] || map.keep
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

/**
 * Days until promo expires
 */
function daysUntil(dateStr: string): number {
  // Date-only strings parse as UTC midnight — anchor to local midnight instead
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T00:00:00' : dateStr)
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════

export interface DebtPayoffTabProps {
  debts: DebtAccount[]
  helocKPIs: HelocKPIs
  promos: PromoDeadline[]
}

export default function DebtPayoffTab({ debts, helocKPIs, promos }: DebtPayoffTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>('balance')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [extraMonthly, setExtraMonthly] = useState(2000)

  const totals = useMemo(() => getDebtTotals(debts), [debts])
  const nonMortgage = useMemo(() => debts.filter(d => d.category !== 'Mortgage'), [debts])
  const monthlyMin = useMemo(
    () => nonMortgage.reduce((s, d) => s + (d.min ?? d.balance * (d.rate / 100) / 12), 0),
    [nonMortgage],
  )

  // Calculate weighted average interest rate (excluding 0% promos)
  const weightedAvgRate = useMemo(() => {
    const nonPromo = nonMortgage.filter(d => d.rate > 0)
    if (nonPromo.length === 0) return 0
    const totalBalance = nonPromo.reduce((s, d) => s + d.balance, 0)
    return nonPromo.reduce((s, d) => s + d.balance * d.rate, 0) / totalBalance
  }, [nonMortgage])

  // Strategy comparisons — driven by the interactive extra-payment slider
  const strategies = useMemo(() => ({
    avalanche: simulatePayoff(debts, extraMonthly, 'avalanche'),
    snowball: simulatePayoff(debts, extraMonthly, 'snowball'),
    helocFirst: simulateHelocFirst(debts, extraMonthly),
  }), [debts, extraMonthly])

  // Estimated payoff date (HELOC-first)
  const estimatedPayoffMonths = useMemo(() => strategies.helocFirst.months, [strategies])

  // Timeline data
  const timelineData = useMemo(() => generatePayoffTimeline(debts, extraMonthly), [debts, extraMonthly])

  // Sorted table
  const sorted = useMemo(() => {
    return [...nonMortgage].sort((a, b) => {
      const av = a[sortKey] ?? -1
      const bv = b[sortKey] ?? -1
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sortDir
      return ((av as number) - (bv as number)) * sortDir
    })
  }, [nonMortgage, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 1 ? -1 : 1) as 1 | -1)
    else {
      setSortKey(key)
      setSortDir(-1)
    }
  }

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === -1 ? ' ▾' : ' ▴') : '')

  // Promo deadlines (next 6 months)
  const urgentPromos = useMemo(() => {
    return promos
      .filter(p => {
        const days = daysUntil(p.expires)
        return days > 0 && days <= 180
      })
      .sort((a, b) => new Date(a.expires).getTime() - new Date(b.expires).getTime())
  }, [promos])

  return (
    <div className="space-y-5">
      {/* KPI Cards — 6 metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard
          label="Total Debt (excl. Mortgage)"
          value={fmtK(totals.total)}
          accent="red"
        />
        <KPICard
          label="Monthly Minimum Payments"
          value={fmt(monthlyMin)}
          accent="amber"
        />
        <KPICard
          label="Weighted Avg Interest Rate"
          value={`${weightedAvgRate.toFixed(2)}%`}
          accent="red"
        />
        <KPICard
          label="Interest Saved by HELOC"
          value={fmt(helocKPIs.annualGain)}
          note="Annual savings vs. current"
          accent="green"
        />
        <KPICard
          label="Estimated Payoff Date"
          value={`${estimatedPayoffMonths} months`}
          note="HELOC-first strategy"
          accent="cyan"
        />
        <KPICard
          label="HELOC Available"
          value={fmtK(helocKPIs.helocAfterRoll)}
          note="After initial roll"
          accent="cyan"
        />
      </div>

      {/* Extra-payment slider + reality note */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Payoff Simulator — extra payment / month
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              How fast the debt clears if you throw extra at it each month
            </p>
          </div>
          <div className="text-[24px] font-extrabold font-mono" style={{ color: 'var(--accent-cyan)' }}>
            {fmt(extraMonthly)}<span className="text-[12px] font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span>
          </div>
        </div>
        <input
          type="range" min={0} max={6000} step={250}
          value={extraMonthly}
          onChange={e => setExtraMonthly(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--accent-cyan)' }}
        />
        <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
          <span>$0</span><span>$3K</span><span>$6K</span>
        </div>
        <div
          className="mt-3 p-3 rounded-lg text-[11px]"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
        >
          ⚠️ Reality check: you&apos;re currently cash-flow negative (unemployed), so real extra payment is
          <strong> $0/mo</strong> until re-employed. These scenarios model paydown once income resumes —
          slide to your expected post-job surplus.
        </div>
      </div>

      {/* Strategy Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Avalanche */}
        <div className="glass-card p-5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            📊 Avalanche Strategy
          </h3>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            Highest interest rate first
          </p>
          <div className="space-y-2">
            <div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Months to Payoff</div>
              <div className="text-[22px] font-extrabold" style={{ color: 'var(--text-primary)' }}>
                {strategies.avalanche.months}
              </div>
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total Interest Paid</div>
              <div className="text-[18px] font-bold" style={{ color: '#ef4444' }}>
                {fmt(strategies.avalanche.totalInterest)}
              </div>
            </div>
          </div>
        </div>

        {/* Snowball */}
        <div className="glass-card p-5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            ❄️ Snowball Strategy
          </h3>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            Lowest balance first
          </p>
          <div className="space-y-2">
            <div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Months to Payoff</div>
              <div className="text-[22px] font-extrabold" style={{ color: 'var(--text-primary)' }}>
                {strategies.snowball.months}
              </div>
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total Interest Paid</div>
              <div className="text-[18px] font-bold" style={{ color: '#ef4444' }}>
                {fmt(strategies.snowball.totalInterest)}
              </div>
            </div>
          </div>
        </div>

        {/* HELOC-First */}
        <div className="glass-card p-5" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            ✨ HELOC-First (Current)
          </h3>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            Roll high-rate to HELOC @ 6.85%
          </p>
          <div className="space-y-2">
            <div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Months to Payoff</div>
              <div className="text-[22px] font-extrabold" style={{ color: 'var(--accent-cyan)' }}>
                {strategies.helocFirst.months}
              </div>
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total Interest Paid</div>
              <div className="text-[18px] font-bold" style={{ color: '#22c55e' }}>
                {fmt(strategies.helocFirst.totalInterest)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debt Paydown Timeline Chart */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          36-Month Debt Paydown (HELOC-First · {fmt(extraMonthly)}/mo extra)
        </h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                label={{ value: 'Month', position: 'insideRight', offset: -5, fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtK}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                formatter={(value: any) => fmt(value)}
                labelFormatter={(label: any) => `Month ${label}`}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--accent-cyan)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* All Accounts Table */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          All Debt Accounts — Sortable
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {[
                  { key: 'name' as SortKey, label: 'Account' },
                  { key: 'balance' as SortKey, label: 'Balance' },
                  { key: 'rate' as SortKey, label: 'Rate' },
                  { key: 'min' as SortKey, label: 'Min/Mo' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:opacity-80"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {col.label}
                    {sortIndicator(col.key)}
                  </th>
                ))}
                <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Decision
                </th>
                <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Category
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, i) => (
                <tr
                  key={d.name}
                  className="transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                >
                  <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                    {d.name}
                  </td>
                  <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {fmt(d.balance)}
                  </td>
                  <td className="py-2 px-3 text-[12px] font-mono">
                    {d.rate === 0 ? (
                      <span style={{ color: '#22c55e' }}>0% promo</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>{d.rate}%</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {d.min ? fmt(d.min) : '—'}
                  </td>
                  <td className="py-2 px-3">{decisionBadge(d.decision)}</td>
                  <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {d.category}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <td className="py-2 px-3 text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  TOTAL
                </td>
                <td className="py-2 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  {fmt(totals.total)}
                </td>
                <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  —
                </td>
                <td className="py-2 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  {fmt(monthlyMin)}
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Promo Deadline Alert Section */}
      {urgentPromos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
            ⚠️ 0% Promo Deadlines (Next 6 Months)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentPromos.map(p => {
              const days = daysUntil(p.expires)
              const urgencyColor =
                days <= 30 ? '#ef4444' : days <= 90 ? '#f59e0b' : '#22c55e'
              const daysLabel =
                days === 0 ? 'DUE TODAY' : days === 1 ? 'TOMORROW' : `${days} days`

              return (
                <div
                  key={p.name}
                  className="glass-card p-4"
                  style={{ borderTop: `3px solid ${urgencyColor}` }}
                >
                  <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {p.acct}
                  </div>
                  <div className="text-[12px] font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  <div className="text-[20px] font-extrabold leading-none my-2" style={{ color: urgencyColor }}>
                    {daysLabel}
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    {fmt(p.balance)} at 0%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
