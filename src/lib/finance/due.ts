// Due-date helpers — pure functions, no I/O.
//
// One definition of "overdue" for every surface (/tasks, dashboard, Up Next,
// MCP) so a past-due item never reads as "next up" in one place and red in
// another. Promos get a matching "past expiry" check: an `active` promo
// whose expiry has passed is unresolved, not safe — it's either paid (mark
// it paid) or deferred interest is about to land.

import { last4 } from './liveDebts'

const DAY = 86_400_000

function parseLocal(s: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00' : s)
}

/** Whole days from `today` (local midnight) to `dateStr`; negative = past. */
export function daysUntil(dateStr: string, today: Date = new Date()): number {
  const t0 = new Date(today)
  t0.setHours(0, 0, 0, 0)
  return Math.round((parseLocal(dateStr).getTime() - t0.getTime()) / DAY)
}

export function isOverdue(dueDate: string | null | undefined, today: Date = new Date()): boolean {
  return !!dueDate && daysUntil(dueDate, today) < 0
}

/** "3d overdue" · "today" · "tomorrow" · "in 5d" */
export function dueLabel(days: number): string {
  if (days < 0) return `${-days}d overdue`
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days}d`
}

export interface PromoCardBalance {
  name: string
  type: string | null
  balance: number | string | null
}

export interface PromoExpiryReview {
  pastExpiry: boolean
  /** Bank-reported balance of the card carrying the promo, when linked. */
  cardBalance: number | null
  /** Past expiry and the whole card now owes less than this promo did. */
  likelyPaid: boolean
}

/**
 * Review one active promo against today and the live card balance.
 * Matching is by last 4 digits ("Chase Freedom (4628)" ↔ "Chase CREDIT
 * CARD ···4628"). Nothing here closes a promo — `likelyPaid` is evidence
 * shown next to the Mark paid button; Brandon confirms.
 */
export function reviewPromoExpiry(
  promo: { expires: string; balance: number; acct: string },
  liveAccounts: PromoCardBalance[],
  today: Date = new Date(),
): PromoExpiryReview {
  const pastExpiry = daysUntil(promo.expires, today) < 0
  const digits = last4(promo.acct)
  const card = digits
    ? liveAccounts.find(a => (a.type ?? '').toLowerCase().includes('credit') && last4(a.name) === digits)
    : undefined
  const cardBalance = card?.balance != null ? Number(card.balance) : null
  return {
    pastExpiry,
    cardBalance,
    likelyPaid: pastExpiry && cardBalance != null && cardBalance < promo.balance,
  }
}
