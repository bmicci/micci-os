'use client'

import { useMemo, useState } from 'react'
import { carLoan } from '@/lib/finance/calculators/loan'
import { Card, NumberField, RangeField, Segmented, Stat, usd } from './ui'
import { num, type CalculatorProps } from './types'

export default function CarCalc({ plan }: Pick<CalculatorProps, 'plan'>) {
  const a = plan.assumptions
  const tiers = plan.car_tiers
  const [price, setPrice] = useState(tiers[1]?.price ?? 75000)
  const [tradeIn, setTradeIn] = useState(num(a.car_trade_in, 8000))
  const [cashDown, setCashDown] = useState(0)
  const [tax, setTax] = useState(num(a.car_sales_tax_pct, 6.25))
  const [fees, setFees] = useState(num(a.car_fees, 500))
  const [apr, setApr] = useState(num(a.car_apr, 3.99))
  const [term, setTerm] = useState(60)
  const [resale, setResale] = useState(num(a.car_value_after_3y_pct, 55))
  const [strategy, setStrategy] = useState<'A' | 'B' | 'C'>('A')
  const [takeHome, setTakeHome] = useState(num(a.take_home_month_max_401k, 12400))

  // insurance rises with price: interpolate between the plan's tiers
  const insurance = useMemo(() => {
    const t = [...tiers].sort((x, y) => x.price - y.price)
    if (t.length === 0) return 0
    if (price <= t[0].price) return Math.round(t[0].insurance_increase * (price / t[0].price))
    for (let i = 1; i < t.length; i++) {
      if (price <= t[i].price) {
        const f = (price - t[i - 1].price) / (t[i].price - t[i - 1].price)
        return Math.round(t[i - 1].insurance_increase + f * (t[i].insurance_increase - t[i - 1].insurance_increase))
      }
    }
    const last = t[t.length - 1]
    return Math.round(last.insurance_increase * (price / last.price))
  }, [price, tiers])
  const [insOverride, setInsOverride] = useState<number | null>(null)
  const ins = insOverride ?? insurance

  const r = carLoan({ price, tradeIn, cashDown, salesTaxPct: tax, fees, aprPct: apr, termMonths: term, insuranceIncrease: ins, valueAfter3yPct: resale })

  const living = plan.spending_lines.reduce((s, l) => s + (strategy === 'A' ? l.A : strategy === 'B' ? l.B : l.today), 0)
  const fixed = num(a.property_tax_setaside_monthly, 1250) + 1385 // property tax set-aside + HELOC interest + family loan
  const leftBefore = takeHome - living - fixed
  const leftAfter = leftBefore - r.monthlyCost
  const gross = 240000
  const pctOfGross = ((r.monthlyCost * 12) / gross) * 100

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-start">
      <Card title="The car" subtitle="Texas taxes the price minus your trade-in. Insurance estimate follows the plan's tiers.">
        <Segmented label="Price tier" value={price} onChange={setPrice}
          options={[...tiers.map(t => ({ value: t.price, label: `$${t.price / 1000}K` }))]} />
        <NumberField label="Price" prefix="$" value={price} onChange={setPrice} step={1000} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Trade-in" prefix="$" value={tradeIn} onChange={setTradeIn} step={500} hint="Your car, about $8K" />
          <NumberField label="Cash down" prefix="$" value={cashDown} onChange={setCashDown} step={500} />
          <NumberField label="Sales tax" suffix="%" value={tax} onChange={setTax} step={0.05} />
          <NumberField label="Fees" prefix="$" value={fees} onChange={setFees} step={50} />
        </div>
        <RangeField label="APR" value={apr} onChange={setApr} min={0} max={12} step={0.05} format={n => `${n.toFixed(2)}%`} />
        <Segmented label="Term" value={term} onChange={setTerm}
          options={[36, 48, 60, 72, 84].map(m => ({ value: m, label: `${m} mo` }))} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Extra insurance / mo" prefix="$" value={ins} onChange={setInsOverride} step={5} />
          <NumberField label="Value after 3 yrs" suffix="%" value={resale} onChange={setResale} step={1} hint="of price" />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="What it costs">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Payment" tone="accent" value={usd(r.payment)} hint={`${term} months at ${apr.toFixed(2)}%`} />
            <Stat label="With insurance" value={usd(r.monthlyCost)} hint={`${pctOfGross.toFixed(1)}% of gross pay`} tone={pctOfGross > 10 ? 'bad' : 'default'} />
            <Stat label="Amount financed" value={usd(r.financed)} />
            <Stat label="Total interest" value={usd(r.totalInterest)} />
            <Stat label="Loan balance, 3 yrs" value={usd(r.balanceAfter3y)} />
            <Stat label="Value, 3 yrs" value={usd(r.valueAfter3y)} hint={r.equityAfter3y >= 0 ? `${usd(r.equityAfter3y)} equity` : `${usd(-r.equityAfter3y)} underwater`} tone={r.equityAfter3y >= 0 ? 'default' : 'bad'} />
          </div>
          <Stat label="3-year cost of owning" value={usd(r.threeYearCost)} hint="payments + insurance + trade-in given up − equity" />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rule of thumb: total car cost under 10% of gross pay (about $2,000 a month).</p>
        </Card>

        <Card title="Can the budget carry it?" subtitle="Monthly take-home minus living costs from the plan, property-tax set-aside, HELOC interest and family loan.">
          <Segmented label="Spending strategy" value={strategy} onChange={setStrategy}
            options={[{ value: 'A', label: 'A Balanced' }, { value: 'B', label: 'B Aggressive' }, { value: 'C', label: 'C Today' }]} />
          <NumberField label="Take-home per month" prefix="$" value={takeHome} onChange={setTakeHome} step={50} hint={`Plan: ${usd(num(a.take_home_month_max_401k, 12400))} at the max 401(k), ${usd(num(a.take_home_month_5pct, 13200))} at 5%`} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Left for debt, no car" value={usd(leftBefore)} tone={leftBefore >= 0 ? 'good' : 'bad'} />
            <Stat label="Left with this car" value={usd(leftAfter)} tone={leftAfter >= 0 ? 'good' : 'bad'}
              hint={leftAfter < 0 ? 'A monthly shortfall goes on a card' : 'before card minimums (~$394)'} />
          </div>
        </Card>
      </div>
    </div>
  )
}
