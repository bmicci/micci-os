// ───────────────────────────────────────────────────────────────────────────
// Money brief inputs — one compact summary for the daily Money brief.
//
// The weekday briefs routine (and the API-key runner behind a flag, see
// docs/BRIEFS_RUNNER.md) reads this instead of raw transactions, so a run
// costs a few thousand input tokens instead of tens of thousands. Every
// number comes from getFinancialData() / lib/finance/*, so the brief matches
// /financial. Pure: the caller passes the data and the last week's
// transactions; nothing here touches Supabase.
// ───────────────────────────────────────────────────────────────────────────

import type { ActionItem, PromoDeadline } from '../financial-data'
import { NON_SPEND_CATEGORIES, canonCategory, spendByCategory, type RunwayProjection, type TxnRow } from './txnAggregate'
import type { UpcomingItem } from './upcoming'

export interface MoneyBriefSource {
  assets: { cash: number; savings: number }
  runwayProjection: RunwayProjection
  upcoming: UpcomingItem[]
  burnAnalysis: { hasData: boolean; monthlySpend: number }
  promos: PromoDeadline[]
  debts: { name: string; stale?: boolean; asOf?: string }[]
  actionItems: ActionItem[]
}

export interface RecentTxn extends TxnRow {
  account_name?: string | null
}

export interface MoneyBriefInputs {
  asOf: string
  cash: { liquid: number; checking: number; savings: number }
  income: { employer: string; nextPayday: string | null; netPerCheck: number; monthlySurplus: number; lowPointCash: number; lowPointDate: string } | null
  cashGap: { startDate: string; days: number; deepestCash: number; deepestDate: string } | null
  cashOutDate: string | null
  /** Bills, promo cliffs and dated to-dos in the next `horizonDays`. */
  dueSoon: { date: string; daysAway: number; kind: UpcomingItem['kind']; label: string; amount: number | null; urgent: boolean }[]
  dueSoonTotal: number
  /** Single charges at or above the threshold in the last `bigWindowDays`. */
  bigCharges: { date: string; merchant: string; amount: number; category: string; account: string | null }[]
  /** Net spend over the last 7 days vs a typical week (90-day spend × 7/30). */
  spend7d: number | null
  typicalWeek: number | null
  promosSoon: { name: string; balance: number; expires: string; daysAway: number; risk: number | null }[]
  overdue: { title: string; dueDate: string; amount: number | null }[]
  staleBalances: string[]
}

export interface MoneyBriefOptions {
  horizonDays?: number
  bigThreshold?: number
  bigWindowDays?: number
  promoDays?: number
}

const DAY = 86400000
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY)
const shift = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const round = (n: number) => Math.round(n * 100) / 100

/** Next payday on or after `today` for a schedule that started at `first`. */
export function nextPayday(first: string, periodDays: number, today: string): string {
  if (first >= today || periodDays <= 0) return first
  const n = Math.ceil(daysBetween(first, today) / periodDays)
  return shift(first, n * periodDays)
}

