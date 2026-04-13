'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import type { DebtAccount, HelocKPIs, Assets } from '@/lib/financial-data'
import { fmt, fmtK } from '@/lib/financial-data'
import KPICard from './KPICard'

// ── Props ────────────────────────────────────────────
interface NetWorthTabProps {
  debts: DebtAccount[]
  helocKPIs: HelocKPIs
  assets: Assets
}

// ── Helpers ──────────────────────────────────────────
function calculateNetWorthData(debts: DebtAccount[], assets: Assets) {
  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0)
  const totalLiabilities = debts.reduce((sum, d) => sum + d.balance, 0)
  const netWorth = totalAssets - totalLiabilities
  const mortgageDebt = debts.find(d => d.category === 'Mortgage')?.balance ?? 0
  const nonMortgageDebt = totalLiabilities - mortgageDebt
  const homeEquity = assets.home - mortgageDebt
  const homeEquityPct = assets.home > 0 ? (homeEquity / assets.home) * 100 : 0

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    debtToAssetRatio: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0,
    homeEquity,
    homeEquityPct,
    nonMortgageDebt,
    mortgageDebt,
  }
}

function generateNetWorthProjection(startNetWorth: number, monthlyImprovement: number = 2000) {
  const data = []
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthName = months[date.getMonth()]
    const projectedNW = startNetWorth + monthlyImprovement * i

    data.push({
      month: monthName,
      netWorth: Math.round(projectedNW),
    })
  }

  return data
}

function getDebtByCategory(debts: DebtAccount[]) {
  const categories = new Map<string, number>()

  debts.forEach(d => {
    const current = categories.get(d.category) ?? 0
    categories.set(d.category, current + d.balance)
  })

  return Array.from(categories.entries()).map(([name, value]) => ({
    name,
    value,
  }))
}

