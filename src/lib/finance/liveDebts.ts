// Live debt overlay — pure functions, no I/O.
//
// debt_accounts is hand-maintained; Plaid writes fresh balances for every
// linked card/loan into `accounts` daily (and terms into plaid_liabilities).
// This merges the two for display: a linked account shows the bank's
// balance, keeps the manual row's familiar name and rate decision, and
// carries the manual balance alongside when they disagree. Nothing is
// written back — debt_accounts stays the manual record.

import type { DebtAccount } from '@/lib/financial-data'

/** Manual balances older than this are flagged stale. */
export const MANUAL_STALE_DAYS = 14
/** Bank balances older than this are ignored (connection probably broken). */
export const LIVE_MAX_AGE_DAYS = 3
const MATCH_TOLERANCE = 1 // dollars

export interface LiveAccountRow {
  name: string
  type: string | null
  institution: string | null
  balance: number | string | null
  updated_at: string
}

export interface LiveLiabilityRow {
  account_name: string | null
  minimum_payment: number | string | null
  interest_rate: number | string | null
  aprs: { apr_type: string; apr_percentage: number }[] | null
}

export interface ManualDebt {
  debt: DebtAccount
  updatedAt: string
}

export interface ActivePromo {
  account_name: string
  name: string
  expires: string
}

const DEBT_TYPES = new Set(['credit card', 'credit', 'mortgage', 'line of credit', 'home equity', 'loan', 'student', 'auto', 'personal'])

function ageDays(iso: string, today: Date): number {
  return Math.floor((today.getTime() - new Date(iso).getTime()) / 86_400_000)
}

/** Last 4 digits a name ends with: "Chase Freedom (4628)", "···4628", "Citi Diamond 4205". */
export function last4(name: string): string | null {
  const m = name.match(/(\d{4})\D*$/)
  return m ? m[1] : null
}

function liveCategory(a: LiveAccountRow): DebtAccount['category'] | null {
  const type = (a.type ?? '').toLowerCase()
  const name = a.name.toLowerCase()
  if (type === 'mortgage') return 'Mortgage'
  if (type === 'home equity' || type === 'line of credit' || name.includes('heloc') || name.includes('home equity')) return 'HELOC'
  if (type === 'credit card' || type === 'credit' || name.includes('credit card')) return 'Credit Card'
  if (DEBT_TYPES.has(type)) return 'Personal Loan'
  return null
}

/** "American Express Platinum Card® ···3002" → "American Express Platinum Card ···3002" */
function cleanName(a: LiveAccountRow): string {
  return a.name.replace(/[®™]/g, '').replace(/^(\S+) \1 /, '$1 ').replace(/\s+/g, ' ').trim()
}

function liveRate(l: LiveLiabilityRow | undefined): number | null {
  if (!l) return null
  if (l.interest_rate != null) return Number(l.interest_rate)
  const purchase = l.aprs?.find(x => x.apr_type === 'purchase_apr')
  return purchase ? purchase.apr_percentage : null
}

export function overlayLiveDebts(
  manual: ManualDebt[],
  live: LiveAccountRow[],
  liabilities: LiveLiabilityRow[],
  activePromos: ActivePromo[],
  decide: (notes: string | null, rate: number) => DebtAccount['decision'],
  today: Date = new Date(),
): DebtAccount[] {
  const liabByName = new Map(liabilities.filter(l => l.account_name).map(l => [l.account_name!, l]))
  const fresh = live
    .map(a => ({ a, category: liveCategory(a) }))
    .filter((x): x is { a: LiveAccountRow; category: DebtAccount['category'] } =>
      x.category !== null && x.a.balance != null && ageDays(x.a.updated_at, today) <= LIVE_MAX_AGE_DAYS)

  // A card is on promo only while a tracked promo on it hasn't expired —
  // once it lapses, the bank's purchase APR is the real rate.
  const todayIso = today.toISOString().slice(0, 10)
  const promoMasks = new Set(activePromos.filter(p => p.expires >= todayIso)
    .flatMap(p => [last4(p.account_name), last4(p.name)]).filter((x): x is string => x != null))
  const usedManual = new Set<number>()
  const out: DebtAccount[] = []

  const matchManual = (a: LiveAccountRow, category: DebtAccount['category']): number => {
    const mask = last4(a.name)
    if (mask) {
      const i = manual.findIndex((m, idx) => !usedManual.has(idx) && last4(m.debt.name) === mask)
      if (i >= 0) return i
    }
    // Mortgage / HELOC: one of each, names rarely carry the account number.
    if (category === 'Mortgage' || category === 'HELOC') {
      const sameCat = manual.map((m, idx) => ({ m, idx })).filter(x => !usedManual.has(x.idx) && x.m.debt.category === category)
      const liveSameCat = fresh.filter(x => x.category === category)
      if (sameCat.length === 1 && liveSameCat.length === 1) return sameCat[0].idx
    }
    return -1
  }

  for (const { a, category } of fresh) {
    const balance = Number(a.balance)
    const l = liabByName.get(a.name)
    const mask = last4(a.name)
    const liveMin = l?.minimum_payment != null ? Number(l.minimum_payment) : null
    const i = matchManual(a, category)
    const asOf = a.updated_at.slice(0, 10)

    if (i >= 0) {
      usedManual.add(i)
      const m = manual[i].debt
      if (balance <= MATCH_TOLERANCE) continue // bank says paid off
      // Manual 0% with no live promo left on the card → use the bank's APR.
      const bankRate = liveRate(l)
      const promoLapsed = m.rate === 0 && category === 'Credit Card' && bankRate != null
        && !(mask != null && promoMasks.has(mask))
      const rate = promoLapsed ? bankRate! : m.rate
      out.push({
        ...m,
        balance,
        rate,
        decision: promoLapsed ? decide(null, rate) : m.decision,
        min: liveMin ?? m.min,
        source: 'live',
        asOf,
        stale: false,
        liveName: cleanName(a),
        ...(Math.abs(m.balance - balance) > MATCH_TOLERANCE ? { manualBalance: m.balance } : {}),
      })
      continue
    }

    if (balance <= MATCH_TOLERANCE) continue
    // Linked account with no manual row (e.g. a new balance-transfer card).
    const onPromo = mask != null && promoMasks.has(mask)
    const bankRate = liveRate(l)
    const rate = onPromo ? 0 : bankRate ?? 0
    out.push({
      name: cleanName(a),
      balance,
      rate,
      ...(onPromo || bankRate != null ? {} : { rateUnknown: true }),
      min: liveMin,
      decision: onPromo ? 'promo' : bankRate != null ? decide(null, rate) : 'keep',
      category,
      source: 'live',
      asOf,
      stale: false,
      liveName: cleanName(a),
    })
  }

  manual.forEach((m, idx) => {
    if (usedManual.has(idx)) return
    out.push({
      ...m.debt,
      source: 'manual',
      asOf: m.updatedAt.slice(0, 10),
      stale: ageDays(m.updatedAt, today) > MANUAL_STALE_DAYS,
    })
  })

  return out.sort((x, y) => x.balance - y.balance)
}
