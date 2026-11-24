// Dated one-time cash events the runway must include: the planned property-tax
// payment, promo payoffs due soon, and any hand-entered events (a gift, a bonus,
// a one-off bill) from financial_settings.planned_cash_events. Pure — no I/O.
import type { DebtAccount, PromoDeadline } from '@/lib/financial-data'
import { last4 } from './liveDebts'

export interface CashEvent { date: string; amount: number; label: string } // amount < 0 = money out

export interface PropertyTaxPlan { plan_amount?: unknown; pay_by?: unknown; taxes_paid?: unknown }

/**
 * Hand-entered one-time events, stored in financial_settings.planned_cash_events
 * as `{ events: [{ date, amount, label }] }` (or a bare array). amount > 0 is
 * money in (a gift), < 0 money out. Entries that aren't a valid date, a non-zero
 * number and a label are skipped, as is anything outside [today, end].
 */
export function manualCashEvents(raw: unknown, todayIso: string, endIso: string): CashEvent[] {
  const list = Array.isArray(raw) ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { events?: unknown }).events) ? (raw as { events: unknown[] }).events
    : []
  const out: CashEvent[] = []
  for (const e of list) {
    if (!e || typeof e !== 'object') continue
    const { date, amount, label } = e as Record<string, unknown>
    const amt = Number(amount)
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    if (!Number.isFinite(amt) || amt === 0) continue
    if (typeof label !== 'string' || !label.trim()) continue
    if (date < todayIso || date > endIso) continue
    out.push({ date, amount: Math.round(amt * 100) / 100, label: label.trim() })
  }
  return out
}

export function plannedCashEvents(
  promos: PromoDeadline[],
  debts: DebtAccount[],
  propertyTax: PropertyTaxPlan | null,
  todayIso: string,
  horizonDays = 90,
  manual: unknown = null,
): CashEvent[] {
  const end = new Date(`${todayIso}T12:00:00Z`)
  end.setUTCDate(end.getUTCDate() + horizonDays)
  const endIso = end.toISOString().slice(0, 10)
  const out: CashEvent[] = []

  const amt = Number(propertyTax?.plan_amount ?? 0)
  const payBy = typeof propertyTax?.pay_by === 'string' ? propertyTax.pay_by : null
  if (propertyTax && propertyTax.taxes_paid !== true && amt > 0 && payBy && payBy >= todayIso && payBy <= endIso) {
    out.push({ date: payBy, amount: -amt, label: 'Property tax (planned payment)' })
  }

  // Promo payoffs due inside the horizon. Several promos on one card can't
  // need more than the card owes, so cap each card at its live balance.
  const remaining = new Map<string, number>()
  const cardBalance = (digits: string) => debts.find(d => d.category === 'Credit Card'
    && (last4(d.name) === digits || (d.liveName != null && last4(d.liveName) === digits)))?.balance
  const due = promos
    .filter(p => !p.pastExpiry && p.balance > 0 && p.expires >= todayIso && p.expires <= endIso)
    .sort((a, b) => a.expires.localeCompare(b.expires))
  for (const p of due) {
    const digits = last4(p.acct)
    let pay = p.balance
    if (digits) {
      if (!remaining.has(digits)) remaining.set(digits, cardBalance(digits) ?? Infinity)
      pay = Math.min(pay, remaining.get(digits)!)
      remaining.set(digits, remaining.get(digits)! - pay)
    }
    if (pay > 0.5) out.push({ date: p.expires, amount: -Math.round(pay * 100) / 100, label: `Pay off ${p.name}` })
  }
  out.push(...manualCashEvents(manual, todayIso, endIso))
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
