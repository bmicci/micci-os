'use client'

import { useMemo, useState } from 'react'
import {
  chartSeries, deadlineStatus, milestoneStatus, pace, reconcile,
  type LiveDebt, type MasterPlan, type StrategyKey,
} from '@/lib/finance/masterPlan'
import { Card, Segmented, Stat, usd } from '@/components/financial/calculators/ui'
import PlanVsActualChart from './PlanVsActualChart'

const STRATEGY_LABEL: Record<StrategyKey, string> = { A: 'A: Balanced', B: 'B: Aggressive', C: 'C: Live now' }

const day = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const ymLabel = (ym: string) => /^\d{4}-\d{2}$/.test(ym)
  ? new Date(ym + '-15T12:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  : ym

const CHIP: Record<string, { bg: string; fg: string; text: string }> = {
  urgent: { bg: 'rgba(248,113,113,0.16)', fg: '#fca5a5', text: 'Due soon' },
  upcoming: { bg: 'rgba(255,255,255,0.08)', fg: 'var(--text-secondary)', text: 'Upcoming' },
  cleared: { bg: 'rgba(74,222,128,0.14)', fg: '#86efac', text: 'Cleared' },
  past: { bg: 'rgba(255,255,255,0.05)', fg: 'var(--text-muted)', text: 'Past' },
}

function Chip({ kind, text }: { kind: keyof typeof CHIP; text?: string }) {
  const c = CHIP[kind]
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: c.bg, color: c.fg }}>{text ?? c.text}</span>
}

export interface MasterPlanProps {
  plan: MasterPlan
  version: number | string
  asOf: string
  debts: LiveDebt[]
  today: string           // YYYY-MM-DD, America/Chicago
}

