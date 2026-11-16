'use client'

import { useMemo, useState } from 'react'
import {
  cardTracker, chartSeries, deadlineStatus, headline, ledgerView, milestoneStatus, monthTable, nextCardToClear, pace, reconcile,
  type LedgerCase, type LiveCash, type LiveDebt, type MasterPlan, type StrategyKey,
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
  on_track: { bg: 'rgba(255,255,255,0.08)', fg: 'var(--text-secondary)', text: 'On plan' },
  behind: { bg: 'rgba(251,191,36,0.16)', fg: '#fcd34d', text: 'Above plan' },
  overdue: { bg: 'rgba(248,113,113,0.16)', fg: '#fca5a5', text: 'Past its plan date' },
}

const TH = 'py-2 px-1 font-semibold'
const HEAD = 'text-left text-[11px] uppercase tracking-[0.08em]'
const shortDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const signed = (n: number, cents = false) => (n > 0 ? '+' : '') + usd(n, cents)

function Chip({ kind, text }: { kind: keyof typeof CHIP; text?: string }) {
  const c = CHIP[kind]
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: c.bg, color: c.fg }}>{text ?? c.text}</span>
}

export interface MasterPlanProps {
  plan: MasterPlan
  version: number | string
  asOf: string
  debts: LiveDebt[]
  /** Live checking (bank-synced) and savings (manual entry). */
  cash: LiveCash
  today: string           // YYYY-MM-DD, America/Chicago
}

