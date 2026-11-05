'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCashFlowStore } from '@/stores/finance/cashflow-store'
import { usePaycheckStore } from '@/stores/finance/paycheck-store'
import { generatePaydays, projectCashFlowPlan, type PlanLine, type CashFlowPlan } from '@/lib/finance/cashflowPlan'
import type { CashEvent } from '@/lib/finance/cashEvents'
import { SS_RATE, SS_WAGE_BASE_2026 } from '@/lib/tax/brackets'
import CurrencyInput from '@/components/financial/shared/CurrencyInput'
import WaterfallChart, { type WaterfallItem } from '@/components/financial/shared/WaterfallChart'
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { AllocationBucket } from '@/types/finance'

export interface CashFlowLive {
  todayIso: string
  startingCash: number
  debtLines: PlanLine[]
  livingLines: PlanLine[]
  events: CashEvent[]
  spendWindow: { start: string; end: string; txns: number } | null
  job: {
    employer: string
    firstPayday: string
    payFrequency: number
    netPerCheckEarly: number
    grossPerCheck: number
    ssPerCheck: number
  } | null
}

const usd = (v: number) => (v < 0 ? '−' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US')
const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const sum = (lines: PlanLine[]) => lines.reduce((s, l) => s + (l.amount || 0), 0)

type Tab = 'projection' | 'waterfall' | 'allocation'

export default function CashFlowModel({ live }: { live: CashFlowLive }) {
  const [startingCash, setStartingCash] = useState(live.startingCash)
  const [debtLines, setDebtLines] = useState(live.debtLines)
  const [livingLines, setLivingLines] = useState(live.livingLines)
  const [eventsOn, setEventsOn] = useState(true)
  const [tab, setTab] = useState<Tab>('projection')
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState(0)

  // Paycheck: the Paycheck simulator's inputs once loaded (they default to the
  // accepted offer), otherwise the offer itself.
  const pcResult = usePaycheckStore(s => s.result)
  const pcFreq = usePaycheckStore(s => s.inputs.payFrequency)
  const pcHydrated = usePaycheckStore(s => s.hydrated)
  const pay = useMemo(() => {
    if (!live.job) return null
    if (pcHydrated && pcResult) {
      const ssFull = pcResult.grossPay * SS_RATE
      return {
        source: 'Paycheck simulator',
        payFrequency: pcFreq,
        netPerCheck: pcResult.netPay - Math.max(0, ssFull - pcResult.socialSecurity),
        grossPerCheck: pcResult.grossPay,
        ssPerCheck: ssFull,
      }
    }
    return { source: 'accepted offer', payFrequency: live.job.payFrequency, netPerCheck: live.job.netPerCheckEarly,
      grossPerCheck: live.job.grossPerCheck, ssPerCheck: live.job.ssPerCheck }
  }, [live.job, pcHydrated, pcResult, pcFreq])

  const debtTotal = sum(debtLines)
  const livingTotal = sum(livingLines)
  const monthlyIncome = pay ? (pay.netPerCheck * pay.payFrequency) / 12 : 0
  const freeCash = monthlyIncome - debtTotal - livingTotal

  const plan: CashFlowPlan = useMemo(() => {
    const until = `${Number(live.todayIso.slice(0, 4)) + 2}-12-31`
    return projectCashFlowPlan({
      todayIso: live.todayIso,
      startingCash,
      paydays: live.job && pay ? generatePaydays(live.job.firstPayday, pay.payFrequency, until) : [],
      netPerCheck: pay?.netPerCheck ?? 0,
      grossPerCheck: pay?.grossPerCheck ?? 0,
      ssPerCheck: pay?.ssPerCheck ?? 0,
      ssWageBase: SS_WAGE_BASE_2026,
      monthlyDebtPayments: debtTotal,
      monthlyLiving: livingTotal,
      events: eventsOn ? live.events : [],
      months: 12,
    })
  }, [live, pay, startingCash, debtTotal, livingTotal, eventsOn])

  // Share totals with the Scenarios page
  const setPlanTotals = useCashFlowStore(s => s.setPlanTotals)
  useEffect(() => { setPlanTotals({ monthlyDebtPayments: debtTotal, totalLivingExpenses: livingTotal }) }, [debtTotal, livingTotal, setPlanTotals])

  const edited = startingCash !== live.startingCash
    || JSON.stringify(debtLines) !== JSON.stringify(live.debtLines)
    || JSON.stringify(livingLines) !== JSON.stringify(live.livingLines)

  function resetToLive() {
    setStartingCash(live.startingCash)
    setDebtLines(live.debtLines)
    setLivingLines(live.livingLines)
  }
  function addLine() {
    if (!newLabel.trim() || newAmount <= 0) return
    setLivingLines(ls => [...ls, { id: `custom:${Date.now()}`, label: newLabel.trim(), amount: newAmount }])
    setNewLabel(''); setNewAmount(0)
  }

  const waterfall: WaterfallItem[] = [
    { label: 'Take-home', value: monthlyIncome, type: 'income' },
    { label: 'Debt payments', value: -debtTotal, type: 'obligation' },
    ...livingLines.filter(l => l.amount > 0).slice(0, 8).map(l => ({ label: l.label, value: -l.amount, type: 'expense' as const })),
    ...(livingLines.length > 8 ? [{ label: 'Other', value: -sum(livingLines.slice(8)), type: 'expense' as const }] : []),
    { label: 'Free cash', value: freeCash, type: 'net' },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-5 p-4 md:p-6">
      {/* ── Inputs ── */}
      <aside className="order-2 lg:order-1 lg:w-80 shrink-0 flex flex-col gap-4">
        <section className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Starting point</h2>
            {edited && (
              <button onClick={resetToLive} className="text-[11px] px-2 py-1 rounded-md"
                style={{ color: 'var(--accent-cyan)', border: '1px solid var(--glass-line)' }}>
                Reset to live
              </button>
            )}
          </div>
          <CurrencyInput label="Cash today (checking + savings)" value={startingCash} onChange={setStartingCash} step={500} />
          <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            Live from the last bank sync ({usd(live.startingCash)}). Adjust it if money moved since.
          </p>
          <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {live.job && pay ? (
              <>Income: <b style={{ color: 'var(--text-primary)' }}>{usd(pay.netPerCheck)}</b> per check ×{' '}
                {pay.payFrequency}/yr from {live.job.employer}, first check {fmtDate(live.job.firstPayday)}{' '}
                <span style={{ color: 'var(--text-muted)' }}>(from the {pay.source})</span></>
            ) : 'No accepted job offer — income is $0.'}
          </div>
        </section>

        <LineGroup title="Debt payments / mo" note="Minimums from the debt list; cards paid in full are in living costs."
          lines={debtLines} onChange={setDebtLines} />

        <LineGroup
          title="Living costs / mo"
          note={live.spendWindow
            ? `Average of ${live.spendWindow.txns} transactions, ${fmtDate(live.spendWindow.start)}–${fmtDate(live.spendWindow.end)}. Debt payments excluded.`
            : 'No transactions imported yet.'}
          lines={livingLines} onChange={setLivingLines} removable
        />

        <section className="glass-card p-4 flex flex-col gap-2">
          <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Add a monthly cost</div>
          <input type="text" placeholder="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-line)', color: 'var(--text-primary)', outline: 'none' }} />
          <CurrencyInput value={newAmount} onChange={setNewAmount} step={50} />
          <button onClick={addLine} className="text-xs py-2 rounded-lg"
            style={{ background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid var(--glass-line)', color: 'var(--accent-cyan)' }}>
            + Add
          </button>
        </section>
      </aside>

      {/* ── Output ── */}
      <main className="order-1 lg:order-2 flex-1 min-w-0 flex flex-col gap-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Take-home / mo" value={usd(monthlyIncome)} hint="steady state, before the SS cap" />
          <Kpi label="Debt + living / mo" value={usd(debtTotal + livingTotal)} hint={`${usd(debtTotal)} debt · ${usd(livingTotal)} living`} />
          <Kpi label="Free cash / mo" value={usd(freeCash)} tone={freeCash >= 0 ? 'good' : 'bad'} hint="once paychecks are steady" />
          <Kpi label="Cash low point" value={usd(plan.lowPoint.cash)} tone={plan.lowPoint.cash >= 0 ? 'accent' : 'bad'}
            hint={`${fmtDate(plan.lowPoint.date)} · ${usd(plan.endCash)} in 12 mo`} />
        </div>

        {plan.lowPoint.cash < 0 && (
          <div className="text-xs p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
            Cash goes negative around {fmtDate(plan.lowPoint.date)} ({usd(plan.lowPoint.cash)}). Something on the left has to give,
            or a payment needs to move to the HELOC or a 0% card.
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto">
          {([['projection', '12-month cash'], ['waterfall', 'Monthly flow'], ['allocation', 'Free-cash split']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{ background: tab === t ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', color: tab === t ? '#050505' : 'var(--text-secondary)' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'projection' && (
          <Projection plan={plan} eventsOn={eventsOn} onToggleEvents={() => setEventsOn(v => !v)} eventCount={live.events.length} />
        )}
        {tab === 'waterfall' && (
          <div className="glass-card p-4"><WaterfallChart items={waterfall} height={300} /></div>
        )}
        {tab === 'allocation' && <Allocation freeCash={freeCash} />}
      </main>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function LineGroup({ title, note, lines, onChange, removable }: {
  title: string; note: string; lines: PlanLine[]; onChange: (l: PlanLine[]) => void; removable?: boolean
}) {
  return (
    <section className="glass-card p-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{usd(sum(lines))}</span>
      </div>
      <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{note}</p>
      {lines.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>None.</p>}
      {lines.map(l => (
        <div key={l.id} className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <CurrencyInput label={l.label} value={l.amount} step={50} max={50_000}
              onChange={v => onChange(lines.map(x => (x.id === l.id ? { ...x, amount: v } : x)))} />
          </div>
          {removable && (
            <button onClick={() => onChange(lines.filter(x => x.id !== l.id))} aria-label={`Remove ${l.label}`}
              className="text-xs px-2 py-1.5 rounded mb-0.5"
              style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              ×
            </button>
          )}
        </div>
      ))}
    </section>
  )
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' | 'accent' }) {
  const color = tone === 'bad' ? '#f87171' : tone === 'good' ? '#4ade80' : tone === 'accent' ? 'var(--accent-cyan)' : 'var(--text-primary)'
  return (
    <div className="glass-card p-3 flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-lg font-bold font-mono truncate" style={{ color }}>{value}</span>
      {hint && <span className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  )
}

function Projection({ plan, eventsOn, onToggleEvents, eventCount }: {
  plan: CashFlowPlan; eventsOn: boolean; onToggleEvents: () => void; eventCount: number
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Cash at month end · net for the month
          </h3>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={eventsOn} onChange={onToggleEvents} />
            Include {eventCount} planned payments
          </label>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={plan.months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => '$' + Math.round(Number(v) / 1000) + 'K'} tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false} tickLine={false} width={44} />
            <Tooltip formatter={(v, name) => [usd(Number(v ?? 0)), name === 'endCash' ? 'Cash at month end' : 'Net for month']}
              contentStyle={{ background: 'rgba(13,19,48,0.95)', border: '1px solid var(--glass-line)', borderRadius: 8, fontSize: 12 }} />
            <ReferenceLine y={0} stroke="rgba(248,113,113,0.6)" />
            <Bar dataKey="net" fill="#a78bfa" fillOpacity={0.55} radius={[3, 3, 0, 0]} />
            <Area type="monotone" dataKey="endCash" stroke="#5ee6ff" fill="#5ee6ff" fillOpacity={0.12} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr>
              {['Month', 'Checks', 'Income', 'Debt', 'Living', 'One-time', 'Net', 'Cash'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.months.map(m => (
              <tr key={m.key} style={{ borderTop: '1px solid var(--glass-line)' }}>
                <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                  {m.label}{m.partial && <span style={{ color: 'var(--text-muted)' }}> (rest)</span>}
                </td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{m.checks}</td>
                <td className="px-3 py-2 font-mono" style={{ color: '#4ade80' }}>{usd(m.income)}</td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{usd(-m.debt)}</td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{usd(-m.living)}</td>
                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                  {m.oneTime !== 0 && <div className="font-mono">{usd(m.oneTime)}</div>}
                  {m.eventLabels.map(l => (
                    <div key={l} className="text-[10px] leading-snug" style={{ color: '#fbbf24' }}>{l}</div>
                  ))}
                </td>
                <td className="px-3 py-2 font-mono" style={{ color: m.net >= 0 ? 'var(--text-primary)' : '#f87171' }}>{usd(m.net)}</td>
                <td className="px-3 py-2 font-mono font-semibold" style={{ color: m.endCash >= 0 ? 'var(--accent-cyan)' : '#f87171' }}>{usd(m.endCash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Allocation({ freeCash }: { freeCash: number }) {
  const allocations = useCashFlowStore(s => s.allocations)
  const update = useCashFlowStore(s => s.updateAllocation)
  const total = allocations.reduce((s, a) => s + a.percent, 0)
  const COLORS = ['#5ee6ff', '#a78bfa', '#4ade80', '#fbbf24']
  if (freeCash <= 0) {
    return <div className="glass-card p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No free cash to split yet — costs exceed take-home.</div>
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...allocations].sort((a: AllocationBucket, b: AllocationBucket) => a.sortOrder - b.sortOrder).map((b, i) => (
          <div key={b.id} className="glass-card p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{b.label}</div>
            <div className="text-xl font-bold font-mono" style={{ color: COLORS[i % COLORS.length] }}>{usd(freeCash * b.percent / 100)}</div>
            <input type="range" min={0} max={100} value={b.percent} onChange={e => update(b.id, Number(e.target.value))}
              className="w-full mt-2" aria-label={`${b.label} percent`} />
            <div className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>{b.percent}%</div>
          </div>
        ))}
      </div>
      {total !== 100 && (
        <div className="text-xs p-2 rounded text-center" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}>
          Splits total {total}% — adjust to 100%
        </div>
      )}
    </div>
  )
}
