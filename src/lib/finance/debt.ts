// ═══════════════════════════════════════════════════════════════════
// Debt Calculator — Pure functions
// Payoff timelines, interest costs, consolidation modeling
// ═══════════════════════════════════════════════════════════════════

import type { DebtAccount } from '@/types/finance'

export interface PayoffTimeline {
  accountName: string
  balance: number
  rate: number
  monthlyPayment: number
  monthsToPayoff: number
  totalInterestPaid: number
  totalPaid: number
}

export interface DebtSummary {
  totalDebt: number
  totalDebtExMortgage: number
  highRateTotal: number
  promoTotal: number
  belowHelocRateTotal: number
  monthlyDebtService: number
  weightedAvgRate: number
}

/**
 * Calculate payoff timeline for a single debt account.
 * Assumes fixed monthly payment.
 */
export function calculatePayoffTimeline(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
): { months: number; totalInterest: number; totalPaid: number } {
  if (balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0 }
  if (annualRate === 0) {
    const months = Math.ceil(balance / monthlyPayment)
    return { months, totalInterest: 0, totalPaid: balance }
  }

  const monthlyRate = annualRate / 100 / 12
  let remaining = balance
  let months = 0
  let totalInterest = 0
  const maxMonths = 600 // 50 year safety cap

  while (remaining > 0 && months < maxMonths) {
    const interest = remaining * monthlyRate
    totalInterest += interest
    const principal = monthlyPayment - interest

    if (principal <= 0) {
      // Payment doesn't cover interest — infinite payoff
      return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity }
    }

    remaining -= principal
    months++
  }

  return {
    months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round((balance + totalInterest) * 100) / 100,
  }
}

/**
 * Calculate summary statistics across all debt accounts.
 */
export function calculateDebtSummary(
  accounts: DebtAccount[],
  helocRatePct: number = 6.85,
): DebtSummary {
  const totalDebt = accounts.reduce((s, a) => s + a.balance, 0)
  const totalDebtExMortgage = accounts
    .filter(a => a.category !== 'Mortgage')
    .reduce((s, a) => s + a.balance, 0)

  const highRateTotal = accounts
    .filter(a => a.rate > helocRatePct && a.category !== 'Mortgage')
    .reduce((s, a) => s + a.balance, 0)

  const promoTotal = accounts
    .filter(a => a.rate === 0)
    .reduce((s, a) => s + a.balance, 0)

  const belowHelocRateTotal = accounts
    .filter(a => a.rate > 0 && a.rate <= helocRatePct && a.category !== 'Mortgage')
    .reduce((s, a) => s + a.balance, 0)

  const monthlyDebtService = accounts
    .reduce((s, a) => s + (a.min ?? 0), 0)

  // Weighted average rate (excluding 0% promos and mortgage)
  const rateAccounts = accounts.filter(a => a.rate > 0 && a.category !== 'Mortgage')
  const totalRateBalance = rateAccounts.reduce((s, a) => s + a.balance, 0)
  const weightedAvgRate = totalRateBalance > 0
    ? rateAccounts.reduce((s, a) => s + a.rate * (a.balance / totalRateBalance), 0)
    : 0

  return {
    totalDebt: Math.round(totalDebt * 100) / 100,
    totalDebtExMortgage: Math.round(totalDebtExMortgage * 100) / 100,
    highRateTotal: Math.round(highRateTotal * 100) / 100,
    promoTotal: Math.round(promoTotal * 100) / 100,
    belowHelocRateTotal: Math.round(belowHelocRateTotal * 100) / 100,
    monthlyDebtService: Math.round(monthlyDebtService * 100) / 100,
    weightedAvgRate: Math.round(weightedAvgRate * 100) / 100,
  }
}

/**
 * Get payoff timelines for all accounts, sorted by payoff date.
 */
export function getAllPayoffTimelines(accounts: DebtAccount[]): PayoffTimeline[] {
  return accounts
    .filter(a => a.balance > 0 && a.min && a.min > 0)
    .map(a => {
      const { months, totalInterest, totalPaid } = calculatePayoffTimeline(
        a.balance,
        a.rate,
        a.min!,
      )
      return {
        accountName: a.name,
        balance: a.balance,
        rate: a.rate,
        monthlyPayment: a.min!,
        monthsToPayoff: months,
        totalInterestPaid: totalInterest,
        totalPaid,
      }
    })
    .sort((a, b) => a.monthsToPayoff - b.monthsToPayoff)
}
