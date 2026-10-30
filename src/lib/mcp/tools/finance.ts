// Finance tools: snapshot, transactions, spending, recurring, debts, offers,
// what-if runway, portfolio. Every number comes from getFinancialData() and
// lib/finance/*, so answers match /financial.

import * as z from 'zod/v4'
import { computeRunwayProjection, spendByCategory, type TxnRow, type RunwayProjection } from '@/lib/finance/txnAggregate'
import { offerPaycheck, type JobOffer } from '@/lib/finance/jobIncome'
import { CHARACTER_LIMIT, READ_ONLY, day, db, defineTool, fail, isoDaysAgo, isoToday, text, usd, type AnyMicciTool } from '../tool'

function runwayLines(r: RunwayProjection, liquid: number): string[] {
  const out = [`- Liquid cash now: **${usd(liquid)}**`]
  if (r.employment) {
    const e = r.employment
    out.push(
      `- Income: **${e.employer}**, ${usd(e.netPerCheck)} net per check, first check ${day(e.firstPayday)}${e.daysUntilFirstCheck > 0 ? ` (in ${e.daysUntilFirstCheck} days)` : ''}`,
      `- Cash low point: **${usd(e.lowPointCash)}** on ${day(e.lowPointDate)}`,
      `- Steady state: ${usd(e.monthlyNet)}/mo net income vs ${usd(r.postCliffMonthlyBurn)}/mo spend → **${e.monthlySurplus >= 0 ? '+' : ''}${usd(e.monthlySurplus)}/mo**`,
    )
  } else {
    out.push(`- Monthly burn: ${usd(r.phase === 'post-cliff' ? r.postCliffMonthlyBurn : r.preCliffMonthlyBurn)}`)
  }
  out.push(`- Projected cash-out: ${r.cashOutDate ? `**${day(r.cashOutDate)}**` : 'none within 10 years'}`)
  return out
}