export default function MasterPlanClient({ plan, version, asOf, debts, cash, today }: MasterPlanProps) {
  const base = (plan.base_case.strategy as StrategyKey) ?? 'A'
  const [strategy, setStrategy] = useState<StrategyKey>(base)
  const [showPast, setShowPast] = useState(false)
  const [ledgerCase, setLedgerCase] = useState<LedgerCase>('a')
  const [showPastLedger, setShowPastLedger] = useState(false)
  const [allMonths, setAllMonths] = useState(false)

  const rec = useMemo(() => reconcile(plan, debts, strategy, today), [plan, debts, strategy, today])
  const deadlines = useMemo(() => deadlineStatus(plan, rec, today), [plan, rec, today])
  const milestones = useMemo(() => milestoneStatus(plan, rec, strategy, today, cash), [plan, rec, strategy, today, cash])
  const cards = useMemo(() => cardTracker(plan, rec, strategy, today), [plan, rec, strategy, today])
  const head = useMemo(() => headline(plan, rec, strategy, cash), [plan, rec, strategy, cash])
  const ledger = useMemo(() => plan.cash_ledger ? ledgerView(plan.cash_ledger, ledgerCase, today, cash.checking) : null, [plan, ledgerCase, today, cash.checking])
  const months = useMemo(() => monthTable(plan, strategy, today), [plan, strategy, today])
  const chart = useMemo(() => chartSeries(plan, rec.actualTotal, today), [plan, rec.actualTotal, today])

  const p = pace(rec.diff)
  const next = deadlines.find(d => d.status === 'urgent' || d.status === 'upcoming')
  const end = plan.projection[strategy]
  const shownDeadlines = deadlines.filter(d => showPast || d.status !== 'past')
  const stale = rec.rows.filter(r => r.stale)
  const nextCard = nextCardToClear(cards)
  const hasFlows = months.some(m => m.inflows != null)
  const upcomingMonths = months.filter(m => !m.past)
  const shownMonths = allMonths ? months : upcomingMonths.slice(0, 14)
  const aheadLedger = ledger ? ledger.lines.filter(l => !l.past) : []
  const shownLedger = ledger ? (showPastLedger ? ledger.lines : aheadLedger.slice(0, 12)) : []

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Master Plan</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Plan v{version} (as of {day(asOf)}) against your live balances. Base case: {STRATEGY_LABEL[base]}
            {plan.base_case.k401 ? `, 401(k) ${plan.base_case.k401}` : ''}{plan.base_case.car ? `, ${plan.base_case.car}` : ''}.
          </p>
        </div>
        <div className="md:w-[380px]">
          <Segmented label="Spending strategy" value={strategy} onChange={setStrategy}
            options={(['A', 'B', 'C'] as StrategyKey[]).map(s => ({ value: s, label: STRATEGY_LABEL[s] + (s === base ? ' ★' : '') }))} />
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label="Non-mortgage debt now" tone="accent" value={usd(rec.actualTotal)} hint={`plan ${usd(rec.planTotal)} at ${day(rec.asOfPlan)}`} />
        <Stat label="Against the plan" tone={p === 'ahead' ? 'good' : p === 'behind' ? 'bad' : 'default'}
          value={p === 'on_track' ? 'On track' : `${usd(Math.abs(rec.diff))} ${p}`}
          hint={p === 'on_track' ? `within $500 (${signed(rec.diff)})` : p === 'ahead' ? 'less owed than planned' : 'more owed than planned'} />
        <Stat label="Next card to clear" value={nextCard ? (nextCard.planCleared ? ymLabel(nextCard.planCleared) : 'Not in plan') : 'All clear'}
          tone={nextCard?.status === 'overdue' ? 'bad' : 'default'}
          hint={nextCard ? `${nextCard.label}: ${usd(nextCard.actual)} now` : 'every promo card is at $0'} />
        <Stat label="Next deadline" value={next ? `${next.daysLeft} days` : '—'} tone={next?.status === 'urgent' ? 'bad' : 'default'}
          hint={next ? `${day(next.date)}: ${next.what}` : undefined} />
        <Stat label="Spare cash, normal 2027 month" value={head.spareMonth != null ? usd(head.spareMonth) : '—'}
          tone={head.spareMonth != null && head.spareMonth < 0 ? 'bad' : 'default'} hint={`planned for strategy ${strategy}, after every bill`} />
        <Stat label="Savings" value={head.savingsNow != null ? usd(head.savingsNow) : '—'}
          hint={head.savingsTarget != null ? `target ${usd(head.savingsTarget)}; manual entry` : 'manual entry'} />
        <Stat label="Checking vs the ledger" value={ledger?.diff != null && !ledger.finished ? (Math.abs(ledger.diff) < 1 ? 'On the ledger' : signed(ledger.diff)) : cash.checking != null ? usd(cash.checking) : '—'}
          tone={ledger?.diff != null && !ledger.finished ? (ledger.diff < -250 ? 'bad' : ledger.diff > 250 ? 'good' : 'default') : 'default'}
          hint={ledger && !ledger.finished && cash.checking != null ? `${usd(cash.checking)} now; ledger says ${usd(ledger.planToday)}` : 'checking now'} />
        <Stat label="HELOC paid off" value={head.helocPaidOff ? ymLabel(head.helocPaidOff) : 'After 2029'}
          hint={[head.helocBalance != null ? `${usd(head.helocBalance)} now` : null, head.helocRoom != null ? `${usd(head.helocRoom)} of room` : null].filter(Boolean).join('; ') || undefined} />
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

      {ledger && plan.cash_ledger && (
        <Card title="Cash ledger" subtitle={`${plan.cash_ledger.account ?? 'Checking'}, day by day through ${day(plan.cash_ledger.end?.date ?? plan.cash_ledger.rows.at(-1)?.date ?? today)}. Amounts are the plan's estimates.`}>
          <div className="md:w-[460px]">
            <Segmented label="Ledger case" value={ledgerCase} onChange={setLedgerCase}
              options={(['a', 'b'] as LedgerCase[]).map(c => ({ value: c, label: plan.cash_ledger!.cases[c] }))} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Checking now" value={cash.checking != null ? usd(cash.checking, true) : '—'} hint="from the bank" />
            <Stat label="Ledger balance today" value={usd(ledger.planToday, true)}
              hint={ledger.diff == null ? undefined : Math.abs(ledger.diff) < 1 ? 'matches your checking' : `you are ${usd(Math.abs(ledger.diff))} ${ledger.diff > 0 ? 'above' : 'below'} it`} />
            <Stat label="Lowest point ahead" value={ledger.low ? usd(ledger.low.balance, true) : '—'} tone={ledger.low && ledger.low.balance < 500 ? 'bad' : 'default'}
              hint={ledger.low ? day(ledger.low.date) : 'ledger finished'} />
            <Stat label="Next line" value={ledger.next?.amount != null ? signed(ledger.next.amount, true) : '—'}
              hint={ledger.next ? `${shortDay(ledger.next.date)}: ${ledger.next.item}` : undefined} />
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm tabular-nums min-w-[520px]">
              <thead>
                <tr className={HEAD} style={{ color: 'var(--text-muted)' }}>
                  <th className={TH}>Date</th>
                  <th className={TH}>Item</th>
                  <th className={`${TH} text-right`}>In / out</th>
                  <th className={`${TH} text-right`}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {shownLedger.map((l, i) => (
                  <tr key={l.date + l.item + i} style={{ borderTop: '1px solid var(--glass-line)', color: l.past ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                    <td className="py-2 px-1 whitespace-nowrap">{shortDay(l.date)}</td>
                    <td className="py-2 px-1" style={{ color: l.past ? undefined : 'var(--text-primary)' }}>{l.item}</td>
                    <td className="py-2 px-1 text-right" style={{ color: !l.past && (l.amount ?? 0) > 0 ? '#4ade80' : undefined }}>{signed(l.amount ?? 0, true)}</td>
                    <td className="py-2 px-1 text-right" style={{ color: !l.past && l.balance < 500 ? '#f87171' : undefined }}>{usd(l.balance, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledger.lines.length > shownLedger.length || showPastLedger ? (
            <button onClick={() => setShowPastLedger(v => !v)} className="self-start text-xs h-11 px-1" style={{ color: 'var(--accent-cyan)' }}>
              {showPastLedger ? 'Show the next 12 lines' : `Show the whole ledger (${ledger.lines.length} lines)`}
            </button>
          ) : null}
          {(plan.cash_ledger.notes?.length ?? 0) > 0 && (
            <ul className="flex flex-col gap-1 text-xs list-disc pl-5" style={{ color: 'var(--text-muted)' }}>
              {plan.cash_ledger.notes!.map(n => <li key={n}>{n}</li>)}
            </ul>
          )}
        </Card>
      )}

      {cards.length > 0 && (
        <Card title="Card payoff tracker" subtitle={`When each 0% promo ends, when strategy ${strategy} has the card at $0, and what it shows now.`}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm tabular-nums min-w-[640px]">
              <thead>
                <tr className={HEAD} style={{ color: 'var(--text-muted)' }}>
                  <th className={TH}>Card</th>
                  <th className={TH}>0% ends</th>
                  <th className={TH}>Plan clears</th>
                  <th className={`${TH} text-right`}>Plan now</th>
                  <th className={`${TH} text-right`}>Now</th>
                  <th className={`${TH} text-right`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(c => (
                  <tr key={c.key} style={{ borderTop: '1px solid var(--glass-line)' }}>
                    <td className="py-2 px-1" style={{ color: 'var(--text-primary)' }}>
                      {c.label}
                      {c.deferredInterest > 0 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{usd(c.deferredInterest)} deferred interest if missed</div>}
                    </td>
                    <td className="py-2 px-1 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {day(c.promoEnds)}
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {c.daysLeft >= 0 ? `${c.daysLeft} days` : 'ended'}{c.rateAfter ? `, then ${(c.rateAfter * 100).toFixed(2)}%` : ''}
                      </div>
                    </td>
                    <td className="py-2 px-1 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {c.planCleared ? ymLabel(c.planCleared) : 'After 2029'}
                      {c.planClearsLate && c.status !== 'cleared' && <div className="text-xs" style={{ color: '#fcd34d' }}>after the promo ends</div>}
                    </td>
                    <td className="py-2 px-1 text-right" style={{ color: 'var(--text-secondary)' }}>{usd(c.planNow)}</td>
                    <td className="py-2 px-1 text-right" style={{ color: 'var(--text-primary)' }}>{usd(c.actual)}</td>
                    <td className="py-2 px-1 text-right"><Chip kind={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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

      <Card title="Month by month" subtitle={`Strategy ${strategy}, month-end balances from the workbook.`}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm tabular-nums min-w-[720px]">
            <thead>
              <tr className={HEAD} style={{ color: 'var(--text-muted)' }}>
                <th className={TH}>Month</th>
                {hasFlows && <th className={`${TH} text-right`}>In</th>}
                {hasFlows && <th className={`${TH} text-right`}>Out</th>}
                {hasFlows && <th className={`${TH} text-right`}>Extra to debt</th>}
                <th className={`${TH} text-right`}>Paid down</th>
                <th className={`${TH} text-right`}>Cards</th>
                <th className={`${TH} text-right`}>Total debt</th>
                <th className={`${TH} text-right`}>Savings</th>
                {hasFlows && <th className={`${TH} text-right`}>Checking</th>}
              </tr>
            </thead>
            <tbody>
              {shownMonths.map(m => (
                <tr key={m.month} style={{ borderTop: '1px solid var(--glass-line)', color: m.past ? 'var(--text-muted)' : 'var(--text-secondary)',
                  background: m.current ? 'rgba(255,255,255,0.05)' : undefined }}>
                  <td className="py-2 px-1 whitespace-nowrap" style={{ color: m.past ? undefined : 'var(--text-primary)' }}>{ymLabel(m.month)}{m.current ? ' (now)' : ''}</td>
                  {hasFlows && <td className="py-2 px-1 text-right">{m.inflows != null ? usd(m.inflows) : '—'}</td>}
                  {hasFlows && <td className="py-2 px-1 text-right">{m.outflows != null ? usd(m.outflows) : '—'}</td>}
                  {hasFlows && <td className="py-2 px-1 text-right">{m.extra != null ? usd(m.extra) : '—'}</td>}
                  <td className="py-2 px-1 text-right">{usd(m.paidDown)}</td>
                  <td className="py-2 px-1 text-right">{usd(m.cards)}</td>
                  <td className="py-2 px-1 text-right" style={{ color: m.past ? undefined : 'var(--text-primary)' }}>{usd(m.debt)}</td>
                  <td className="py-2 px-1 text-right">{usd(m.savings)}</td>
                  {hasFlows && <td className="py-2 px-1 text-right">{m.checking != null ? usd(m.checking) : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {months.length > shownMonths.length || allMonths ? (
          <button onClick={() => setAllMonths(v => !v)} className="self-start text-xs h-11 px-1" style={{ color: 'var(--accent-cyan)' }}>
            {allMonths ? 'Show the next 14 months' : `Show all ${months.length} months`}
          </button>
        ) : null}
      </Card>

      {plan.tradeoffs.length > 0 && (
        <Card title="The trade-offs" subtitle="From the plan. Interest runs from now until each path is debt-free.">
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
