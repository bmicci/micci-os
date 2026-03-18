// ═══════════════════════════════════════════════════════════════════
// HELOC Calculator — Pure functions
// Interest calculations, balance projections, consolidation savings
// ═══════════════════════════════════════════════════════════════════

import type { DebtAccount } from '@/types/finance'

export interface BalanceProjection {
  month: number
  label: string
  balance: number
  interestPaid: number
  principalPaid: number
  events: string[]
}

export interface SavingsAnalysis {
  totalRolledBalance: number
  oldMonthlyPayment: number
  newMonthlyInterest: number
  monthlyRelief: number
  annualRelief: number
  totalInterestSavedYear1: number
}

export interface DeadlineInfo {
  accountName: string
  deadline: Date
  balance: number
  daysRemaining: number
  penaltyApr: number | null
}

// ── HELOC Constants ──────────────────────────────────────────────

export const HELOC_RATE = 0.0685
export const HELOC_LIMIT = 190_000
export const HELOC_MARGIN = 0.001 // 0.10% over prime

/**
 * Calculate monthly interest-only payment on a HELOC balance.
 */
export function calculateMonthlyInterest(balance: number, annualRate: number): number {
  return Math.round((balance * (annualRate / 12)) * 100) / 100
}

/**
 * Project HELOC balance over time, accounting for promo card rollovers.
 * @param currentBalance - Current HELOC draw balance
 * @param rate - Annual interest rate
 * @param monthlyPayment - Monthly payment (interest-only or amortized)
 * @param months - Number of months to project
 * @param scheduledDraws - Future draws (promo payoffs) with month offset and amount
 */
export function projectBalance(
  currentBalance: number,
  rate: number,
  monthlyPayment: number,
  months: number,
  scheduledDraws: { monthOffset: number; amount: number; label: string }[] = [],
): BalanceProjection[] {
  const projections: BalanceProjection[] = []
  let balance = currentBalance
  const monthlyRate = rate / 12
  const now = new Date()

  for (let m = 0; m <= months; m++) {
    const date = new Date(now.getFullYear(), now.getMonth() + m, 1)
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const events: string[] = []

    // Apply scheduled draws for this month
    for (const draw of scheduledDraws) {
      if (draw.monthOffset === m) {
        balance += draw.amount
        events.push(`+$${draw.amount.toLocaleString()} — ${draw.label}`)
      }
    }

    const interest = m === 0 ? 0 : Math.round(balance * monthlyRate * 100) / 100
    const principal = m === 0 ? 0 : Math.max(0, monthlyPayment - interest)
    if (m > 0) {
      balance = Math.max(0, balance + interest - monthlyPayment)
    }

    projections.push({
      month: m,
      label,
      balance: Math.round(balance * 100) / 100,
      interestPaid: interest,
      principalPaid: Math.round(principal * 100) / 100,
      events,
    })
  }

  return projections
}

/**
 * Calculate consolidation savings: old payments vs new HELOC interest.
 */
export function calculateConsolidationSavings(
  accountsToRoll: { balance: number; monthlyPayment: number; rate: number }[],
  helocRate: number,
): SavingsAnalysis {
  const totalRolledBalance = accountsToRoll.reduce((sum, a) => sum + a.balance, 0)
  const oldMonthlyPayment = accountsToRoll.reduce((sum, a) => sum + a.monthlyPayment, 0)
  const newMonthlyInterest = calculateMonthlyInterest(totalRolledBalance, helocRate)
  const monthlyRelief = Math.round((oldMonthlyPayment - newMonthlyInterest) * 100) / 100
  const annualRelief = Math.round(monthlyRelief * 12 * 100) / 100

  // Interest saved: old rates vs HELOC rate over first year
  const oldAnnualInterest = accountsToRoll.reduce(
    (sum, a) => sum + a.balance * (a.rate / 100),
    0,
  )
  const newAnnualInterest = totalRolledBalance * helocRate
  const totalInterestSavedYear1 = Math.round((oldAnnualInterest - newAnnualInterest) * 100) / 100

  return {
    totalRolledBalance: Math.round(totalRolledBalance * 100) / 100,
    oldMonthlyPayment: Math.round(oldMonthlyPayment * 100) / 100,
    newMonthlyInterest,
    monthlyRelief,
    annualRelief,
    totalInterestSavedYear1,
  }
}

/**
 * Get the next upcoming deadline across all tracked accounts.
 */
export function getNextDeadline(
  accounts: { name: string; promoExpiry?: string | null; deferredExpiry?: string | null; balance: number; penaltyApr?: number | null }[],
): DeadlineInfo | null {
  const now = new Date()
  let nearest: DeadlineInfo | null = null

  for (const acct of accounts) {
    const deadlineStr = acct.deferredExpiry ?? acct.promoExpiry
    if (!deadlineStr) continue

    const deadline = new Date(deadlineStr)
    if (deadline <= now) continue

    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)
    if (!nearest || daysRemaining < nearest.daysRemaining) {
      nearest = {
        accountName: acct.name,
        deadline,
        balance: acct.balance,
        daysRemaining,
        penaltyApr: acct.penaltyApr ?? null,
      }
    }
  }

  return nearest
}

/**
 * Determine if a debt account should be rolled to HELOC.
 * The cutoff is the HELOC rate — anything above it saves money by rolling.
 */
export function shouldRollToHeloc(accountRate: number, helocRate: number = HELOC_RATE): boolean {
  return accountRate > helocRate * 100 // helocRate is decimal, accountRate is percentage
}