export function buildMoneyBriefInputs(
  src: MoneyBriefSource,
  recent: RecentTxn[],
  today: string,
  opts: MoneyBriefOptions & { periodDays?: number } = {},
): MoneyBriefInputs {
  const horizon = opts.horizonDays ?? 14
  const threshold = opts.bigThreshold ?? 250
  const bigWindow = opts.bigWindowDays ?? 3
  const promoDays = opts.promoDays ?? 45

  const r = src.runwayProjection
  const e = r.employment
  const dueSoon = src.upcoming
    .filter(u => u.daysAway >= 0 && u.daysAway <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(u => ({ date: u.date, daysAway: u.daysAway, kind: u.kind, label: u.label, amount: u.amount, urgent: u.urgent }))

  const bigSince = shift(today, -bigWindow)
  const bigCharges = recent
    .filter(t => {
      const d = String(t.transaction_date).slice(0, 10)
      return d >= bigSince && d <= today
        && Number(t.amount) >= threshold
        && !NON_SPEND_CATEGORIES.has(canonCategory(t.category))
    })
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 8)
    .map(t => ({
      date: String(t.transaction_date).slice(0, 10),
      merchant: String(t.merchant ?? 'Unknown').slice(0, 60),
      amount: round(Number(t.amount)),
      category: canonCategory(t.category),
      account: t.account_name ?? null,
    }))

  const weekStart = shift(today, -6)
  const spend7d = recent.length
    ? round(spendByCategory(recent, weekStart, today).reduce((s, c) => s + c.net, 0))
    : null

  return {
    asOf: today,
    cash: { liquid: round(src.assets.cash + src.assets.savings), checking: round(src.assets.cash), savings: round(src.assets.savings) },
    income: e ? {
      employer: e.employer,
      nextPayday: nextPayday(e.firstPayday, opts.periodDays ?? 14, today),
      netPerCheck: e.netPerCheck,
      monthlySurplus: e.monthlySurplus,
      lowPointCash: e.lowPointCash,
      lowPointDate: e.lowPointDate,
    } : null,
    cashGap: r.shortfall
      ? { startDate: r.shortfall.startDate, days: r.shortfall.days, deepestCash: r.shortfall.deepestCash, deepestDate: r.shortfall.deepestDate }
      : null,
    cashOutDate: r.cashOutDate,
    dueSoon,
    dueSoonTotal: round(dueSoon.reduce((s, u) => s + (u.amount ?? 0), 0)),
    bigCharges,
    spend7d,
    typicalWeek: src.burnAnalysis.hasData ? round(src.burnAnalysis.monthlySpend * 7 / 30) : null,
    promosSoon: src.promos
      .filter(p => !p.pastExpiry)
      .map(p => ({ name: p.name, balance: p.balance, expires: p.expires, daysAway: daysBetween(today, p.expires.slice(0, 10)), risk: p.risk }))
      .filter(p => p.daysAway >= 0 && p.daysAway <= promoDays)
      .sort((a, b) => a.daysAway - b.daysAway),
    overdue: src.actionItems
      .filter(i => (i.status ?? 'active') === 'active' && i.dueDate && i.dueDate.slice(0, 10) < today)
      .map(i => ({ title: i.title, dueDate: i.dueDate!.slice(0, 10), amount: i.amount ?? null })),
    staleBalances: src.debts.filter(d => d.stale).map(d => `${d.name} (${d.asOf ?? 'unknown date'})`),
  }
}

const usd = (n: number | null) =>
  n == null ? '—' : `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

/** Compact markdown: what the model reads. Keep it short; every line costs tokens on every run. */
export function renderMoneyBriefInputs(i: MoneyBriefInputs): string {
  const out = [`# Money brief inputs — ${i.asOf}`, '', '## Cash']
  out.push(`- Liquid: ${usd(i.cash.liquid)} (checking ${usd(i.cash.checking)}, savings ${usd(i.cash.savings)})`)
  if (i.income) {
    out.push(`- Pay: ${i.income.employer}, next check ${i.income.nextPayday ?? '—'}, ${usd(i.income.netPerCheck)} net; steady state ${i.income.monthlySurplus >= 0 ? '+' : ''}${usd(i.income.monthlySurplus)}/mo`)
    out.push(`- Projected low point: ${usd(i.income.lowPointCash)} on ${i.income.lowPointDate}`)
  }
  if (i.cashGap) out.push(`- CASH GAP: below $0 for ${i.cashGap.days} days from ${i.cashGap.startDate}, lowest ${usd(i.cashGap.deepestCash)} on ${i.cashGap.deepestDate}`)
  if (i.cashOutDate) out.push(`- CASH-OUT projected ${i.cashOutDate}`)
  out.push('', `## Due in the next 14 days (${usd(i.dueSoonTotal)} with amounts)`)
  out.push(...(i.dueSoon.length
    ? i.dueSoon.map(u => `- ${u.date} (${u.daysAway}d) ${u.kind}: ${u.label}${u.amount != null ? ` ${usd(u.amount)}` : ''}${u.urgent ? ' [urgent]' : ''}`)
    : ['- Nothing dated']))
  out.push('', '## Big charges, last 3 days')
  out.push(...(i.bigCharges.length
    ? i.bigCharges.map(c => `- ${c.date} ${c.merchant} ${usd(c.amount)} (${c.category}${c.account ? `, ${c.account}` : ''})`)
    : ['- None over the threshold']))
  out.push('', '## Spend pace')
  out.push(`- Last 7 days: ${usd(i.spend7d)} vs typical week ${usd(i.typicalWeek)}`)
  if (i.promosSoon.length) {
    out.push('', '## 0% promos ending within 45 days')
    out.push(...i.promosSoon.map(p => `- ${p.name}: ${usd(p.balance)} ends ${p.expires} (${p.daysAway}d)${p.risk ? `, deferred interest at risk ${usd(p.risk)}` : ''}`))
  }
  if (i.overdue.length) {
    out.push('', '## Overdue to-dos')
    out.push(...i.overdue.map(o => `- ${o.title}, due ${o.dueDate}${o.amount != null ? ` ${usd(o.amount)}` : ''}`))
  }
  if (i.staleBalances.length) out.push('', `Stale manual balances: ${i.staleBalances.join(', ')}`)
  return out.join('\n')
}
