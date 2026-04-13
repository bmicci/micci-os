'use client'

import type { SpendingCategory, BurnRateItem, WealthScenario, TaxSnapshot, IncomeBridge } from '@/lib/financial-data'
import { fmt, calcWealth } from '@/lib/financial-data'
import KPICard from './KPICard'
import WealthProjectionChart from './WealthProjectionChart'
import TaxSnapshotCard from './TaxSnapshotCard'
import SpendTrendChart from './SpendTrendChart'
import BalanceHistoryChart from './BalanceHistoryChart'
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
  incomeBridge,
}: {
  spendingCategories: SpendingCategory[]
  burnRate: BurnRateItem[]
  wealthScenarios: WealthScenario[]
  taxSnapshot: TaxSnapshot
  incomeBridge: IncomeBridge
}) {
  // KPI Calculations
  const totalBudget = spendingCategories.reduce((s, c) => s + c.survival, 0)
  const totalActual = spendingCategories.reduce((s, c) => s + c.monthly, 0)
  const overUnder = totalActual - totalBudget
  const savingsPotential = spendingCategories.reduce((s, c) => s + (c.monthly - c.survival), 0)

  // Burn Rate totals
  const totalCurrent = burnRate.reduce((s, b) => s + b.current, 0)
  const totalSurvival = burnRate.reduce((s, b) => s + b.survival, 0)
  const monthlySaved = totalCurrent - totalSurvival

  // Income Bridge computed values
  const ib = incomeBridge
  const totalLiquid = ib.liquidCash + ib.marchPaychecks + ib.severanceEstimate + ib.familyBridge
  const runwayNoIncome = ib.monthlyOutflow > 0 ? totalLiquid / ib.monthlyOutflow : 0
  const consultingDeficit = ib.monthlyOutflow - ib.consultingMonthlyNet
  const runwayConsulting = consultingDeficit > 0 ? totalLiquid / consultingDeficit : 99
  const newJobSurplus = ib.newJobMonthlyNet - ib.monthlyOutflow

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
        <KPICard label="Actual Monthly Spend" value={fmt(totalActual)} note="Sum of current spend" accent="amber" />
        <KPICard label="Over/Under Budget" value={fmt(Math.abs(overUnder))} note={overUnder <= 0 ? 'Under budget (good!)' : 'Over budget'} accent={overUnder <= 0 ? 'green' : 'red'} />
        <KPICard label="Savings Potential" value={fmt(savingsPotential)} note="Gap between actual & budget" accent="cyan" />
      </div>

      {/* Spend Trend + Balance History */}
      <SpendTrendChart />
      <BalanceHistoryChart />

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
              formatter={(value: number | undefined) => [fmt(value ?? 0), '']}
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
          Burn Rate Comparison — Current vs. Survival Budget
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                {['Category', 'Current /mo', 'Survival /mo', 'Delta'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {burnRate.map((b, i) => {
                const delta = b.survival - b.current
                return (
                  <tr key={b.label} style={{ borderBottom: i < burnRate.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>{b.label}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(b.current)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(b.survival)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: delta < 0 ? '#22c55e' : delta > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                      {delta === 0 ? '—' : (delta > 0 ? '+' : '') + fmt(delta)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <td className="py-3 px-3 text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>TOTAL</td>
                <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: '#ef4444' }}>{fmt(totalCurrent)}</td>
                <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: '#22c55e' }}>{fmt(totalSurvival)}</td>
                <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: '#22c55e' }}>−{fmt(monthlySaved)}/mo</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Income Bridge */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Income Bridge &amp; Runway (Post-JPMC Exit)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="font-bold text-[13px] mb-3" style={{ color: '#ef4444' }}>Scenario A — No Income</div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>Monthly outflow</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtWhole(ib.monthlyOutflow)}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>Liquid (cash+sev est.)</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtWhole(totalLiquid)}</span>
              </div>
              <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="font-bold" style={{ color: '#ef4444' }}>Runway</span>
                <span className="font-bold" style={{ color: '#ef4444' }}>~{runwayNoIncome.toFixed(1)} months</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="font-bold text-[13px] mb-3" style={{ color: '#f59e0b' }}>Scenario B — Consulting</div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>Monthly income</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtWhole(ib.consultingMonthlyNet)} net</span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>Monthly outflow</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtWhole(ib.monthlyOutflow)}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>Monthly deficit</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>−{fmtWhole(consultingDeficit)}</span>
              </div>
              <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(245,158,11,0.25)' }}>
                <span className="font-bold" style={{ color: '#f59e0b' }}>Extended runway</span>
                <span className="font-bold" style={{ color: '#f59e0b' }}>~{runwayConsulting.toFixed(1)} months</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div className="font-bold text-[13px] mb-3" style={{ color: '#22c55e' }}>Scenario C — New Job ({fmtK(ib.targetSalary)})</div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>Monthly income net</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtWhole(ib.newJobMonthlyNet)}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>Monthly outflow</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtWhole(ib.monthlyOutflow)}</span>
              </div>
              <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(34,197,94,0.25)' }}>
                <span className="font-bold" style={{ color: '#22c55e' }}>Monthly surplus</span>
                <span className="font-bold" style={{ color: '#22c55e' }}>+{fmtWhole(newJobSurplus)}/mo</span>
              </div>
            </div>
            <div className="text-[11px] mt-3" style={{ color: '#22c55e' }}>Target: {fmtK(ib.targetSalary)} base / {fmtK(ib.targetTotalComp)} total comp</div>
          </div>
        </div>

        <div
          className="mt-4 p-3 rounded-lg text-[12px]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Liquid Cash Breakdown:</strong>{' '}
          <span style={{ color: 'var(--text-muted)' }}>
            Checking ~{fmtWhole(ib.liquidCash)} + Mar paychecks ~{fmtWhole(ib.marchPaychecks)} + Severance est. {fmtWhole(ib.severanceEstimate)} + Family bridge ~{fmtWhole(ib.familyBridge)}
            = <strong style={{ color: 'var(--text-primary)' }}>{fmtWhole(totalLiquid)} total</strong>
            {' '}|{' '}
            <span style={{ color: '#f59e0b' }}>⚠️ Confirm exact JPMC severance with HR</span>
          </span>
        </div>
      </div>

      {/* 6. Wealth Projection */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          20-Year Net Worth Projection — {wealthScenarios.length} Scenarios
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4" style={{ alignItems: 'start' }}>
          <div className="lg:col-span-2">
            <WealthProjectionChart scenarios={wealthScenarios} />
            <div className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
              ★ Based on {fmtK(ib.targetTotalComp)} total comp ({fmtK(ib.targetSalary)} base + 30% bonus) · Texas 0% state tax
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
                          ${(calcWealth(410000, s.pmt, s.r, n) / 1e6).toFixed(1)}M
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