export default function NetWorthTab({ debts, helocKPIs, assets }: NetWorthTabProps) {
  const nwData = useMemo(() => calculateNetWorthData(debts, assets), [debts, assets])
  const projectionData = useMemo(() => generateNetWorthProjection(nwData.netWorth), [nwData.netWorth])
  const debtByCategory = useMemo(() => getDebtByCategory(debts), [debts])

  const oneMillionProgress = (nwData.netWorth / 1000000) * 100
  const debtFreeProgress = nwData.nonMortgageDebt === 0 ? 100 : Math.max(0, 100 - (nwData.nonMortgageDebt / 100000) * 100)

  // Colors
  const categoryColors = ['#ef4444', '#f59e0b', '#22c55e']
  const assetColors = ['#00d4ff', '#8b5cf6', '#14b8a6', '#3b82f6', '#06b6d4']

  return (
    <div className="space-y-5">
      {/* ── KPI Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          label="Total Net Worth"
          value={fmtK(nwData.netWorth)}
          note="Assets minus liabilities"
          accent="cyan"
        />
        <KPICard
          label="Total Assets"
          value={fmtK(nwData.totalAssets)}
          note="All holdings"
          accent="green"
        />
        <KPICard
          label="Total Liabilities"
          value={fmtK(nwData.totalLiabilities)}
          note="All debt balances"
          accent="red"
        />
        <KPICard
          label="Debt-to-Asset Ratio"
          value={`${nwData.debtToAssetRatio.toFixed(1)}%`}
          note="Lower is healthier"
          accent={nwData.debtToAssetRatio > 40 ? 'red' : nwData.debtToAssetRatio > 20 ? 'amber' : 'green'}
        />
        <KPICard
          label="Home Equity"
          value={fmtK(nwData.homeEquity)}
          note={`${nwData.homeEquityPct.toFixed(1)}% of home value`}
          accent="green"
        />
        <KPICard
          label="Monthly NW Growth"
          value={fmtK(2000)}
          note="Projected based on paydown"
          accent="cyan"
        />
      </div>

      {/* ── Net Worth Trend Chart ── */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Net Worth Projection (12 Months)
        </h3>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
          Assumes $2,000/month improvement from debt paydown and savings
        </p>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={projectionData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="colorNW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'rgba(240,246,255,0.5)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                tick={{ fill: 'rgba(240,246,255,0.5)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickFormatter={(v: number) => fmtK(v)}
              />
              <Tooltip
                contentStyle={{
                  background: '#0a0e27',
                  border: '1px solid rgba(0,212,255,0.3)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [fmt(Number(value)), 'Net Worth']}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="var(--accent-cyan)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNW)"
                dot={{ r: 4, fill: 'var(--accent-cyan)' }}
              />
              {/* Zero line reference */}
              <line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Assets vs Liabilities Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assets Column */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Assets ({fmtK(nwData.totalAssets)})
          </h3>
          <div className="space-y-0">
            {[
              { name: 'Home (2214 N Carroll)', value: assets.home, color: '#00d4ff' },
              { name: '401(k) / Retirement', value: assets.retirement, color: '#8b5cf6' },
              { name: 'Brokerage Account', value: assets.brokerage, color: '#14b8a6' },
              { name: 'Cash / Checking', value: assets.cash, color: '#3b82f6' },
              { name: 'Vehicles', value: assets.vehicles, color: '#06b6d4' },
            ].map((asset, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: asset.color }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                    {asset.name}
                  </span>
                </div>
                <span className="text-[12px] font-mono font-semibold" style={{ color: '#22c55e' }}>
                  {fmtK(asset.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Liabilities Column */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Liabilities ({fmtK(nwData.totalLiabilities)})
          </h3>
          <div className="space-y-0">
            {debts.map((debt, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: i < debts.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      background: debt.category === 'Mortgage' ? '#ef4444' :
                                  debt.category === 'Personal Loan' ? '#f59e0b' : '#ec4899'
                    }}
                  />
                  <div>
                    <div className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                      {debt.name}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {debt.category} · {debt.rate}%
                    </div>
                  </div>
                </div>
                <span className="text-[12px] font-mono font-semibold" style={{ color: '#ef4444' }}>
                  {fmtK(debt.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Debt Composition Donut/Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Debt by Category Pie Chart */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Debt Composition by Category
          </h3>
          <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
            Total outstanding {fmtK(nwData.totalLiabilities)}
          </p>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={debtByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {debtByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0a0e27',
                    border: '1px solid rgba(0,212,255,0.3)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => fmt(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {debtByCategory.map((cat, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: categoryColors[i % categoryColors.length] }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fmtK(cat.value)}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {((cat.value / nwData.totalLiabilities) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          {/* $1M Net Worth Milestone */}
          <div className="glass-card p-5">
            <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              $1M Net Worth Milestone
            </h3>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  Progress
                </span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                  {Math.min(oneMillionProgress, 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(oneMillionProgress, 100)}%`,
                    background: 'var(--accent-cyan)',
                  }}
                />
              </div>
            </div>
            <div className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
              {nwData.netWorth < 1000000
                ? `${fmt(1000000 - nwData.netWorth)} to go`
                : 'Milestone achieved! 🎉'}
            </div>
          </div>

          {/* Debt Free (Excl. Mortgage) Milestone */}
          <div className="glass-card p-5">
            <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Debt Free (Excl. Mortgage)
            </h3>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  Progress
                </span>
                <span className="text-[12px] font-semibold" style={{ color: '#22c55e' }}>
                  {Math.min(debtFreeProgress, 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(debtFreeProgress, 100)}%`,
                    background: '#22c55e',
                  }}
                />
              </div>
            </div>
            <div className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
              {nwData.nonMortgageDebt > 0
                ? `${fmt(nwData.nonMortgageDebt)} remaining`
                : 'You are debt-free (excl. mortgage)! 🎉'}
            </div>
          </div>

          {/* Home Equity > 50% Milestone */}
          <div className="glass-card p-5">
            <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Home Equity {'>'} 50%
            </h3>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  Current
                </span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                  {nwData.homeEquityPct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(nwData.homeEquityPct, 100)}%`,
                    background: nwData.homeEquityPct >= 50 ? 'var(--accent-cyan)' : '#f59e0b',
                  }}
                />
              </div>
            </div>
            <div className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
              {nwData.homeEquityPct >= 50
                ? 'Home equity > 50%! 🏠'
                : `${(50 - nwData.homeEquityPct).toFixed(1)}% more to reach 50%`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Net Worth Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div
            className="p-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Home Mortgage
            </div>
            <div className="text-[16px] font-bold font-mono mt-1" style={{ color: '#ef4444' }}>
              {fmtK(nwData.mortgageDebt)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              vs. {fmtK(assets.home)} home value
            </div>
          </div>

          <div
            className="p-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Non-Mortgage Debt
            </div>
            <div className="text-[16px] font-bold font-mono mt-1" style={{ color: '#ef4444' }}>
              {fmtK(nwData.nonMortgageDebt)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Personal, credit cards
            </div>
          </div>

          <div
            className="p-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Liquid Assets
            </div>
            <div className="text-[16px] font-bold font-mono mt-1" style={{ color: '#22c55e' }}>
              {fmtK(assets.cash + assets.brokerage)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Cash + brokerage
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
