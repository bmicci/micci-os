// ═══════════════════════════════════════════════════════════════════
// HELOC Drawdown Plan — month-by-month schedule engine
//
// "What if every remaining 2026 promo were paid from the line?" — starting
// from the LIVE drawn balance. Since Nov 2026 the line is nearly full, so the
// schedule shows where it would overflow; plan v5 pays the December promos
// from cash flow plus the last of the line (see financial_settings.strategic_plan).
//  · Roll-decision debts (not paid in full monthly) are drawn this month
//  · 2026 promo buckets are drawn in their expiry month
//  · Promos expiring 2027+ are DEFERRED — paid from 2027 cash flow
//  · Keep-decision debts (family loan, RH) never touch the line
// ═══════════════════════════════════════════════════════════════════

import type { DebtAccount, PromoDeadline } from '@/lib/financial-data'
import { HELOC_LIMIT, HELOC_RATE, liveHelocDrawn } from '@/lib/financial-data'

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
    if (d.decision === 'roll' && d.balance > 0 && !d.payInFull) {
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
    // Past expiry and the card now owes less than this promo: looks paid, not a draw
    if (p.likelyPaid) continue
    const expiry = new Date(p.expires)
    if (expiry >= new Date(2027, 0, 1)) {
      excluded.push({
        label: p.name,
        amount: p.balance,
        reason: 'Deferred — pay from 2027 cash flow (or re-BT) before expiry; the line has no room.',
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
  const startBalance = liveHelocDrawn(debts)
  let balance = startBalance
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
    startBalance,
    peakBalance,
    peakInterestMo: peakBalance * (HELOC_RATE / 100) / 12,
    totalPlannedDraws,
    lineAfterPlan: HELOC_LIMIT - peakBalance,
    fits: peakBalance <= HELOC_LIMIT,
  }
}
