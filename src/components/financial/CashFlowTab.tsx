'use client'

import { useMemo } from 'react'
import type { Bill, PromoDeadline, DebtAccount, HelocKPIs } from '@/lib/financial-data'
import { fmt, HELOC_RATE, HELOC_DRAWN } from '@/lib/financial-data'
import {
  calculateMonthlyFlow,
  project12Months,
  DEFAULT_EXPENSES,
  DEFAULT_ALLOCATIONS,
  type CashFlowInputs,
} from '@/lib/finance/cashflow'
import KPICard from './KPICard'
import CashFlowProjectionChart from './CashFlowProjectionChart'

// ── Helpers ──────────────────────────────────────────
function fmtRound(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function fmtK(n: number): string {
  return n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'K' : '$' + n.toFixed(0)
}

function monthsUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
}

// ── Props ────────────────────────────────────────────
interface CashFlowTabProps {
  bills: Bill[]
  promos: PromoDeadline[]
  debts: DebtAccount[]
  helocKPIs: HelocKPIs
  incomeBridge: {
    targetSalary: number
    newJobMonthlyNet: number
    monthlyOutflow: number
    liquidCash: number
    consultingMonthlyNet: number
  }
}

export default function CashFlowTab({ bills, promos, debts, helocKPIs, incomeBridge }: CashFlowTabProps) {
  // ── Derive inputs from live data ──
  const cashFlowData = useMemo(() => {
    // Current income: unemployment while between jobs; falls back to
    // new-job net once consultingMonthlyNet is zeroed out.
    const onBridge = incomeBridge.consultingMonthlyNet > 0
    const currentMonthlyNet = onBridge
      ? incomeBridge.consultingMonthlyNet
      : incomeBridge.newJobMonthlyNet
    const payFrequency = 24 // semi-monthly
    const netPayPerPeriod = Math.round(currentMonthlyNet * 12 / payFrequency)

    // HELOC monthly interest from live KPIs
    const helocMonthlyInterest = helocKPIs.monthlyHelocInterest

    // Promo minimums: sum of min payments on promo accounts
    const promoMinimums = debts
      .filter(d => d.decision === 'promo')
      .reduce((sum, d) => sum + (d.min ?? 0), 0)

    // Keep + roll minimums (non-mortgage, non-HELOC): all still being paid
    // monthly until each roll-target is actually absorbed into the HELOC
    const deferredPayments = debts
      .filter(d => (d.decision === 'keep' || d.decision === 'roll') && d.category !== 'Mortgage' && d.category !== 'HELOC')
      .reduce((sum, d) => sum + (d.min ?? 0), 0)

    const inputs: CashFlowInputs = {
      netPayPerPeriod,
      payFrequency,
      helocMonthlyInterest,
      promoMinimums,
      deferredPayments,
      expenses: DEFAULT_EXPENSES,
      allocations: DEFAULT_ALLOCATIONS,
    }

    const monthlyFlow = calculateMonthlyFlow(inputs)

    // Build scheduled events from promo deadlines
    const scheduledEvents = promos
      .filter(p => p.balance > 0)
      .map(p => ({
        monthOffset: Math.max(0, monthsUntil(p.expires)),
        label: `${p.name} expires (${fmtK(p.balance)})`,
        amountDelta: 0, // Promos are already in minimums; payoff is a lump sum, not a monthly change
      }))
      .filter(e => e.monthOffset < 12)

    const projections = project12Months({
      baseCashFlow: inputs,
      ssCapPeriod: onBridge ? null : 18, // no SS cap-out on unemployment income
      payFrequency,
      grossPayPerPeriod: netPayPerPeriod,
      ssPerPeriodSavings: onBridge ? 0 : 42,
      scheduledEvents,
    })

    return { monthlyFlow, projections, inputs, onBridge, currentMonthlyNet }
  }, [debts, promos, helocKPIs, incomeBridge])

  const { monthlyFlow, projections, onBridge } = cashFlowData

  // ── Cash runway: months of liquid cash left at current burn ──
  const monthlyBurn = -monthlyFlow.freeCash
  const runwayMonths = monthlyBurn > 0 ? incomeBridge.liquidCash / monthlyBurn : null

  // ── Upcoming bills (next 30 days) ──
  const upcomingBills = useMemo(() => {
    // Bills are month-relative (e.g. "Mar 1"), show all
    return bills.slice(0, 10)
  }, [bills])

  // ── Upcoming promo deadlines (next 6 months) ──
  const upcomingPromos = useMemo(() => {
    return promos
      .filter(p => p.balance > 0 && monthsUntil(p.expires) >= 0 && monthsUntil(p.expires) <= 6)
      .sort((a, b) => new Date(a.expires).getTime() - new Date(b.expires).getTime())
  }, [promos])

  // ── Allocation colors ──
  const allocationColors = ['#00d4ff', '#22c55e', '#8b5cf6', '#f59e0b']

  return (
    <div className="space-y-5">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          label="Monthly Income"
          value={fmtRound(monthlyFlow.totalIncome)}
          note={onBridge ? `Unemployment · next job ~${fmtK(incomeBridge.newJobMonthlyNet)}/mo net` : 'New job net'}
          accent="green"
        />
        <KPICard
          label="Debt Obligations"
          value={fmtRound(monthlyFlow.totalObligations)}
          note={`HELOC int + card mins + loans`}
          accent="red"
        />
        <KPICard
          label="Living Expenses"
          value={fmtRound(monthlyFlow.totalLivingExpenses)}
          note={`${DEFAULT_EXPENSES.length} categories`}
        />
        <KPICard
          label="Free Cash Flow"
          value={fmtRound(monthlyFlow.freeCash)}
          note={monthlyFlow.freeCash > 0 ? 'Available after all obligations' : 'Burning cash until next job'}
          accent={monthlyFlow.freeCash > 0 ? 'green' : 'red'}
        />
        <KPICard
          label="HELOC Interest"
          value={fmtRound(helocKPIs.monthlyHelocInterest)}
          note={`${HELOC_RATE}% on ${fmtK(HELOC_DRAWN)} drawn`}
          accent="amber"
        />
        {runwayMonths !== null ? (
          <KPICard
            label="Cash Runway"
            value={`${runwayMonths.toFixed(1)} mo`}
            note={`${fmtK(incomeBridge.liquidCash)} liquid ÷ ${fmtK(monthlyBurn)}/mo burn`}
            accent={runwayMonths < 4 ? 'red' : 'amber'}
          />
        ) : (
          <KPICard
            label="12-Mo Projected Savings"
            value={fmtRound(projections[projections.length - 1]?.cumulativeSavings ?? 0)}
            note="Cumulative free cash"
            accent="cyan"
          />
        )}
      </div>

      {/* ── 12-Month Projection Chart + Allocations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
        {/* Projection Chart — 2/3 width */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            12-Month Cash Flow Forecast
          </h3>
          <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
            Income vs. obligations with cumulative net cash trend
          </p>
          <CashFlowProjectionChart projections={projections} />
        </div>

        {/* Free Cash Allocation — 1/3 width */}
        <div className="glass-card p-5">
          <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {monthlyFlow.freeCash > 0 ? 'Free Cash Allocation' : 'Monthly Shortfall'}
          </h3>
          <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {monthlyFlow.freeCash > 0
              ? `${fmtRound(monthlyFlow.freeCash)}/mo distributed`
              : `Covered from liquid reserves (${fmtK(incomeBridge.liquidCash)})`}
          </p>

          {monthlyFlow.freeCash > 0 ? (
            <>
              {/* Allocation bar */}
              <div className="flex rounded-lg overflow-hidden h-3 mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {monthlyFlow.allocations.map((a, i) => (
                  <div
                    key={a.label}
                    className="h-full transition-all"
                    style={{
                      width: `${a.percent}%`,
                      background: allocationColors[i % allocationColors.length],
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>

              {/* Allocation breakdown */}
              <div className="space-y-3">
                {monthlyFlow.allocations.map((a, i) => (
                  <div key={a.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: allocationColors[i % allocationColors.length] }}
                      />
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {a.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {fmtRound(a.amount)}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {a.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="p-3 rounded-lg space-y-2"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <div className="flex justify-between text-[12px]">
                <span style={{ color: 'var(--text-secondary)' }}>Monthly burn</span>
                <span className="font-mono font-semibold" style={{ color: '#ef4444' }}>{fmtRound(monthlyBurn)}</span>
              </div>
              {runwayMonths !== null && (
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: 'var(--text-secondary)' }}>Runway at this burn</span>
                  <span className="font-mono font-semibold" style={{ color: '#f59e0b' }}>{runwayMonths.toFixed(1)} months</span>
                </div>
              )}
              <p className="text-[11px] pt-1" style={{ color: 'var(--text-muted)' }}>
                Allocations resume once income exceeds obligations (new job).
              </p>
            </div>
          )}

          {/* Monthly breakdown summary */}
          <div
            className="mt-5 pt-4 space-y-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex justify-between text-[12px]">
              <span style={{ color: 'var(--text-muted)' }}>Income</span>
              <span className="font-mono" style={{ color: '#22c55e' }}>{fmtRound(monthlyFlow.totalIncome)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: 'var(--text-muted)' }}>Obligations</span>
              <span className="font-mono" style={{ color: '#ef4444' }}>−{fmtRound(monthlyFlow.totalObligations)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: 'var(--text-muted)' }}>Living Expenses</span>
              <span className="font-mono" style={{ color: '#ef4444' }}>−{fmtRound(monthlyFlow.totalLivingExpenses)}</span>
            </div>
            <div
              className="flex justify-between text-[13px] font-bold pt-2"
              style={{ borderTop: '1px solid rgba(0,212,255,0.15)' }}
            >
              <span style={{ color: 'var(--accent-cyan)' }}>Free Cash</span>
              <span className="font-mono" style={{ color: monthlyFlow.freeCash > 0 ? '#22c55e' : '#ef4444' }}>
                {fmtRound(monthlyFlow.freeCash)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bills Calendar + Promo Timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
        {/* Recurring Bills */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Recurring Bills
            </h3>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {fmt(bills.reduce((s, b) => s + b.amount, 0))}/mo total
            </span>
          </div>
          <div className="space-y-0">
            {upcomingBills.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: i < upcomingBills.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{
                      background: b.status === 'autopay' ? 'rgba(34,197,94,0.12)' :
                                  b.status === 'paid' ? 'rgba(34,197,94,0.12)' :
                                  b.status === 'confirm' ? 'rgba(245,158,11,0.12)' :
                                  'rgba(255,255,255,0.06)',
                      color: b.status === 'autopay' ? '#22c55e' :
                             b.status === 'paid' ? '#22c55e' :
                             b.status === 'confirm' ? '#f59e0b' :
                             'var(--text-muted)',
                    }}
                  >
                    {b.date.split(' ')[0]?.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
                      {b.payee}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {b.date}
                      {b.status === 'autopay' && ' · Autopay'}
                      {b.status === 'paid' && ' · Paid'}
                      {b.status === 'confirm' && ' · Needs confirmation'}
                    </div>
                  </div>
                </div>
                <div className="text-[12px] font-mono font-semibold shrink-0 ml-2" style={{ color: 'var(--text-secondary)' }}>
                  {fmt(b.amount)}
                </div>
              </div>
            ))}
            {bills.length > 10 && (
              <div className="text-center py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                +{bills.length - 10} more bills
              </div>
            )}
          </div>
        </div>

        {/* Promo Deadlines Timeline */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Promo Payoff Timeline
            </h3>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Next 6 months
            </span>
          </div>
          {upcomingPromos.length === 0 ? (
            <div className="text-center py-8 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              No promo deadlines in the next 6 months
            </div>
          ) : (
            <div className="space-y-0">
              {upcomingPromos.map((p, i) => {
                const months = monthsUntil(p.expires)
                const urgency = months <= 1 ? '#ef4444' : months <= 3 ? '#f59e0b' : '#22c55e'
                const expiresDate = new Date(p.expires)
                const dateLabel = expiresDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })

                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3 transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: i < upcomingPromos.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                  >
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: urgency, boxShadow: `0 0 8px ${urgency}40` }}
                      />
                      {i < upcomingPromos.length - 1 && (
                        <div className="w-px flex-1 mt-1 min-h-[24px]" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {p.name}
                        </span>
                        <span className="text-[12px] font-mono font-semibold shrink-0" style={{ color: urgency }}>
                          {fmt(p.balance)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Expires {dateLabel}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: `${urgency}15`,
                            color: urgency,
                          }}
                        >
                          {months <= 0 ? 'OVERDUE' : months === 1 ? '1 month' : `${months} months`}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {p.note}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Total promo exposure */}
          <div
            className="mt-4 p-3 rounded-lg text-center"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <div className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>
              Total Promo Exposure (6 mo)
            </div>
            <div className="text-[16px] font-bold font-mono mt-0.5" style={{ color: '#f59e0b' }}>
              {fmtRound(upcomingPromos.reduce((s, p) => s + p.balance, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Expense Breakdown ── */}
      <div className="glass-card p-5">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Monthly Expense Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DEFAULT_EXPENSES.map(exp => (
            <div
              key={exp.id}
              className="p-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {exp.category}
              </div>
              <div className="text-[16px] font-bold font-mono mt-1" style={{ color: 'var(--text-primary)' }}>
                {fmtRound(exp.amount)}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {exp.label}
              </div>
            </div>
          ))}
        </div>
        <div
          className="mt-3 flex justify-between items-center p-3 rounded-lg"
          style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}
        >
          <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-cyan)' }}>
            Total Monthly Living Expenses
          </span>
          <span className="text-[14px] font-bold font-mono" style={{ color: 'var(--accent-cyan)' }}>
            {fmtRound(monthlyFlow.totalLivingExpenses)}
          </span>
        </div>
      </div>
    </div>
  )
}
