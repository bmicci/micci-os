// Dated one-time cash outflows the runway must include: the planned property-tax
// payment and promo payoffs due soon. Pure — no I/O.
import type { DebtAccount, PromoDeadline } from '@/lib/financial-data'
import { last4 } from './liveDebts'

export interface CashEvent { date: string; amount: number; label: string } // amount < 0 = money out

export interface PropertyTaxPlan { plan_amount?: unknown; pay_by?: unknown; taxes_paid?: unknown }

export function plannedCashEvents(
  promos: PromoDeadline[],
  debts: DebtAccount[],
  propertyTax: PropertyTaxPlan | null,
  todayIso: string,
  horizonDays = 90,
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
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
