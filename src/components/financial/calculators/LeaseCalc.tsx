'use client'

import { useState } from 'react'
import { leaseVsBuy } from '@/lib/finance/calculators/lease'
import { Card, NumberField, RangeField, Segmented, Stat, usd } from './ui'
import { num, type CalculatorProps } from './types'

export default function LeaseCalc({ plan }: Pick<CalculatorProps, 'plan'>) {
  const a = plan.assumptions
  const tiers = plan.car_tiers
  const startPrice = tiers[1]?.price ?? 75000

  // Shared
  const [price, setPrice] = useState(startPrice)
  const [msrp, setMsrp] = useState(startPrice)
  const [tradeIn, setTradeIn] = useState(num(a.car_trade_in, 8000))
  const [tax, setTax] = useState(num(a.car_sales_tax_pct, 6.25))
  // Lease
  const [term, setTerm] = useState(36)
  const [residual, setResidual] = useState(58)
  const [mf, setMf] = useState(0.0025)
  const [capReduction, setCapReduction] = useState(0)
  const [acqFee, setAcqFee] = useState(995)
  const [dispFee, setDispFee] = useState(395)
  const [milesAllowed, setMilesAllowed] = useState(12000)
  const [milesDriven, setMilesDriven] = useState(12000)
  const [overage, setOverage] = useState(0.25)
  // Loan
  const [apr, setApr] = useState(num(a.car_apr, 3.99))
  const [loanTerm, setLoanTerm] = useState(60)
  const [cashDown, setCashDown] = useState(0)
  const [fees, setFees] = useState(num(a.car_fees, 500))
  const [valueEndOverride, setValueEndOverride] = useState<number | null>(null)
  // Market value at lease end defaults to the residual (as a % of price)
  const valueEnd = valueEndOverride ?? Math.round((residual * msrp) / Math.max(1, price))

  const r = leaseVsBuy({
    price, msrp, tradeIn, salesTaxPct: tax,
    leaseTermMonths: term, residualPct: residual, moneyFactor: mf, capReduction,
    acquisitionFee: acqFee, dispositionFee: dispFee,
    milesPerYearAllowed: milesAllowed, milesPerYearDriven: milesDriven, overagePerMile: overage,
    aprPct: apr, loanTermMonths: loanTerm, loanCashDown: cashDown, loanFees: fees, valueAtEndPct: valueEnd,
  })

  const winner = r.cheaper === 'tie' ? 'About even' : r.cheaper === 'buy' ? 'Buying is cheaper' : 'Leasing is cheaper'

  return (
    <div className="flex flex-col gap-4">
      {/* Verdict first, so it's visible on a phone without scrolling */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Stat label={`Over ${r.horizonMonths} months`} tone="accent" value={winner}
            hint={r.cheaper === 'tie' ? undefined : `by ${usd(r.difference)} after counting what you own at the end`} />
          <Stat label="Lease payment" value={usd(r.lease.payment)} hint={`${usd(r.lease.dueAtSigning)} due at signing`} />
          <Stat label="Loan payment" value={usd(r.buy.payment)}
            hint={r.monthlyPaymentGap >= 0 ? `${usd(r.monthlyPaymentGap)}/mo more than the lease` : `${usd(-r.monthlyPaymentGap)}/mo less than the lease`} />
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Net cost = everything you pay + trade-in given up − what the car is worth to you at the end (nothing for a lease; value minus loan balance for a loan).
          Same insurance assumed for both.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
        <Card title="The car" subtitle="Applies to both. Texas taxes a purchase on price minus trade-in, a lease on the full price.">
          <Segmented label="Price tier" value={price} onChange={v => { setPrice(v); setMsrp(v) }}
            options={tiers.map(t => ({ value: t.price, label: `$${t.price / 1000}K` }))} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Negotiated price" prefix="$" value={price} onChange={setPrice} step={1000} />
            <NumberField label="MSRP" prefix="$" value={msrp} onChange={setMsrp} step={1000} hint="residual uses this" />
            <NumberField label="Trade-in" prefix="$" value={tradeIn} onChange={setTradeIn} step={500} hint="about $8K" />
            <NumberField label="Sales tax" suffix="%" value={tax} onChange={setTax} step={0.05} />
          </div>
        </Card>

        <Card title="Lease">
          <Segmented label="Lease term" value={term} onChange={setTerm}
            options={[24, 36, 39, 48].map(m => ({ value: m, label: `${m} mo` }))} />
          <RangeField label="Residual (% of MSRP)" value={residual} onChange={setResidual} min={35} max={75} step={1} format={n => `${n}%`} />
          <RangeField label="Money factor" value={mf} onChange={setMf} min={0} max={0.006} step={0.00005}
            format={n => `${n.toFixed(5)} ≈ ${(n * 2400).toFixed(2)}% APR`} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Cash down" prefix="$" value={capReduction} onChange={setCapReduction} step={500} hint="cap cost reduction" />
            <NumberField label="Acquisition fee" prefix="$" value={acqFee} onChange={setAcqFee} step={50} hint="rolled in" />
            <NumberField label="Turn-in fee" prefix="$" value={dispFee} onChange={setDispFee} step={25} />
            <NumberField label="Overage / mile" prefix="$" value={overage} onChange={setOverage} step={0.05} />
            <NumberField label="Miles allowed / yr" value={milesAllowed} onChange={setMilesAllowed} step={1000} />
            <NumberField label="Miles you drive / yr" value={milesDriven} onChange={setMilesDriven} step={1000} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Car value at turn-in" value={usd(r.lease.residualValue)} hint="the residual" />
            <Stat label="Mileage overage" value={usd(r.lease.overageCost)} tone={r.lease.overageCost > 0 ? 'bad' : 'default'} />
            <Stat label="Paid over the lease" value={usd(r.lease.totalOutOfPocket)} hint="payments, down, turn-in, overage" />
            <Stat label="Net cost" tone="accent" value={usd(r.lease.netCost)} hint="you own nothing at the end" />
          </div>
        </Card>

        <Card title="Buy with a loan">
          <RangeField label="APR" value={apr} onChange={setApr} min={0} max={12} step={0.05} format={n => `${n.toFixed(2)}%`} />
          <Segmented label="Loan term" value={loanTerm} onChange={setLoanTerm}
            options={[36, 48, 60, 72].map(m => ({ value: m, label: `${m} mo` }))} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Cash down" prefix="$" value={cashDown} onChange={setCashDown} step={500} />
            <NumberField label="Fees" prefix="$" value={fees} onChange={setFees} step={50} hint="title, registration, doc" />
          </div>
          <NumberField label={`Value after ${r.horizonMonths} mo`} suffix="% of price" value={valueEnd}
            onChange={setValueEndOverride} step={1} hint="defaults to the lease residual" />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Amount financed" value={usd(r.buy.financed)} hint={`${usd(r.buy.totalInterestFullTerm)} interest over ${loanTerm} mo`} />
            <Stat label={`Balance at ${r.horizonMonths} mo`} value={usd(r.buy.balanceAtEnd)} />
            <Stat label="Equity at the end" value={usd(r.buy.equityAtEnd)} tone={r.buy.equityAtEnd >= 0 ? 'good' : 'bad'}
              hint={`${usd(r.buy.valueAtEnd)} value − loan`} />
            <Stat label="Net cost" tone="accent" value={usd(r.buy.netCost)} hint="payments + down + trade-in − equity" />
          </div>
        </Card>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Leasing usually wins on monthly cash and loses on total cost if you keep cars past the loan. With money tight through spring 2027,
        compare the payments against what Cash Flow says is left each month. Ask the dealer for the money factor and residual in writing.
      </p>
    </div>
  )
}
