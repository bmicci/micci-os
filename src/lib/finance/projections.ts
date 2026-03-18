// ═══════════════════════════════════════════════════════════════════
// Projections — 12-month forward projection with event-aware modeling
// Also: wealth projections (20-year compound growth)
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate future value with regular monthly contributions.
 * Used for wealth projection scenarios.
 */
export function futureValue(
  presentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
): number {
  const monthlyRate = annualReturn / 12
  const months = years * 12
  let balance = presentValue

  for (let m = 0; m < months; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution
  }

  return Math.round(balance * 100) / 100
}

/**
 * Generate year-by-year wealth projection data for charting.
 */
export function wealthProjection(
  startingNW: number,
  annualContribution: number,
  annualReturn: number,
  years: number,
): { year: number; age: number; netWorth: number }[] {
  const data: { year: number; age: number; netWorth: number }[] = []
  const monthlyContribution = annualContribution / 12
  let balance = startingNW
  const startAge = 40 // Brandon's current age
  const monthlyRate = annualReturn / 12

  for (let y = 0; y <= years; y++) {
    data.push({
      year: 2026 + y,
      age: startAge + y,
      netWorth: Math.round(balance),
    })
    // Compound for 12 months
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution
    }
  }

  return data
}

/**
 * Calculate months of runway given liquid savings and monthly burn rate.
 */
export function calculateRunway(
  liquidSavings: number,
  monthlyBurn: number,
  monthlyIncome: number = 0,
): { months: number; isIndefinite: boolean } {
  const netBurn = monthlyBurn - monthlyIncome
  if (netBurn <= 0) return { months: Infinity, isIndefinite: true }
  return {
    months: Math.round((liquidSavings / netBurn) * 10) / 10,
    isIndefinite: false,
  }
}
