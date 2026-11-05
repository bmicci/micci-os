'use client'

import { useMemo, useState } from 'react'
import { k401Calc, SCHWAB_DEFAULTS, type K401Inputs } from '@/lib/finance/calculators/k401'
import { Card, NumberField, RangeField, Segmented, Stat, Toggle, usd } from './ui'
import { num, type CalculatorProps } from './types'

export default function K401Calc({ plan }: Pick<CalculatorProps, 'plan'>) {
  const a = plan.assumptions
  const [salary, setSalary] = useState(SCHWAB_DEFAULTS.salary)
  const [withBonus, setWithBonus] = useState(false)
  const [bonusPct, setBonusPct] = useState(25)
  const [basePct, setBasePct] = useState(10.6)
  const [bonusDefer, setBonusDefer] = useState(5)
  const [limit, setLimit] = useState(num(a.k401_limit_2027_projected, 25500))
  const [returnPct, setReturnPct] = useState(7)
  const [years, setYears] = useState(3)

  const inputs = (over: Partial<K401Inputs>): K401Inputs => ({
    ...SCHWAB_DEFAULTS, salary, bonusPct: withBonus ? bonusPct : 0, basePct, bonusDeferPct: bonusDefer, limit, returnPct, years,
    kicker: num(a.k401_kicker, 250), matchPct: num(a.k401_match_pct, 5), ...over,
  })
  const chosen = useMemo(() => k401Calc(inputs({})), [salary, withBonus, bonusPct, basePct, bonusDefer, limit, returnPct, years]) // eslint-disable-line react-hooks/exhaustive-deps
  const baseline = useMemo(() => k401Calc(inputs({ basePct: 5, bonusDeferPct: 5 })), [salary, withBonus, bonusPct, limit, returnPct, years]) // eslint-disable-line react-hooks/exhaustive-deps

  const cashCostMo = (baseline.netAnnual - chosen.netAnnual) / 12
  const extraDeferral = chosen.totalDeferral - baseline.totalDeferral
  const taxSaved = extraDeferral - (baseline.netAnnual - chosen.netAnnual)
  const limitPct = Math.min(100, (chosen.totalDeferral / limit) * 100)
  const presets = plan.k401_elections

  const compare = presets.map(p => {
    const r = k401Calc(inputs({ basePct: p.base_pct, bonusDeferPct: p.bonus_pct }))
    return { ...p, r, costMo: (baseline.netAnnual - r.netAnnual) / 12 }
  })

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-start">
      <Card title="Your election" subtitle="Schwab matches $1 for $1 up to 5% of eligible earnings, plus a $250 kicker. Vesting is immediate.">
        <Segmented label="Preset" value={presets.find(p => p.base_pct === basePct && p.bonus_pct === bonusDefer)?.id ?? 'custom'}
          onChange={id => { const p = presets.find(x => x.id === id); if (p) { setBasePct(p.base_pct); setBonusDefer(p.bonus_pct) } }}
          options={[...presets.map(p => ({ value: p.id, label: p.label.split(':')[0].split(' (')[0] })), ...(presets.some(p => p.base_pct === basePct && p.bonus_pct === bonusDefer) ? [] : [{ value: 'custom', label: 'Custom' }])]} />
        <RangeField label="% of base pay" value={basePct} onChange={setBasePct} min={0} max={30} step={0.1} format={n => `${n.toFixed(1)}%`} />
        <div className="flex items-center gap-1 -ml-2.5">
          <Toggle checked={withBonus} onChange={setWithBonus} label="Include a bonus year" />
          <span className="text-sm">Model a bonus year (first payout is Mar 2028)</span>
        </div>
        {withBonus && (
          <>
            <RangeField label="Bonus target (% of base)" value={bonusPct} onChange={setBonusPct} min={0} max={50} step={1} format={n => `${n}%`} />
            <RangeField label="% of bonus deferred" value={bonusDefer} onChange={setBonusDefer} min={0} max={50} step={0.5} format={n => `${n}%`} />
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Base salary" prefix="$" value={salary} onChange={setSalary} step={1000} />
          <NumberField label="IRS limit" prefix="$" value={limit} onChange={setLimit} step={500} hint="2026: $24,500. 2027 projected: $25,500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <RangeField label="Expected return" value={returnPct} onChange={setReturnPct} min={0} max={12} step={0.5} format={n => `${n}%`} />
          <RangeField label="Years" value={years} onChange={setYears} min={1} max={30} step={1} format={n => `${n} yr`} />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="What it does">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="You contribute" tone="accent" value={usd(chosen.totalDeferral)} hint={`${limitPct.toFixed(0)}% of the limit`} />
            <Stat label="Schwab match" tone="good" value={usd(chosen.match)} hint={chosen.match >= 12250 ? 'full match' : 'below the full match'} />
            <Stat label="Take-home per check" value={usd(chosen.netPerCheckEarly)} hint="biweekly, early in the year" />
            <Stat label="Take-home per month" value={usd(chosen.netPerMonth)} />
            <Stat label="Cost vs 5%, per month" value={usd(cashCostMo)} tone={cashCostMo > 0 ? 'bad' : 'default'} hint="less take-home" />
            <Stat label="Tax saved vs 5%" tone="good" value={usd(Math.max(0, taxSaved))} hint="federal, per year" />
          </div>
          <div className="h-2 rounded-full overflow-hidden" role="progressbar" aria-label="Share of the IRS limit used" aria-valuenow={Math.round(limitPct)} aria-valuemin={0} aria-valuemax={100}
            style={{ background: 'rgba(255,255,255,0.10)' }}>
            <div className="h-full rounded-full" style={{ width: `${limitPct}%`, background: 'var(--accent-gradient)' }} />
          </div>
          <Stat label={`401(k) balance after ${years} yr`} value={usd(chosen.balance)} hint={`you + match, ${returnPct}% a year, ${usd(baseline.balance)} at 5%`} />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Every dollar above 5% earns no match. Federal tax uses 2026 brackets for a single filer in Texas (no state tax); the 401(k) lowers income tax but not Social Security or Medicare.
          </p>
        </Card>

        <Card title="Elections side by side">
          <ul className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {compare.map(c => (
              <li key={c.id} className="py-2.5 first:pt-0 last:pb-0 flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-sm">{c.label}</span>
                <span className="text-right flex-none text-[13px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {usd(c.r.totalDeferral)}/yr · {c.costMo > 0 ? `-${usd(c.costMo)}` : usd(0)}/mo
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