export const financeTools: AnyMicciTool[] = [
  defineTool({
    name: 'micci_financial_snapshot',
    title: 'Financial snapshot',
    description:
      "Brandon's current financial position in one call: liquid cash, runway or job-income projection (first paycheck, cash low point, monthly surplus), real 90-day spend, net worth, debt totals, HELOC headroom, portfolio value, and the next deadlines. Start here for any 'where do I stand' / 'can I afford' question. Numbers match the micci-os /financial page.",
    annotations: READ_ONLY,
    handler: async (_a, ctx) => {
      const d = await ctx.data()
      const liquid = d.assets.cash + d.assets.savings
      const nonMortgage = d.debts.filter(x => x.category !== 'Mortgage')
      const debtTotal = nonMortgage.reduce((s, x) => s + x.balance, 0)
      const mortgage = d.debts.find(x => x.category === 'Mortgage')
      const heloc = d.debts.find(x => x.category === 'HELOC')
      const portfolio = d.portfolio ? d.portfolio.value + d.portfolio.employerSupplement : d.assets.retirement
      const totalAssets = d.assets.home + d.assets.retirement + d.assets.brokerage + d.assets.cash + d.assets.savings + d.assets.vehicles
      const netWorth = totalAssets - d.debts.reduce((s, x) => s + x.balance, 0)
      const b = d.burnAnalysis
      const lines = [
        `# Financial snapshot — ${day(isoToday())}`,
        '',
        '## Cash & runway',
        ...runwayLines(d.runwayProjection, liquid),
        `- Breakdown: checking ${usd(d.assets.cash)} (Plaid-synced) + savings ${usd(d.assets.savings)} (manual entry)`,
        '',
        '## Spending',
        b.hasData
          ? `- Real spend: **${usd(b.monthlySpend)}/mo** (last ${b.windowDays} days, ${b.windowStart} → ${b.windowEnd}, ${b.txnCount.toLocaleString()} transactions)`
          : '- No transaction data',
        ...(b.hasData ? b.byCategory.slice(0, 6).map(c => `  - ${c.cat}: ${usd(c.monthly)}/mo`) : []),
        `- Recurring charges: ${usd(d.recurring.activeMonthlyTotal)}/mo (${d.recurring.active.length} active; subscriptions ${usd(d.recurring.subsMonthlyTotal)}, bills ${usd(d.recurring.billsMonthlyTotal)})`,
        '',
        '## Balance sheet',
        `- Net worth: **${usd(netWorth)}** (home ${usd(d.assets.home)}, retirement ${usd(d.assets.retirement)})`,
        `- Portfolio: ${usd(portfolio)}${d.portfolio ? ` (${d.portfolio.glPct >= 0 ? '+' : ''}${d.portfolio.glPct}% unrealized)` : ''}`,
        `- Debt excl. mortgage: **${usd(debtTotal)}** across ${nonMortgage.length} accounts (${nonMortgage.filter(x => x.source === 'live').length} live from banks)`,
        heloc ? `- HELOC: ${usd(heloc.balance)} drawn @ ${heloc.rate}%, headroom ${usd(d.helocKPIs.limit - heloc.balance)}${heloc.stale ? ` — **manual figure from ${heloc.asOf}, stale**` : ''}` : '- HELOC: —',
        ...(d.debts.some(x => x.stale) ? [`- ⚠ Stale manual balances (14+ days): ${d.debts.filter(x => x.stale).map(x => `${x.name} (${x.asOf})`).join(', ')}`] : []),
        mortgage ? `- Mortgage: ${usd(mortgage.balance)} @ ${mortgage.rate}%` : '',
        '',
        '## Next up',
        ...(d.upcoming.length ? d.upcoming.slice(0, 6).map(u => `- ${day(u.date)} · ${u.label}${u.amount != null ? ` · ${usd(u.amount)}` : ''}${u.urgent ? ' ⚠' : ''}`) : ['- Nothing scheduled']),
      ]
      return text(lines.filter(l => l !== '').join('\n').replace(/\n(##)/g, '\n\n$1'))
    },
  }),
  defineTool({
    name: 'micci_search_transactions',
    title: 'Search transactions',
    description:
      "Search Brandon's bank and card transactions (Chase, Amex via Plaid; older CSV imports). Filter by merchant text, category, date range, and amount. Positive amounts are spend, negative are refunds/income. Returns newest first with paging. Example: merchant='geico', start_date='2026-01-01'. For category totals use micci_spending_by_category instead.",
    inputSchema: z.strictObject({
      merchant: z.string().min(2).max(100).optional().describe("Case-insensitive text to match in the merchant name, e.g. 'uber', 'txu'"),
      category: z.string().max(60).optional().describe("Exact category, e.g. 'Food & Dining', 'Bills & Utilities', 'Travel'"),
      start_date: z.iso.date().optional().describe('Inclusive start, YYYY-MM-DD'),
      end_date: z.iso.date().optional().describe('Inclusive end, YYYY-MM-DD'),
      min_amount: z.number().optional().describe('Minimum amount in dollars (spend is positive)'),
      max_amount: z.number().optional().describe('Maximum amount in dollars'),
      limit: z.number().int().min(1).max(100).default(25).describe('Rows to return (max 100)'),
      offset: z.number().int().min(0).default(0).describe('Rows to skip, for paging'),
    }),
    annotations: READ_ONLY,
    handler: async (a) => {
      let q = db().from('transactions')
        .select('transaction_date, date, merchant, amount, category, account_name', { count: 'exact' })
      if (a.merchant) q = q.ilike('merchant', `%${a.merchant.replace(/[%_]/g, '')}%`)
      if (a.category) q = q.eq('category', a.category)
      if (a.start_date) q = q.gte('transaction_date', a.start_date)
      if (a.end_date) q = q.lte('transaction_date', a.end_date)
      if (a.min_amount != null) q = q.gte('amount', a.min_amount)
      if (a.max_amount != null) q = q.lte('amount', a.max_amount)
      const { data: rows, count, error } = await q
        .order('transaction_date', { ascending: false, nullsFirst: false })
        .range(a.offset, a.offset + a.limit - 1)
      if (error) return fail(`Query failed: ${error.message}`)
      const list = rows ?? []
      if (list.length === 0) return text('No transactions match. Try a shorter merchant string or a wider date range.')
      const sum = list.reduce((s, r) => s + Number(r.amount), 0)
      const total = count ?? list.length
      const next = a.offset + list.length
      const body = [
        `${total.toLocaleString()} matching transactions; showing ${a.offset + 1}–${next} (sum of shown: ${usd(sum, true)})`,
        '',
        '| Date | Merchant | Amount | Category | Account |',
        '|---|---|---|---|---|',
        ...list.map(r => `| ${(r.transaction_date ?? r.date ?? '').slice(0, 10)} | ${String(r.merchant ?? '').replace(/\|/g, '/').slice(0, 60)} | ${usd(Number(r.amount), true)} | ${r.category ?? ''} | ${String(r.account_name ?? '').slice(0, 40)} |`),
        ...(total > next ? ['', `More results: call again with offset=${next}.`] : []),
      ].join('\n')
      return text(body.slice(0, CHARACTER_LIMIT))
    },
  }),
  defineTool({
    name: 'micci_spending_by_category',
    title: 'Spending by category',
    description:
      'Net spend per category (charges minus refunds; card payments, transfers and income excluded) for a date range, optionally compared with the preceding period of equal length. Defaults to the last 30 days. Use for "where is my money going", "did dining go up", budget questions.',
    inputSchema: z.strictObject({
      start_date: z.iso.date().optional().describe('Inclusive start, YYYY-MM-DD (default: 30 days ago)'),
      end_date: z.iso.date().optional().describe('Inclusive end, YYYY-MM-DD (default: today)'),
      compare_previous: z.boolean().default(true).describe('Also show the previous period of the same length'),
    }),
    annotations: READ_ONLY,
    handler: async (a) => {
      const end = a.end_date ?? isoToday()
      const start = a.start_date ?? isoDaysAgo(30)
      if (start > end) return fail('start_date must be on or before end_date.')
      const span = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
      const prevEnd = new Date(Date.parse(start) - 86400000).toISOString().slice(0, 10)
      const prevStart = new Date(Date.parse(start) - span * 86400000).toISOString().slice(0, 10)
      const fetchFrom = a.compare_previous ? prevStart : start
      const rows: TxnRow[] = []
      for (let from = 0; ; from += 1000) {
        const { data: page, error } = await db().from('transactions')
          .select('transaction_date, amount, category, merchant')
          .gte('transaction_date', fetchFrom).lte('transaction_date', end)
          .order('transaction_date').range(from, from + 999)
        if (error) return fail(`Query failed: ${error.message}`)
        rows.push(...((page ?? []) as TxnRow[]))
        if (!page || page.length < 1000) break
      }
      const cur = spendByCategory(rows, start, end)
      const prev = a.compare_previous ? new Map(spendByCategory(rows, prevStart, prevEnd).map(c => [c.cat, c.net])) : null
      const total = cur.reduce((s, c) => s + c.net, 0)
      const prevTotal = prev ? [...prev.values()].reduce((s, v) => s + v, 0) : 0
      const lines = [
        `# Spending ${start} → ${end} (${span} days): **${usd(total)}**${prev ? ` vs ${usd(prevTotal)} in ${prevStart} → ${prevEnd}` : ''}`,
        '',
        prev ? '| Category | Spend | Txns | Previous | Change |' : '| Category | Spend | Txns |',
        prev ? '|---|---|---|---|---|' : '|---|---|---|',
        ...cur.map(c => {
          if (!prev) return `| ${c.cat} | ${usd(c.net)} | ${c.count} |`
          const p = prev.get(c.cat) ?? 0
          return `| ${c.cat} | ${usd(c.net)} | ${c.count} | ${usd(p)} | ${c.net - p >= 0 ? '+' : ''}${usd(c.net - p)} |`
        }),
      ]
      return text(lines.join('\n'))
    },
  }),
  defineTool({
    name: 'micci_recurring_charges',
    title: 'Recurring charges',
    description:
      'Subscriptions and bills detected from transactions (regular cadence + stable amount): monthly cost, last charge, price changes, and lapsed (stopped) services. Use for subscription audits, "what am I paying every month", negotiation targets. Note: old CSV-era and new Plaid-era merchant names can appear as separate rows for the same service.',
    inputSchema: z.strictObject({
      status: z.enum(['active', 'lapsed', 'all']).default('active').describe('Which charges to list'),
      kind: z.enum(['subscription', 'bill', 'all']).default('all').describe('Cancellable subscriptions vs fixed bills'),
    }),
    annotations: READ_ONLY,
    handler: async (a, ctx) => {
      const r = (await ctx.data()).recurring
      if (!r.hasData) return text('No transaction data to detect recurring charges from.')
      const pool = a.status === 'active' ? r.active : a.status === 'lapsed' ? r.lapsed : [...r.active, ...r.lapsed]
      const list = pool.filter(c => a.kind === 'all' || c.kind === a.kind)
      const lines = [
        `# Recurring charges (${a.status}, ${a.kind}) — data through ${r.dataEnd}`,
        `Active total ${usd(r.activeMonthlyTotal)}/mo (subscriptions ${usd(r.subsMonthlyTotal)}, bills ${usd(r.billsMonthlyTotal)}); ${r.creepCount} with price increases; ${r.zombieCount} still charging after a cancel decision.`,
        '',
        '| Name | Kind | $/mo | Cadence | Last charged | Last amount | Price change | Status |',
        '|---|---|---|---|---|---|---|---|',
        ...list.map(c => `| ${c.name} | ${c.kind} | ${usd(c.monthlyCost, true)} | ${c.cadence} | ${c.lastCharged} | ${usd(c.lastAmount, true)} | ${c.priceChangePct == null ? '—' : `${c.priceChangePct > 0 ? '+' : ''}${c.priceChangePct}%`} | ${c.status}${c.zombie ? ' ⚠ zombie' : ''} |`),
      ]
      return text(lines.join('\n').slice(0, CHARACTER_LIMIT))
    },
  }),
  defineTool({
    name: 'micci_debts',
    title: 'Debts & promo deadlines',
    description:
      'Every debt account (mortgage, HELOC, cards, loans) with balance, APR and minimum payment, plus 0% promo balances with expiry dates and HELOC capacity. Use for payoff-order, interest-cost and "what expires next" questions.',
    annotations: READ_ONLY,
    handler: async (_a, ctx) => {
      const d = await ctx.data()
      const debts = [...d.debts].sort((x, y) => y.rate - x.rate || y.balance - x.balance)
      // Raw bank detail (statement balance, due dates, APR buckets) for the
      // linked accounts; the merged table below already uses live balances.
      const since = new Date(Date.now() - 3 * 86400000).toISOString()
      const [{ data: liveAccts }, { data: liabs }] = await Promise.all([
        db().from('accounts').select('name, type, balance, updated_at')
          .in('type', ['credit card', 'mortgage', 'student', 'loan', 'line of credit', 'home equity'])
          .gte('updated_at', since).order('balance', { ascending: false }),
        db().from('plaid_liabilities').select('*'),
      ])
      const liabByName = new Map((liabs ?? []).map(l => [l.account_name, l]))
      const live = (liveAccts ?? []).map(a => {
        const l = liabByName.get(a.name)
        const purchaseApr = Array.isArray(l?.aprs) ? (l.aprs as { apr_type: string; apr_percentage: number }[]).find(x => x.apr_type === 'purchase_apr')?.apr_percentage : undefined
        const promo = Array.isArray(l?.aprs) ? (l.aprs as { apr_type: string; apr_percentage: number; balance_subject_to_apr?: number }[]).filter(x => x.apr_type === 'balance_transfer_apr' || x.apr_type === 'special') : []
        return `| ${a.name} | ${usd(Number(a.balance), true)} | ${l ? `${usd(l.last_statement_balance, true)} (${l.last_statement_date ?? '—'})` : '—'} | ${l?.minimum_payment != null ? usd(l.minimum_payment, true) : '—'} | ${l?.next_payment_due_date ?? '—'} | ${l?.interest_rate ?? purchaseApr ?? '—'}${promo.length ? `; promo ${promo.map(x => `${x.apr_percentage}% on ${usd(x.balance_subject_to_apr ?? null)}`).join(', ')}` : ''} | ${String(a.updated_at).slice(0, 10)} |`
      })
      const monthlyInterest = debts.reduce((s, x) => s + x.balance * x.rate / 100 / 12, 0)
      const lines = [
        ...(live.length ? [
          '# Bank detail (Plaid, synced daily)',
          '| Account | Current balance | Last statement | Min due | Due date | APR | Synced |',
          '|---|---|---|---|---|---|---|',
          ...live,
          '',
          'Card current balance includes this cycle\'s purchases; cards paid in full monthly will show a balance until the statement is paid.',
          '',
        ] : []),
        `# All debts — live bank balance where linked, manual otherwise — total ${usd(d.debts.reduce((s, x) => s + x.balance, 0))} (≈ ${usd(monthlyInterest)}/mo interest at stated APRs)`,
        '',
        '| Account | Type | Balance | Source | APR | Min/mo | Plan |',
        '|---|---|---|---|---|---|---|',
        ...debts.map(x => `| ${x.name} | ${x.category} | ${usd(x.balance, true)} | ${x.source === 'live' ? `live ${x.asOf ?? ''}` : `manual ${x.asOf ?? ''}${x.stale ? ' **STALE**' : ''}`}${x.manualBalance != null ? ` (manual says ${usd(x.manualBalance, true)})` : ''} | ${x.rateUnknown ? '?' : `${x.rate}%`} | ${usd(x.min)} | ${x.decision} |`),
        '',
        'STALE = hand-entered balance not updated in 14+ days; ask Brandon for a current number before relying on it.',
        '',
        '## 0% promo balances',
        ...(d.promos.length
          ? [...d.promos].sort((x, y) => x.expires.localeCompare(y.expires)).map(p => `- ${p.name}: ${usd(p.balance)} expires **${day(p.expires)}**${p.risk ? ` — deferred interest at risk ${usd(p.risk)}` : ''}${p.note ? ` (${p.note})` : ''}`)
          : ['- None']),
        '',
        `HELOC limit ${usd(d.helocKPIs.limit)} @ ${d.helocKPIs.rate}%.`,
      ]
      return text(lines.join('\n'))
    },
  }),
  defineTool({
    name: 'micci_job_offers',
    title: 'Job offers compared',
    description:
      "Brandon's job offers (accepted, pending, prospective) with gross and net pay per check and per month (W-2 tax math, Texas), and how each one changes the cash projection: first check, cash low point, monthly surplus. Use to compare offers (e.g. Southwest vs Schwab) or answer 'what will I take home'.",
    annotations: READ_ONLY,
    handler: async (_a, ctx) => {
      const d = await ctx.data()
      if (d.offers.length === 0) return text('No job offers saved yet (financial_settings.job_offers is empty).')
      const liquid = d.assets.cash + d.assets.savings
      const spend = d.burnAnalysis.hasData ? d.burnAnalysis.monthlySpend : d.incomeBridge.monthlyOutflow
      const sections = d.offers.map(p => {
        const o = p.offer
        const r = computeRunwayProjection(liquid, spend, 0, null, new Date(), {
          employer: o.employer, firstPayday: o.firstPayday, periodDays: p.periodDays,
          netPerCheck: p.netPerCheckEarly, monthlyNet: p.monthlyNetAvg,
        })
        return [
          `## ${o.employer}${o.title ? ` — ${o.title}` : ''} (${o.status})`,
          `- Terms: ${o.kind === 'hourly' ? `${usd(o.hourlyRate)}/hr × ${o.hoursPerWeek ?? 40} hrs/wk` : `${usd(o.annualSalary)} salary${o.bonusPct ? ` + ${o.bonusPct}% bonus` : ''}`}, ${o.employment.toUpperCase()}, ${o.payFrequency === 26 ? 'biweekly' : `${o.payFrequency}×/yr`}; starts ${day(o.startDate)}, first check ${day(o.firstPayday)}`,
          `- Gross: ${usd(p.result.grossPay, true)}/check · ${usd(p.annualGross)}/yr`,
          `- Net: **${usd(p.netPerCheckEarly, true)}/check** early in the year (before the Social Security cap), ${usd(p.netPerCheckAvg, true)} average · **${usd(p.monthlyNetAvg)}/mo** average`,
          `- Taxes/yr: federal ${usd(p.result.federalTaxAnnual)}, Social Security ${usd(p.result.socialSecurityAnnual)}, Medicare ${usd(p.result.medicareAnnual)} (effective ${(p.result.effectiveTotalTaxRate * 100).toFixed(1)}%)`,
          r.employment ? `- With current cash (${usd(liquid)}) and spend (${usd(spend)}/mo): low point ${usd(r.employment.lowPointCash)} on ${day(r.employment.lowPointDate)}, then ${r.employment.monthlySurplus >= 0 ? '+' : ''}${usd(r.employment.monthlySurplus)}/mo${r.cashOutDate ? `; ⚠ cash runs out ${day(r.cashOutDate)} before pay catches up` : ''}` : '',
          o.notes ? `- Notes: ${o.notes}` : '',
        ].filter(Boolean).join('\n')
      })
      return text([`# Job offers (${d.offers.length})`, '', ...sections].join('\n\n'))
    },
  }),
  defineTool({
    name: 'micci_project_runway',
    title: 'What-if cash projection',
    description:
      "Re-run the day-by-day cash projection with what-if changes: a different monthly spend, a one-time cash change now (e.g. -3000 to pay off a card, +5000 for a bonus), a different first payday, or no job income. Returns cash low point, monthly surplus and cash-out date. Example: 'what if I pay $5K toward the HELOC before my first check?' → cash_adjustment=-5000.",
    inputSchema: z.strictObject({
      monthly_spend: z.number().min(0).max(100000).optional().describe('Override monthly spend in dollars (default: real 90-day spend)'),
      cash_adjustment: z.number().min(-1000000).max(1000000).default(0).describe('One-time change to liquid cash today; negative = money out'),
      offer_id: z.string().max(40).optional().describe("Model this offer's pay instead of the accepted one, e.g. 'schwab'; 'none' for no job income"),
      first_payday: z.iso.date().optional().describe('Override the first payday, YYYY-MM-DD'),
    }),
    annotations: READ_ONLY,
    handler: async (a, ctx) => {
      const d = await ctx.data()
      const liquid = d.assets.cash + d.assets.savings + a.cash_adjustment
      const realSpend = d.burnAnalysis.hasData ? d.burnAnalysis.monthlySpend : d.incomeBridge.monthlyOutflow
      const spend = a.monthly_spend ?? realSpend
      let pay = a.offer_id === 'none' ? null
        : d.offers.find(p => (a.offer_id ? p.offer.id === a.offer_id : p.offer.status === 'accepted')) ?? null
      if (a.offer_id && a.offer_id !== 'none' && !pay) {
        return fail(`No offer with id '${a.offer_id}'. Known ids: ${d.offers.map(p => p.offer.id).join(', ') || 'none'}.`)
      }
      if (pay && a.first_payday) pay = offerPaycheck({ ...pay.offer, firstPayday: a.first_payday } as JobOffer)
      const r = computeRunwayProjection(liquid, spend, 0, null, new Date(), pay ? {
        employer: pay.offer.employer, firstPayday: pay.offer.firstPayday, periodDays: pay.periodDays,
        netPerCheck: pay.netPerCheckEarly, monthlyNet: pay.monthlyNetAvg,
      } : null)
      return text([
        '# What-if projection',
        `Assumptions: liquid cash ${usd(liquid)}${a.cash_adjustment ? ` (after ${a.cash_adjustment > 0 ? '+' : ''}${usd(a.cash_adjustment)} today)` : ''}, spend ${usd(spend)}/mo${a.monthly_spend != null ? ` (real: ${usd(realSpend)})` : ' (real 90-day)'}, income: ${pay ? `${pay.offer.employer} from ${day(pay.offer.firstPayday)}` : 'none'}.`,
        '',
        ...runwayLines(r, liquid),
      ].join('\n'))
    },
  }),
  defineTool({
    name: 'micci_portfolio',
    title: 'Investment portfolio',
    description:
      "Brandon's tracked investment positions (Chase self-directed IRA, price-refreshed daily) with value, cost basis, gain/loss and weights, plus target allocations if set. Use for allocation, concentration and performance questions.",
    annotations: READ_ONLY,
    handler: async () => {
      const [{ data: pos, error }, { data: tgt }] = await Promise.all([
        db().from('portfolio_positions').select('*').order('current_value', { ascending: false }),
        db().from('portfolio_targets').select('*'),
      ])
      if (error) return fail(`Query failed: ${error.message}`)
      const rows = pos ?? []
      if (rows.length === 0) return text('No portfolio positions imported yet.')
      const total = rows.reduce((s, r) => s + Number(r.current_value ?? 0), 0)
      const cost = rows.reduce((s, r) => s + Number(r.cost_basis ?? 0), 0)
      const updated = rows.reduce<string>((m, r) => (r.updated_at && r.updated_at > m ? r.updated_at : m), '')
      return text([
        `# Portfolio — ${usd(total)} (cost ${usd(cost)}, ${total - cost >= 0 ? '+' : ''}${usd(total - cost)} / ${cost ? (((total - cost) / cost) * 100).toFixed(1) : '0'}%), prices as of ${day(updated)}`,
        '',
        '| Ticker | Shares | Value | Cost | Gain | Weight |',
        '|---|---|---|---|---|---|',
        ...rows.map(r => {
          const v = Number(r.current_value ?? 0), c = Number(r.cost_basis ?? 0)
          return `| ${r.ticker} | ${r.quantity ?? r.shares ?? '—'} | ${usd(v)} | ${usd(c)} | ${v - c >= 0 ? '+' : ''}${usd(v - c)} | ${total ? ((v / total) * 100).toFixed(1) : 0}% |`
        }),
        ...(tgt && tgt.length ? ['', '## Targets', ...tgt.map(t => `- ${t.ticker ?? t.asset_class ?? t.name}: ${t.target_pct}%`)] : []),
      ].join('\n'))
    },
  }),
]
