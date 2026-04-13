'use client'

import type {
  SpendingCategory,
  BurnRateItem,
  WealthScenario,
  TaxSnapshot,
  IncomeBridge,
  SpendingSummary,
} from '@/lib/financial-data'
import { fmt, calcWealth } from '@/lib/financial-data'
import KPICard from './KPICard'
import SpendingDonut from './SpendingDonut'
import BurnRateChart from './BurnRateChart'
import WealthProjectionChart from './WealthProjectionChart'
import TaxSnapshotCard from './TaxSnapshotCard'
import SpendTrendChart from './SpendTrendChart'
import BalanceHistoryChart from './BalanceHistoryChart'

function fmtK(n: number): string {
  return n >= 1000 ? '$' + (n / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 }) + 'K' : '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtWhole(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function SpendingBudgetTab({
  spendingCategories,
  burnRate,
  wealthScenarios,
  taxSnapshot,
  incomeBridge,
  spendingSummary,
}: {
  spendingCategories: SpendingCategory[]
  burnRate: BurnRateItem[]
  wealthScenarios: WealthScenario[]
  taxSnapshot: TaxSnapshot
  incomeBridge: IncomeBridge
  spendingSummary: SpendingSummary
}) {
  const totalCurrent = burnRate.reduce((s, b) => s + b.current, 0)
  const totalSurvival = burnRate.reduce((s, b) => s + b.survival, 0)
  const monthlySaved = totalCurrent - totalSurvival

  // Computed from spendingCategories
  const totalAnnual = spendingCategories.reduce((s, c) => s + c.annual, 0)
  const totalMonthly = spendingCategories.reduce((s, c) => s + c.monthly, 0)
  const totalSurvivalSpend = spendingCategories.reduce((s, c) => s + c.survival, 0)
  const topCat = spendingCategories.length > 0 ? spendingCategories[0] : null

  // Use spendingSummary for transaction count and card info (not derivable from categories)
  const txnCount = spendingSummary.totalTransactions
  const cardsAnalyzed = spendingSummary.cardsAnalyzed
  const savingsTarget = totalMonthly - totalSurvivalSpend

  // Income bridge computed values
  const ib = incomeBridge
  const totalLiquid = ib.liquidCash + ib.marchPaychecks + ib.severanceEstimate + ib.familyBridge
  const runwayNoIncome = ib.monthlyOutflow > 0 ? totalLiquid / ib.monthlyOutflow : 0
  const consultingDeficit = ib.monthlyOutflow - ib.consultingMonthlyNet
  const runwayConsulting = consultingDeficit > 0 ? totalLiquid / consultingDeficit : 99
  const newJobSurplus = ib.newJobMonthlyNet - ib.monthlyOutflow
  const mustLandBy = Math.ceil(runwayNoIncome)

  // Property tax from taxSnapshot
  const propTaxDetails = taxSnapshot.propertyTaxDetails ?? []
  const propTaxTotal = propTaxDetails.reduce((s, t) => s + t.amount, 0)
  const propTaxMonthly = propTaxTotal / 12

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="2025 CC Spend (full year)"
          value={fmtWhole(totalAnnual)}
          note={`${cardsAnalyzed} · ${txnCount.toLocaleString()} txns`}
          accent="red"
        />
        <KPICard
          label="Monthly Average"
          value={`${fmtWhole(totalMonthly)}/mo`}
          note="Credit cards only — does not include ACH"
          accent="amber"
        />
        <KPICard
          label="#1 Category"
          value={topCat?.cat ?? '—'}
          note={topCat ? `${fmtWhole(topCat.annual)} · ${topCat.pct}% of total CC spend` : ''}
        />
        <KPICard
          label="Monthly Savings Target"
          value={`~${fmtWhole(savingsTarget)}/mo`}
          note={`Cards only: ${fmtWhole(totalMonthly)} → ${fmtWhole(totalSurvivalSpend)} survival`}
          accent="green"
        />
      </div>

      {/* Spend Trend + Balance History (live from transactions table) */}
      <SpendTrendChart />
      <BalanceHistoryChart />

      {/* Category chart + table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            2025 Spending by Category (CC only)
          </h3>
          <SpendingDonut categories={spendingCategories} />
        </div>
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Category Breakdown — Full Year 2025
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  {['Category', 'Annual', 'Monthly Avg', '% Total', 'Survival'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spendingCategories.map((c, i) => (
                  <tr key={c.cat} style={{ borderBottom: i < spendingCategories.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <td className="py-2 px-3 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: c.color }} />
                      {c.cat}
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(c.annual)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(c.monthly)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{c.pct}%</td>
                    <td className="py-2 px-3 text-[12px] font-mono" style={{ color: c.survival === 0 ? '#ef4444' : '#22c55e' }}>
                      {c.survival === 0 ? '$0' : fmt(c.survival)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                  <td className="py-3 px-3 text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>TOTAL (CC)</td>
                  <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmtWhole(totalAnnual)}</td>
                  <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmtWhole(totalMonthly)}</td>
                  <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>100%</td>
                  <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: '#22c55e' }}>~{fmtWhole(totalSurvivalSpend)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Burn Rate */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Monthly Burn Rate — Current vs. Post-HELOC Survival Budget
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
          <BurnRateChart burnRate={burnRate} />
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    {['Category', 'Current /mo', 'Survival /mo', 'Change'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {burnRate.map((b, i) => {
                    const change = b.survival - b.current
                    return (
                      <tr key={b.label} style={{ borderBottom: i < burnRate.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>{b.label}</td>
                        <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(b.current)}</td>
                        <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(b.survival)}</td>
                        <td className="py-2 px-3 text-[12px] font-mono" style={{ color: change < 0 ? '#22c55e' : change > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          {change === 0 ? '—' : (change > 0 ? '+' : '') + fmt(change)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    <td className="py-3 px-3 text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>TOTAL OUTFLOW</td>
                    <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: '#ef4444' }}>{fmt(totalCurrent)}</td>
                    <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: '#22c55e' }}>{fmt(totalSurvival)}</td>
                    <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: '#22c55e' }}>−{fmt(monthlySaved)}/mo</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div
              className="mt-3 p-3 rounded-lg text-[12px]"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <strong style={{ color: '#22c55e' }}>✅ Post-HELOC + spending cuts = {fmtWhole(Math.round(monthlySaved))}/mo relief</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Wealth Projection */}
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
                      <th key={h} className="text-left py-2 px-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wealthScenarios.map((s) => (
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

      {/* Income Bridge */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Income Bridge &amp; Runway (Post-JPMC Exit)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scenario A — No Income */}
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
            <div className="text-[11px] mt-3" style={{ color: '#ef4444' }}>⚠️ Must land job by ~{mustLandBy} months out</div>
          </div>

          {/* Scenario B — Consulting */}
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
            <div className="text-[11px] mt-3" style={{ color: '#f59e0b' }}>Consulting bridges the gap significantly</div>
          </div>

          {/* Scenario C — New Job */}
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

        {/* Liquid cash breakdown */}
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

      {/* Tax Snapshot */}
      <div className="glass-card p-5">
        <TaxSnapshotCard taxSnapshot={taxSnapshot} />
      </div>

      {/* Property Tax Detail */}
      {propTaxDetails.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Property Tax Detail
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    {['Taxing Authority', '2025 Tax Due', '% of Total'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {propTaxDetails.map((t, i) => (
                    <tr key={t.auth} style={{ borderBottom: i < propTaxDetails.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <td className="py-2 px-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>{t.auth}</td>
                      <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(t.amount)}</td>
                      <td className="py-2 px-3 text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{t.pct}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    <td className="py-3 px-3 text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>TOTAL</td>
                    <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(propTaxTotal)}/yr</td>
                    <td className="py-3 px-3 text-[12px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(Math.round(propTaxMonthly * 100) / 100)}/mo</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg text-[12px]" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <strong style={{ color: '#f59e0b' }}>🏠 DCAD Protest Opportunity (Module 6)</strong>
                <br />
                <span style={{ color: 'var(--text-muted)' }}>
                  Filing deadline: May 15, 2026
                </span>
              </div>
              <div className="p-3 rounded-lg text-[12px]" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <strong style={{ color: '#22c55e' }}>✅ 2025 taxes already paid</strong>
                <br />
                <span style={{ color: 'var(--text-muted)' }}>
                  All {propTaxDetails.length} jurisdictions confirmed paid · Budget: {fmt(Math.round(propTaxMonthly * 100) / 100)}/mo set aside
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
