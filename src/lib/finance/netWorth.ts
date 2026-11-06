// Live net-worth helpers — replace the old hardcoded "+$2,000/mo" and the
// $410K wealth-projection starting point. Pure, no I/O.
import type { Assets, DebtAccount, OfferPaycheck } from '@/lib/financial-data'
import type { BurnAnalysis } from './txnAggregate'

export interface NetWorthGrowth {
  monthly: number      // surplus + principal paid inside the minimums
  surplus: number      // take-home − cash out (0 with no accepted job)
  principal: number    // minimums minus interest, debts that amortize
  takeHome: number
  outflow: number
}

/** Steady-state monthly net-worth growth once paychecks are regular. */
export function estimateNetWorthGrowth(
  debts: DebtAccount[],
  burn: BurnAnalysis,
  offers: OfferPaycheck[],
): NetWorthGrowth {
  const accepted = offers.find(o => o.offer.status === 'accepted')
  const takeHome = accepted?.monthlyNetAvg ?? 0
  const outflow = burn.hasData ? burn.monthlyOutflow : 0
  const surplus = accepted ? takeHome - outflow : 0
  const principal = debts
    .filter(d => d.balance > 0 && !d.payInFull && (d.min ?? 0) > 0)
    .reduce((s, d) => s + Math.max(0, (d.min ?? 0) - (d.balance * d.rate) / 100 / 12), 0)
  return {
    monthly: Math.round(surplus + principal),
    surplus: Math.round(surplus),
    principal: Math.round(principal),
    takeHome: Math.round(takeHome),
    outflow: Math.round(outflow),
  }
}

/** Invested assets that compound: retirement + brokerage (not home, cash or cars). */
export function investedAssets(assets: Assets): number {
  return Math.round(assets.retirement + assets.brokerage)
}
