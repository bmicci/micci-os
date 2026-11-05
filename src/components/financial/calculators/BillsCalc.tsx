'use client'

import { useMemo, useState } from 'react'
import { simulatePayoff, monthLabel } from '@/lib/finance/calculators/payoff'
import { subscriptionSaving } from '@/lib/finance/calculators/savings'
import { Card, NumberField, RangeField, Stat, Toggle, usd } from './ui'
import type { CalculatorProps } from './types'

export default function BillsCalc({ plan, debts, startYm }: CalculatorProps) {
  const [subs, setSubs] = useState(() => plan.subscriptions.map((s, i) => ({
    id: `s${i}`, name: s.name, monthly: s.monthly, note: s.note, action: s.action,
    on: s.action === 'cancel' || s.action === 'switch' || s.action === 'canceled',
    savings: subscriptionSaving(s.monthly, s.action, s.replacement),
  })))
  const [bills, setBills] = useState(() => plan.bills.map((b, i) => ({
    id: `b${i}`, name: b.name, monthly: b.monthly, lever: b.lever, low: b.save_low, high: b.save_high,
    on: false, savings: Math.round((b.save_low + b.save_high) / 2),
  })))
  const [toDebt, setToDebt] = useState(true)
  const [custom, setCustom] = useState(0)

  const subSavings = subs.reduce((s, x) => s + (x.on ? x.savings : 0), 0)
  const billSavings = bills.reduce((s, x) => s + (x.on ? x.savings : 0), 0)
  const monthly = subSavings + billSavings + custom

  const payDebts = useMemo(() => debts.filter(d => !d.payInFull && d.balance > 0), [debts])
  const without = useMemo(() => simulatePayoff({ debts: payDebts, extraMonthly: 0, strategy: 'avalanche' }), [payDebts])
  const withIt = useMemo(() => simulatePayoff({ debts: payDebts, extraMonthly: toDebt ? monthly : 0, strategy: 'avalanche' }), [payDebts, toDebt, monthly])
  const monthsSaved = without.months !== null && withIt.months !== null ? without.months - withIt.months : null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-start">
      <div className="flex flex-col gap-4">
        <Card title="Subscriptions" subtitle="Switch a row on to count it as cancelled (or switched). Defaults follow plan v5.">
          <ul className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {subs.map(s => (
              <li key={s.id} className="py-1.5 first:pt-0 last:pb-0 flex items-center gap-1">
                <Toggle checked={s.on} onChange={v => setSubs(xs => xs.map(x => x.id === s.id ? { ...x, on: v } : x))} label={`Cancel ${s.name}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-tight" style={{ textDecoration: s.action === 'canceled' ? 'line-through' : 'none' }}>{s.name}</div>
                  {s.note && <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.note}</div>}
                </div>
                <span className="flex-none text-sm tabular-nums text-right w-16" style={{ color: s.on ? '#4ade80' : 'var(--text-secondary)' }}>
                  {s.on ? `-${usd(s.savings, true)}` : usd(s.monthly, true)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card title="Bills to negotiate" subtitle="Slide to the saving you think you can win. Ranges are the plan's estimates.">
          <ul className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {bills.map(b => (
              <li key={b.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Toggle checked={b.on} onChange={v => setBills(xs => xs.map(x => x.id === b.id ? { ...x, on: v } : x))} label={`Count savings on ${b.name}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] leading-tight">{b.name} <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{usd(b.monthly)}/mo</span></div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.lever}</div>
                  </div>
                </div>
                {b.on && b.high > b.low && (
                  <div className="pl-0 md:pl-11">
                    <RangeField label="Saving per month" value={b.savings} onChange={n => setBills(xs => xs.map(x => x.id === b.id ? { ...x, savings: n } : x))}
                      min={b.low} max={b.high} step={5} format={n => usd(n)} />
                  </div>
                )}
                {b.on && b.high === b.low && <div className="pl-0 md:pl-11 text-sm" style={{ color: '#4ade80' }}>Saves {usd(b.savings)}/mo</div>}
              </li>
            ))}
          </ul>
          <NumberField label="Or add your own monthly saving" prefix="$" value={custom} onChange={setCustom} step={10} />
        </Card>

        <Card title="What it adds up to">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Saved per month" tone="good" value={usd(monthly)} hint={`${usd(subSavings)} subscriptions + ${usd(billSavings + custom)} bills`} />
            <Stat label="Saved per year" tone="good" value={usd(monthly * 12)} />
          </div>
          <div className="flex items-center gap-1 -ml-2.5">
            <Toggle checked={toDebt} onChange={setToDebt} label="Send the savings to debt" />
            <span className="text-sm">Send the savings to debt (avalanche)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Debt-free" tone="accent" value={withIt.months === null ? '—' : monthLabel(startYm, withIt.months)}
              hint={without.months === null ? undefined : `was ${monthLabel(startYm, without.months)}`} />
            <Stat label="Months saved" tone="good" value={monthsSaved === null ? '—' : String(Math.max(0, monthsSaved))}
              hint={`${usd(Math.max(0, without.totalInterest - withIt.totalInterest))} less interest`} />
          </div>
        </Card>
      </div>
    </div>
  )
}
