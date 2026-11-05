'use client'

import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { simulatePayoff, monthLabel, type PayoffDebt, type PayoffStrategy } from '@/lib/finance/calculators/payoff'
import { Card, NumberField, RangeField, Segmented, Stat, Toggle, usd } from './ui'
import type { CalculatorProps } from './types'

type Row = PayoffDebt & { on: boolean; note?: string }

/** Months from startYm to a target YYYY-MM (month m = monthLabel(startYm, m)). */
function monthIndex(startYm: string, ym: string): number {
  const [sy, sm] = startYm.split('-').map(Number)
  const [y, m] = ym.split('-').map(Number)
  return (y - sy) * 12 + (m - sm)
}

export default function DebtPayoffCalc({ debts, startYm, bonusNet, firstBonus }: CalculatorProps & { bonusNet: number; firstBonus: string }) {
  const [rows, setRows] = useState<Row[]>(() => debts.map(d => ({ ...d, on: !d.payInFull })))
  const [extra, setExtra] = useState(500)
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche')
  const [bonusOn, setBonusOn] = useState(true)
  const [bonus, setBonus] = useState(bonusNet)
  const [lumpAmt, setLumpAmt] = useState(0)
  const [lumpMonth, setLumpMonth] = useState(3)

  const active = rows.filter(r => r.on && r.balance > 0)
  const lumps = useMemo(() => {
    const out: { month: number; amount: number }[] = []
    if (bonusOn && bonus > 0) {
      // every March from the first bonus (the plan pays 100% each March)
      const first = monthIndex(startYm, firstBonus)
      for (let m = first; m <= 480; m += 12) if (m >= 1) out.push({ month: m, amount: bonus })
    }
    if (lumpAmt > 0) out.push({ month: Math.max(1, lumpMonth), amount: lumpAmt })
    return out
  }, [bonusOn, bonus, lumpAmt, lumpMonth, startYm, firstBonus])

  const base = useMemo(() => simulatePayoff({ debts: active, extraMonthly: 0, strategy }), [active, strategy])
  const plan = useMemo(() => simulatePayoff({ debts: active, extraMonthly: extra, strategy, lumps }), [active, extra, strategy, lumps])

  const chart = useMemo(() => {
    const len = Math.max(plan.series.length, Math.min(base.series.length, 120))
    return Array.from({ length: Math.min(len, 121) }, (_, i) => ({
      label: monthLabel(startYm, i), minimums: base.series[i]?.total ?? 0, plan: plan.series[i]?.total ?? 0,
    }))
  }, [plan, base, startYm])

  const update = (id: string, patch: Partial<Row>) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r))
  const total = active.reduce((s, r) => s + r.balance, 0)
  const interestSaved = base.months === null ? null : base.totalInterest - plan.totalInterest
  const monthsSaved = base.months !== null && plan.months !== null ? base.months - plan.months : null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
      <div className="flex flex-col gap-4">
        <Card title="Your debts" subtitle="Live balances where a bank is linked. Edit any number to try a what-if.">
          <ul className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {rows.map(r => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2" style={{ opacity: r.on ? 1 : 0.55 }}>
                <div className="flex items-center gap-1">
                  <Toggle checked={r.on} onChange={v => update(r.id, { on: v })} label={`Include ${r.name}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium leading-tight">{r.name}</div>
                    {r.note && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.note}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pl-0 md:pl-11">
                  <NumberField label="Balance" prefix="$" value={r.balance} onChange={n => update(r.id, { balance: n })} step={100} />
                  <NumberField label="APR" suffix="%" value={r.apr} onChange={n => update(r.id, { apr: n })} step={0.25} />
                  <NumberField label="Min / mo" prefix="$" value={r.minPayment} onChange={n => update(r.id, { minPayment: n })} step={10} />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            A 0% promo jumps to the card&apos;s normal APR when it ends. To model that, raise the APR here or add a lump sum before the end date.
            Cards paid in full each month are off by default.
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card title="Your plan">
          <RangeField label="Extra per month" value={extra} onChange={setExtra} min={0} max={5000} step={50} format={n => usd(n)} />
          <Segmented label="Strategy" value={strategy} onChange={setStrategy}
            options={[{ value: 'avalanche', label: 'Avalanche (highest APR)' }, { value: 'snowball', label: 'Snowball (smallest)' }]} />
          <div className="flex items-center gap-1 -ml-2.5">
            <Toggle checked={bonusOn} onChange={setBonusOn} label="Send each March bonus to debt" />
            <span className="text-sm">Send the Schwab bonus to debt every March</span>
          </div>
          {bonusOn && <NumberField label="Net bonus per year" prefix="$" value={bonus} onChange={setBonus} step={500} hint="Plan v5: about $37,000 after tax, first paid Mar 2028" />}
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="One-time lump sum" prefix="$" value={lumpAmt} onChange={setLumpAmt} step={500} />
            <NumberField label="In month #" value={lumpMonth} onChange={setLumpMonth} min={1} max={120} hint={monthLabel(startYm, lumpMonth)} />
          </div>
        </Card>

        <Card title="Result">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Debt-free" tone="accent" value={plan.months === null ? 'Not within 40 yrs' : monthLabel(startYm, plan.months)}
              hint={plan.months === null ? 'Raise the extra payment' : `${Math.floor(plan.months / 12)} yr ${plan.months % 12} mo`} />
            <Stat label="Total interest" value={usd(plan.totalInterest)} hint={`on ${usd(total)} today`} />
            <Stat label="Interest saved" tone="good" value={interestSaved === null ? '—' : usd(Math.max(0, interestSaved))} hint="vs. minimums only" />
            <Stat label="Months saved" tone="good" value={monthsSaved === null ? '—' : String(Math.max(0, monthsSaved))} hint="vs. minimums only" />
          </div>
          <div className="h-52 -mx-1" aria-label="Total debt over time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(242,245,255,0.62)', fontSize: 11 }} interval={Math.max(0, Math.floor(chart.length / 5))} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(242,245,255,0.62)', fontSize: 11 }} tickFormatter={v => `$${Math.round(v / 1000)}k`} width={44} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => usd(Number(v ?? 0))} contentStyle={{ background: '#0d1330', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12 }} />
                <Area type="monotone" dataKey="minimums" name="Minimums only" stroke="#a78bfa" fill="rgba(167,139,250,0.12)" strokeWidth={2} />
                <Area type="monotone" dataKey="plan" name="Your plan" stroke="#5ee6ff" fill="rgba(94,230,255,0.18)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {plan.order.length > 0 && (
            <ol className="flex flex-col gap-1.5 text-sm">
              {plan.order.map((id, i) => {
                const d = rows.find(r => r.id === id)!
                return (
                  <li key={id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0"><span style={{ color: 'var(--text-muted)' }}>{i + 1}. </span>{d.name}</span>
                    <span className="tabular-nums flex-none" style={{ color: 'var(--text-secondary)' }}>{monthLabel(startYm, plan.payoffMonth[id] ?? 1)}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  )
}
