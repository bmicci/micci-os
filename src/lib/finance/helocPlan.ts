// ═══════════════════════════════════════════════════════════════════
// HELOC Drawdown Plan — month-by-month schedule engine
//
// Encodes the June 2026 strategy:
//  · AmEx Gold/Plat (27.49%) roll to HELOC immediately
//  · Every 2026 promo bucket is paid from the HELOC in its expiry month
//  · Promos expiring 2027+ (Citi Diamond) are DEFERRED — re-BT or pay
//    from new-job income; they do not fit in the line
//  · Keep-decision debts (Virginia FCU via Dad) never touch the line
// ═══════════════════════════════════════════════════════════════════

import type { DebtAccount, PromoDeadline } from '@/lib/financial-data'
import { HELOC_LIMIT, HELOC_RATE, HELOC_DRAWN } from '@/lib/financial-data'

export interface PlanDraw {
  label: string
  amount: number
  deferredRisk: number | null // retroactive interest at risk (Best Buy style)
}

export interface PlanMonth {
  key: string // '2026-07'
  label: string // 'Jul 26'
  draws: PlanDraw[]
  drawTotal: number
  endBalance: number
  interestMo: number // interest-only payment at end-of-month balance
  remainingLine: number // can go negative — that's the point of showing it
}

export interface ExcludedItem {
  label: string
  amount: number
  reason: string
}

export interface HelocPlan {
  months: PlanMonth[]
  excluded: ExcludedItem[]
  startBalance: number
  peakBalance: number
  peakInterestMo: number
  totalPlannedDraws: number
  lineAfterPlan: number // remaining headroom once all planned draws land
  fits: boolean
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

/**
 * Build the month-by-month HELOC drawdown schedule from live promo and
 * debt data. Pure function of its inputs plus the HELOC constants.
 */
export function buildHelocPlan(
  promos: PromoDeadline[],
  debts: DebtAccount[],
  asOf: Date = new Date(),
): HelocPlan {
  const start = new Date(asOf.getFullYear(), asOf.getMonth(), 1)
  const horizon = new Date(2027, 5, 1) // through Jun 2027

  // Draws planned per month
  const drawsByMonth = new Map<string, PlanDraw[]>()
  const addDraw = (key: string, draw: PlanDraw) => {
    drawsByMonth.set(key, [...(drawsByMonth.get(key) ?? []), draw])
  }

  const excluded: ExcludedItem[] = []

  // 1) Immediate rolls: high-rate roll-decision debts, drawn this month
  for (const d of debts) {
    if (d.category === 'Mortgage' || d.category === 'HELOC') continue
    if (d.decision === 'roll' && d.balance > 0) {
      addDraw(monthKey(start), {
        label: `Roll ${d.name} (${d.rate}%)`,
        amount: d.balance,
        deferredRisk: null,
      })
    }
    if (d.decision === 'keep' && d.balance > 0 && d.rate > 0) {
      excluded.push({
        label: d.name,
        amount: d.balance,
        reason: `Keep — paying $${d.min ?? 0}/mo at ${d.rate}%; preserves line headroom`,
      })
    }
  }

  // 2) Promo buckets: pay from HELOC in the expiry month; 2027+ deferred
  for (const p of promos) {
    if (p.balance <= 0) continue
    const expiry = new Date(p.expires)
    if (expiry >= new Date(2027, 0, 1)) {
      excluded.push({
        label: p.name,
        amount: p.balance,
        reason: 'Deferred — does not fit the line. Re-BT (~3% fee) or pay from new-job income before expiry.',
      })
      continue
    }
    const payMonth = new Date(expiry.getFullYear(), expiry.getMonth(), 1)
    // Anything already past due lands in the current month
    const key = monthKey(payMonth < start ? start : payMonth)
    addDraw(key, { label: p.name, amount: p.balance, deferredRisk: p.risk })
  }

  // 3) Walk the months
  const months: PlanMonth[] = []
  let balance = HELOC_DRAWN
  let peakBalance = balance
  let totalPlannedDraws = 0

  const cursor = new Date(start)
  while (cursor <= horizon) {
    const key = monthKey(cursor)
    const draws = (drawsByMonth.get(key) ?? []).sort((a, b) => b.amount - a.amount)
    const drawTotal = draws.reduce((s, d) => s + d.amount, 0)
    balance += drawTotal
    totalPlannedDraws += drawTotal
    peakBalance = Math.max(peakBalance, balance)

    months.push({
      key,
      label: monthLabel(cursor),
      draws,
      drawTotal,
      endBalance: balance,
      interestMo: balance * (HELOC_RATE / 100) / 12,
      remainingLine: HELOC_LIMIT - balance,
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return {
    months,
    excluded,
    startBalance: HELOC_DRAWN,
    peakBalance,
    peakInterestMo: peakBalance * (HELOC_RATE / 100) / 12,
    totalPlannedDraws,
    lineAfterPlan: HELOC_LIMIT - peakBalance,
    fits: peakBalance <= HELOC_LIMIT,
  }
}
