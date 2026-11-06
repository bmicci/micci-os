'use client'

import type { SpendingCategory, BurnRateItem, WealthScenario, TaxSnapshot, OfferPaycheck } from '@/lib/financial-data'
import type { BurnAnalysis } from '@/lib/finance/txnAggregate'
import Link from 'next/link'
import { fmt, calcWealth } from '@/lib/financial-data'
import KPICard from './KPICard'
import WealthProjectionChart from './WealthProjectionChart'
import TaxSnapshotCard from './TaxSnapshotCard'
import SpendTrendChart from './SpendTrendChart'
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

function fmtK(n: number): string {
  return n >= 1000 ? '$' + (n / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 }) + 'K' : '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtWhole(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function BudgetActualTab({
  spendingCategories,
  burnRate,
  wealthScenarios,
  taxSnapshot,
  burnAnalysis,
  offers,
  invested,
}: {
  spendingCategories: SpendingCategory[]
  burnRate: BurnRateItem[]
  wealthScenarios: WealthScenario[]
  taxSnapshot: TaxSnapshot
  burnAnalysis: BurnAnalysis
  offers: OfferPaycheck[]
  /** Retirement + brokerage today — the wealth projection's starting point */
  invested: number
}) {
  // KPI Calculations
  const totalBudget = spendingCategories.reduce((s, c) => s + c.survival, 0)
  const totalActual = spendingCategories.reduce((s, c) => s + c.monthly, 0)
  const overUnder = totalActual - totalBudget
  const savingsPotential = spendingCategories.reduce((s, c) => s + (c.monthly - c.survival), 0)

  // Cash out per month, live: living spend by category (Debt Service swapped
  // for the debt list) + debt minimums. Survival targets where a category has one.
  const survivalByCat = new Map(spendingCategories.map(c => [c.cat, c.survival]))
  const cashOutRows = burnAnalysis.hasData
    ? [
        ...burnAnalysis.byCategory.filter(c => c.cat !== 'Debt Service' && c.monthly > 0)
          .map(c => ({ label: c.cat, current: c.monthly, survival: survivalByCat.get(c.cat) ?? null })),
        { label: 'Debt minimums (all debts, incl. mortgage)', current: burnAnalysis.debtPayments ?? 0, survival: null as number | null },
      ]
    : burnRate.map(b => ({ label: b.label, current: b.current, survival: b.survival as number | null }))
  const totalCurrent = burnAnalysis.hasData ? burnAnalysis.monthlyOutflow : cashOutRows.reduce((s, b) => s + b.current, 0)

  // Income vs cash out (accepted job)
  const job = offers.find(o => o.offer.status === 'accepted') ?? null
  const takeHome = job?.monthlyNetAvg ?? 0
  const leftOver = takeHome - totalCurrent
  const bonusPct = job?.offer.kind === 'salary' ? job.offer.bonusPct ?? 0 : 0

  // Chart Data
  const budgetVsActualData = spendingCategories.map(c => ({
    category: c.cat,
    Budget: c.survival,
    Actual: c.monthly,
    color: c.color,
  }))

  return (
    <div className="space-y-5">
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Monthly Budget" value={fmt(totalBudget)} note="Sum of survival targets" accent="green" />
        <KPICard label="Actual Monthly Spend" value={fmt(totalActual)} note="12-mo avg · incl. pre-exit months (Cash Flow = recent 90d)" accent="amber" />
        <KPICard label="Over/Under Budget" value={fmt(Math.abs(overUnder))} note={overUnder <= 0 ? 'Under budget (good!)' : 'Over budget'} accent={overUnder <= 0 ? 'green' : 'red'} />
        <KPICard label="Savings Potential" value={fmt(savingsPotential)} note="Gap between actual & budget" accent="cyan" />
      </div>

      {/* Spend Trend (live from imported transactions) */}
      <SpendTrendChart />

      {/* 2. Budget vs. Actual Bar Chart */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Budget vs. Actual by Category
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={budgetVsActualData} layout="vertical" margin={{ top: 5, right: 20, left: 150, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" stroke="var(--text-muted)" />
            <YAxis type="category" dataKey="category" width={140} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: 'rgba(20,20,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(value) => [fmt((value as number) ?? 0), '']}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
            <Bar dataKey="Budget" fill="#22c55e" radius={[0, 4, 4, 0]} />
            <Bar dataKey="Actual" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Category Detail Table */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Category Breakdown — Budget vs. Actual
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {['Category', 'Budget/mo', 'Actual/mo', 'Variance', '% of Actual'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spendingCategories.map((c, i) => {
                const variance = c.monthly - c.survival
                return (
                  <tr key={c.cat} style={{ borderBottom: i < spendingCategories.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <td className="py-2 px-3 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: c.color }} />
                      {c.cat}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(c.survival)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(c.monthly)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: variance <= 0 ? '#22c55e' : '#ef4444' }}>
                      {variance <= 0 ? '−' : '+'}{fmt(Math.abs(variance))}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {((c.monthly / totalActual) * 100).toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <td className="py-3 px-3 text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>TOTAL</td>
                <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(totalBudget)}</td>
                <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(totalActual)}</td>
                <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: overUnder <= 0 ? '#22c55e' : '#ef4444' }}>
                  {overUnder <= 0 ? '−' : '+'}{fmt(Math.abs(overUnder))}
                </td>
                <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Burn Rate */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Cash Out per Month{burnAnalysis.hasData ? ` — last ${burnAnalysis.windowDays} days, ${burnAnalysis.txnCount.toLocaleString()} transactions` : ' (manual estimate — no transactions)'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {['Category', 'Actual /mo', 'Survival target', 'Gap'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cashOutRows.map((b, i) => {
                const gap = b.survival == null ? null : b.current - b.survival
                return (
                  <tr key={b.label} style={{ borderBottom: i < cashOutRows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>{b.label}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(b.current)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{b.survival == null ? '—' : fmt(b.survival)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: gap == null || gap === 0 ? 'var(--text-muted)' : gap > 0 ? '#ef4444' : '#22c55e' }}>
                      {gap == null || gap === 0 ? '—' : (gap > 0 ? '+' : '−') + fmt(Math.abs(gap))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <td className="py-3 px-3 text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>TOTAL</td>
                <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: '#ef4444' }}>{fmt(totalCurrent)}</td>
                <td className="py-3 px-3 text-[12px]" colSpan={2} style={{ color: 'var(--text-muted)' }}>what leaves checking each month — the runway uses this</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Income vs cash out */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Income vs. Cash Out
        </h3>
        {job ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-line)' }}>
              <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{job.offer.employer} take-home</div>
              <div className="text-xl font-bold font-mono" style={{ color: '#22c55e' }}>{fmtWhole(takeHome)}/mo</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {fmtWhole(job.netPerCheckEarly)}/check × {job.offer.payFrequency}/yr, average incl. the Social Security cap · first check {job.offer.firstPayday}
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-line)' }}>
              <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Cash out</div>
              <div className="text-xl font-bold font-mono" style={{ color: '#f87171' }}>{fmtWhole(totalCurrent)}/mo</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>living spend + every debt minimum</div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(var(--accent-rgb), 0.06)', border: '1px solid var(--glass-line)' }}>
              <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Left over</div>
              <div className="text-xl font-bold font-mono" style={{ color: leftOver >= 0 ? 'var(--accent-cyan)' : '#f87171' }}>
                {leftOver >= 0 ? '+' : '−'}{fmtWhole(Math.abs(leftOver))}/mo
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                before one-time payments (property tax, promo payoffs) — see the{' '}
                <Link href="/finance/cashflow" style={{ color: 'var(--accent-cyan)' }}>Cash Flow page</Link> for month by month
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No accepted job offer saved — add one in financial_settings.job_offers.</p>
        )}
      </div>

      {/* 6. Wealth Projection */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          20-Year Net Worth Projection — {wealthScenarios.length} Scenarios
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4" style={{ alignItems: 'start' }}>
          <div className="lg:col-span-2">
            <WealthProjectionChart scenarios={wealthScenarios} start={invested} />
            <div className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
              ★ Starts from {fmtK(invested)} invested today (retirement + brokerage){job ? ` · ${job.offer.employer} ${fmtK(job.annualGross)} base${bonusPct ? ` + ${bonusPct}% target bonus` : ''}` : ''} · Texas 0% state tax
            </div>
          </div>
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    {['Scenario', 'Age 45', 'Age 50', 'Age 55', 'Age 60'].map(h => (
                      <th key={h} className="text-left py-2 px-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wealthScenarios.map(s => (
                    <tr key={s.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td className="py-2 px-2 font-semibold" style={{ color: s.color }}>{s.name}</td>
                      {[5, 10, 15, 20].map(n => (
                        <td key={n} className="py-2 px-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          ${(calcWealth(invested, s.pmt, s.r, n) / 1e6).toFixed(1)}M
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Tax Snapshot */}
      <div className="glass-card p-5">
        <TaxSnapshotCard taxSnapshot={taxSnapshot} />
      </div>
    </div>
  )
}
