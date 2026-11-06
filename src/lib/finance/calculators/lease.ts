// Lease vs buy for the Calculators section. Pure — no I/O.
//
// Both sides are compared over the same horizon (the lease term), in cash
// out of pocket minus what you own at the end:
//   lease: everything paid + trade-in given up + turn-in fees + mileage overage; you own nothing
//   buy:   payments in the horizon + cash down + trade-in given up − equity (value − loan balance)
import { balanceAfter, monthlyPayment } from './loan'

export interface LeaseVsBuyInputs {
  price: number               // negotiated price (cap cost before fees/tax)
  msrp: number                // residual is a % of MSRP
  tradeIn: number             // applied to either deal
  salesTaxPct: number         // Texas 6.25% motor vehicle tax
  // Lease
  leaseTermMonths: number
  residualPct: number         // of MSRP
  moneyFactor: number         // APR ≈ MF × 2400
  capReduction: number        // cash down on the lease (beyond first payment)
  acquisitionFee: number      // rolled into the lease
  dispositionFee: number      // paid at turn-in
  milesPerYearAllowed: number
  milesPerYearDriven: number
  overagePerMile: number
  // Loan
  aprPct: number
  loanTermMonths: number
  loanCashDown: number
  loanFees: number            // title/registration/doc, financed
  valueAtEndPct: number       // car's market value at the end of the horizon, % of price
}

export interface LeaseSide {
  payment: number
  dueAtSigning: number
  monthlyEquivalentApr: number
  residualValue: number
  overageCost: number
  totalOutOfPocket: number    // everything paid over the term incl. turn-in
  netCost: number             // totalOutOfPocket + trade-in given up
}

export interface BuySide {
  financed: number
  payment: number
  paidInHorizon: number       // payments made within the horizon
  balanceAtEnd: number
  valueAtEnd: number
  equityAtEnd: number
  totalOutOfPocket: number    // payments in horizon + cash down
  netCost: number             // out of pocket + trade-in − equity
  totalInterestFullTerm: number
}

export interface LeaseVsBuyResult {
  horizonMonths: number
  lease: LeaseSide
  buy: BuySide
  cheaper: 'lease' | 'buy' | 'tie'
  difference: number          // |lease.netCost − buy.netCost|
  monthlyPaymentGap: number   // buy.payment − lease.payment (positive = buying costs more per month)
}

/** Texas taxes a lease on the full price (no trade-in credit); the tax is usually rolled into the lease. */
export function leasePayment(i: Pick<LeaseVsBuyInputs, 'price' | 'msrp' | 'tradeIn' | 'salesTaxPct' | 'leaseTermMonths' | 'residualPct' | 'moneyFactor' | 'capReduction' | 'acquisitionFee'>) {
  const tax = i.price * (i.salesTaxPct / 100)
  const adjCap = Math.max(0, i.price + tax + i.acquisitionFee - i.capReduction - i.tradeIn)
  const residual = i.msrp * (i.residualPct / 100)
  const term = Math.max(1, i.leaseTermMonths)
  const depreciation = Math.max(0, (adjCap - residual) / term)
  const finance = (adjCap + residual) * i.moneyFactor
  return { payment: depreciation + finance, adjCap, residual, tax }
}

export function leaseVsBuy(i: LeaseVsBuyInputs): LeaseVsBuyResult {
  const horizon = Math.max(1, i.leaseTermMonths)

  // ── Lease ──
  const lp = leasePayment(i)
  const years = horizon / 12
  const overageCost = Math.max(0, i.milesPerYearDriven - i.milesPerYearAllowed) * years * i.overagePerMile
  const dueAtSigning = i.capReduction + lp.payment
  const leaseOut = lp.payment * horizon + i.capReduction + i.dispositionFee + overageCost
  const lease: LeaseSide = {
    payment: lp.payment,
    dueAtSigning,
    monthlyEquivalentApr: i.moneyFactor * 2400,
    residualValue: lp.residual,
    overageCost,
    totalOutOfPocket: leaseOut,
    netCost: leaseOut + i.tradeIn,
  }

  // ── Buy ── (Texas sales tax on price minus trade-in)
  const net = Math.max(0, i.price - i.tradeIn)
  const financed = Math.max(0, net + net * (i.salesTaxPct / 100) + i.loanFees - i.loanCashDown)
  const payment = monthlyPayment(financed, i.aprPct, i.loanTermMonths)
  const paidMonths = Math.min(horizon, i.loanTermMonths)
  const balanceAtEnd = balanceAfter(financed, i.aprPct, i.loanTermMonths, paidMonths)
  const valueAtEnd = i.price * (i.valueAtEndPct / 100)
  const equity = valueAtEnd - balanceAtEnd
  const buyOut = payment * paidMonths + i.loanCashDown
  const buy: BuySide = {
    financed,
    payment,
    paidInHorizon: payment * paidMonths,
    balanceAtEnd,
    valueAtEnd,
    equityAtEnd: equity,
    totalOutOfPocket: buyOut,
    netCost: buyOut + i.tradeIn - equity,
    totalInterestFullTerm: payment * i.loanTermMonths - financed,
  }

  const diff = lease.netCost - buy.netCost
  return {
    horizonMonths: horizon,
    lease,
    buy,
    cheaper: Math.abs(diff) < 1 ? 'tie' : diff > 0 ? 'buy' : 'lease',
    difference: Math.abs(diff),
    monthlyPaymentGap: buy.payment - lease.payment,
  }
}