export default function MasterPlanClient({ plan, version, asOf, debts, today }: MasterPlanProps) {
  const base = (plan.base_case.strategy as StrategyKey) ?? 'A'
  const [strategy, setStrategy] = useState<StrategyKey>(base)
  const [showPast, setShowPast] = useState(false)

  const rec = useMemo(() => reconcile(plan, debts, strategy, today), [plan, debts, strategy, today])
  const deadlines = useMemo(() => deadlineStatus(plan, rec, today), [plan, rec, today])
  const milestones = useMemo(() => milestoneStatus(plan, rec, strategy, today), [plan, rec, strategy, today])
  const chart = useMemo(() => chartSeries(plan, rec.actualTotal, today), [plan, rec.actualTotal, today])

  const p = pace(rec.diff)
  const next = deadlines.find(d => d.status === 'urgent' || d.status === 'upcoming')
  const end = plan.projection[strategy]
  const shownDeadlines = deadlines.filter(d => showPast || d.status !== 'past')
  const stale = rec.rows.filter(r => r.stale)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Master Plan</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Plan v{version} (as of {day(asOf)}) against your live balances. Base case: {STRATEGY_LABEL[base]}
            {plan.base_case.k401 ? `, ${plan.base_case.k401} 401(k)` : ''}{plan.base_case.car ? `, ${plan.base_case.car}` : ''}.
          </p>
        </div>
        <div className="md:w-[380px]">
          <Segmented label="Spending strategy" value={strategy} onChange={setStrategy}
            options={(['A', 'B', 'C'] as StrategyKey[]).map(s => ({ value: s, label: STRATEGY_LABEL[s] + (s === base ? ' ★' : '') }))} />
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label="Non-mortgage debt now" tone="accent" value={usd(rec.actualTotal)} hint="live where linked; pay-in-full cards left out" />
        <Stat label={`Plan at ${day(rec.asOfPlan)}`} value={usd(rec.planTotal)} hint={`strategy ${strategy}`} />
        <Stat label="Against the plan" tone={p === 'ahead' ? 'good' : p === 'behind' ? 'bad' : 'default'}
          value={p === 'on_track' ? 'On track' : `${usd(Math.abs(rec.diff))} ${p}`}
          hint={p === 'on_track' ? `within $500 (${rec.diff >= 0 ? '+' : ''}${usd(rec.diff)})` : p === 'ahead' ? 'less owed than planned' : 'more owed than planned'} />
        <Stat label="Next deadline" value={next ? `${next.daysLeft} days` : '—'} tone={next?.status === 'urgent' ? 'bad' : 'default'}
          hint={next ? `${day(next.date)}: ${next.what}` : undefined} />
      </div>

      <Card title="Plan vs actual" subtitle={`Month-end non-mortgage debt for each strategy (${STRATEGY_LABEL[strategy]} highlighted). The violet dot is today's live total.`}>
        <PlanVsActualChart data={chart} strategy={strategy} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Debt, Dec 2027" value={usd(end.debt[12] ?? 0)} />
          <Stat label="Debt, Dec 2029" value={usd(end.debt.at(-1) ?? 0)} />
          <Stat label="Savings, Dec 2029" value={usd(end.savings.at(-1) ?? 0)} />
          <Stat label="Interest, Dec 26–Dec 29" value={usd(end.interest.reduce((s, x) => s + (x ?? 0), 0))} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card title="Deadlines" subtitle="Promo end dates turn red three weeks out while the card still has a balance.">
          <ul className="flex flex-col divide-y" style={{ borderColor: 'var(--glass-line)' }}>
            {shownDeadlines.map(d => (
              <li key={d.date + d.what} className="flex items-start justify-between gap-3 py-2.5" style={{ borderColor: 'var(--glass-line)' }}>
                <div className="min-w-0">
                  <div className="text-sm" style={{ color: d.status === 'past' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{d.what}</div>
                  <div className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {day(d.date)}{d.daysLeft >= 0 ? ` · ${d.daysLeft} days` : ''}
                    {d.amount ? ` · ${usd(d.amount)}` : ''}{d.inflow ? ` · +${usd(d.inflow)} in` : ''}
                    {d.liveBalance != null && d.status !== 'past' ? ` · ${usd(d.liveBalance)} on the card now` : ''}
                  </div>
                </div>
                <Chip kind={d.status === 'done' ? 'cleared' : d.status} />
              </li>
            ))}
          </ul>
          {deadlines.some(d => d.status === 'past') && (
            <button onClick={() => setShowPast(v => !v)} className="self-start text-xs h-11 px-1" style={{ color: 'var(--accent-cyan)' }}>
              {showPast ? 'Hide past deadlines' : 'Show past deadlines'}
            </button>
          )}
        </Card>

        <Card title="Milestones">
          <ul className="flex flex-col gap-2">
            {milestones.map(m => (
              <li key={m.key} className="flex items-start justify-between gap-3 p-3 rounded-2xl" style={{ background: 'rgba(7,11,26,0.45)' }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</div>
                  {m.note && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.note}</div>}
                </div>
                <div className="text-right shrink-0">
                  {m.done ? <Chip kind="cleared" text="Done" /> : (
                    <>
                      <div className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{ymLabel(m.target)}</div>
                      {m.monthsLeft != null && m.monthsLeft >= 0 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.monthsLeft} months</div>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Account by account" subtitle={`Plan balances as of ${day(rec.asOfPlan)} for strategy ${strategy}, against what each account shows now.`}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm tabular-nums min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                <th className="py-2 px-1 font-semibold">Account</th>
                <th className="py-2 px-1 font-semibold text-right">Plan</th>
                <th className="py-2 px-1 font-semibold text-right">Now</th>
                <th className="py-2 px-1 font-semibold text-right">Difference</th>
                <th className="py-2 px-1 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {rec.rows.filter(r => r.plan > 0 || r.actual > 0).map(r => (
                <tr key={r.key} style={{ borderTop: '1px solid var(--glass-line)' }}>
                  <td className="py-2 px-1" style={{ color: 'var(--text-primary)' }}>{r.label}</td>
                  <td className="py-2 px-1 text-right" style={{ color: 'var(--text-secondary)' }}>{usd(r.plan)}</td>
                  <td className="py-2 px-1 text-right" style={{ color: 'var(--text-primary)' }}>{usd(r.actual)}</td>
                  <td className="py-2 px-1 text-right" style={{ color: Math.abs(r.diff) < 1 ? 'var(--text-muted)' : r.diff < 0 ? '#4ade80' : '#f87171' }}>
                    {Math.abs(r.diff) < 1 ? '—' : (r.diff > 0 ? '+' : '') + usd(r.diff)}
                  </td>
                  <td className="py-2 px-1 text-xs" style={{ color: r.stale ? '#fca5a5' : 'var(--text-muted)' }}>
                    {r.source === 'none' ? 'no account' : r.source === 'live' ? `bank ${r.asOf ?? ''}` : `manual ${r.asOf ?? ''}${r.stale ? ' (stale)' : ''}`}
                  </td>
                </tr>
              ))}
              {rec.unplanned.map(d => (
                <tr key={d.name} style={{ borderTop: '1px solid var(--glass-line)' }}>
                  <td className="py-2 px-1" style={{ color: 'var(--text-primary)' }}>{d.name} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· not in the plan</span></td>
                  <td className="py-2 px-1 text-right" style={{ color: 'var(--text-muted)' }}>—</td>
                  <td className="py-2 px-1 text-right" style={{ color: 'var(--text-primary)' }}>{usd(d.balance)}</td>
                  <td className="py-2 px-1 text-right" style={{ color: '#f87171' }}>+{usd(d.balance)}</td>
                  <td className="py-2 px-1 text-xs" style={{ color: 'var(--text-muted)' }}>{d.source === 'live' ? `bank ${d.asOf ?? ''}` : 'manual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(rec.excluded.length > 0 || stale.length > 0) && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {rec.excluded.length > 0 && <>Left out as paid in full monthly: {rec.excluded.map(e => `${e.debt.name} (${usd(e.debt.balance)})`).join(', ')}. </>}
            {stale.length > 0 && <>Manual balances over two weeks old: {stale.map(s => s.label).join(', ')}.</>}
          </p>
        )}
      </Card>

      {plan.tradeoffs.length > 0 && (
        <Card title="The trade-offs" subtitle="From the workbook. Interest counts 2027–2029 plus what's left after 2029 at today's rates.">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm tabular-nums min-w-[620px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                  <th className="py-2 px-1 font-semibold">Path</th>
                  <th className="py-2 px-1 font-semibold text-right">2027 month</th>
                  <th className="py-2 px-1 font-semibold text-right">Savings Dec 29</th>
                  <th className="py-2 px-1 font-semibold text-right">Debt Dec 29</th>
                  <th className="py-2 px-1 font-semibold text-right">Debt-free</th>
                  <th className="py-2 px-1 font-semibold text-right">Interest</th>
                </tr>
              </thead>
              <tbody>
                {plan.tradeoffs.map(t => (
                  <tr key={t.path} style={{ borderTop: '1px solid var(--glass-line)', color: t.recommended ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    <td className="py-2 px-1">{t.path}{t.recommended && <span style={{ color: 'var(--accent-cyan)' }}> ★</span>}</td>
                    <td className="py-2 px-1 text-right" style={{ color: t.month_2027 < 0 ? '#f87171' : undefined }}>{usd(t.month_2027)}</td>
                    <td className="py-2 px-1 text-right">{usd(t.savings_2029)}</td>
                    <td className="py-2 px-1 text-right">{usd(t.debt_2029)}</td>
                    <td className="py-2 px-1 text-right">{ymLabel(t.debt_free)}</td>
                    <td className="py-2 px-1 text-right">{usd(t.interest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {plan.next_60_days.length > 0 && (
          <Card title="Next 60 days">
            <ul className="flex flex-col gap-2 text-sm list-disc pl-5" style={{ color: 'var(--text-secondary)' }}>
              {plan.next_60_days.map(x => <li key={x}>{x}</li>)}
            </ul>
          </Card>
        )}
        {plan.risks.length > 0 && (
          <Card title="What could knock it off course">
            <ul className="flex flex-col gap-2 text-sm list-disc pl-5" style={{ color: 'var(--text-secondary)' }}>
              {plan.risks.map(x => <li key={x}>{x}</li>)}
            </ul>
          </Card>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Plan numbers come from the Master Financial Model workbook; change the plan there and re-load it. Planning estimates only, not financial, tax or legal advice.
      </p>
    </div>
  )
}
