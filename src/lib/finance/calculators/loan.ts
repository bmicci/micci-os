// Loan + car math for the Calculators section. Pure — no I/O.

/** Level monthly payment for a fully amortizing loan. */
export function monthlyPayment(principal: number, aprPct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = aprPct / 100 / 12
  if (r === 0) return principal / months
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}

/** Remaining balance after `paid` payments. */
export function balanceAfter(principal: number, aprPct: number, months: number, paid: number): number {
  if (principal <= 0) return 0
  const r = aprPct / 100 / 12
  const pmt = monthlyPayment(principal, aprPct, months)
  if (r === 0) return Math.max(0, principal - pmt * paid)
  return Math.max(0, principal * Math.pow(1 + r, paid) - pmt * ((Math.pow(1 + r, paid) - 1) / r))
}

export interface CarInputs {
  price: number
  tradeIn: number
  cashDown: number
  salesTaxPct: number      // Texas: on price minus trade-in
  fees: number
  aprPct: number
  termMonths: number
  insuranceIncrease: number // extra insurance per month vs the current car
  valueAfter3yPct: number   // resale value after 3 years as % of price
}

export interface CarResult {
  financed: number
  payment: number
  monthlyCost: number       // payment + insurance increase
  totalInterest: number
  totalPaid: number
  balanceAfter3y: number
  valueAfter3y: number
  equityAfter3y: number
  threeYearCost: number     // payments + insurance + trade-in given up − equity
}

/**
 * Same arithmetic as plan v5: financed = price − trade-in + tax on (price − trade-in) + fees − cash down;
 * 3-year cost = 36 payments + 36 months of extra insurance + trade-in − (value − loan balance).
 */
export function carLoan(i: CarInputs): CarResult {
  const net = Math.max(0, i.price - i.tradeIn)
  const financed = Math.max(0, net + net * (i.salesTaxPct / 100) + i.fees - i.cashDown)
  const payment = monthlyPayment(financed, i.aprPct, i.termMonths)
  const totalPaid = payment * i.termMonths
  const paid3 = Math.min(36, i.termMonths)
  const balance3 = balanceAfter(financed, i.aprPct, i.termMonths, paid3)
  const value3 = i.price * (i.valueAfter3yPct / 100)
  const equity = value3 - balance3
  return {
    financed,
    payment,
    monthlyCost: payment + i.insuranceIncrease,
    totalInterest: totalPaid - financed,
    totalPaid,
    balanceAfter3y: balance3,
    valueAfter3y: value3,
    equityAfter3y: equity,
    threeYearCost: payment * paid3 + i.insuranceIncrease * 36 + i.tradeIn + i.cashDown - equity,
  }
}
