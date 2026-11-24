// Holdings for the pre-market brief, built in code from portfolio_positions so
// the model never has to copy numbers into the snapshot. The shape matches what
// normalizeSnapshot() in lib/marketsBriefs.ts reads.

export interface PositionRow {
  ticker: string | null
  name?: string | null
  shares?: number | string | null
  current_price?: number | string | null
  current_value?: number | string | null
  cost_basis?: number | string | null
  day_change_pct?: number | string | null
  is_cash?: boolean | null
  updated_at?: string | null
}

const n = (v: unknown): number => {
  const x = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(x) ? x : 0
}
const r2 = (x: number) => Math.round(x * 100) / 100

export interface PortfolioSnapshot {
  account_est: number
  cash: number
  vs_cost_upl_pct: number | null
  day_pct: number | null
  as_of: string | null
  prices: Record<string, { px: number; day_pct: number | null; vs_cost_pct: number | null }>
}

export function snapshotFromPositions(rows: PositionRow[]): PortfolioSnapshot | null {
  const held = rows.filter(r => r.ticker && n(r.current_value) > 0)
  if (held.length === 0) return null
  const total = held.reduce((s, r) => s + n(r.current_value), 0)
  const cash = held.filter(r => r.is_cash).reduce((s, r) => s + n(r.current_value), 0)
  const invested = held.filter(r => !r.is_cash)
  const cost = invested.reduce((s, r) => s + n(r.cost_basis), 0)
  const value = invested.reduce((s, r) => s + n(r.current_value), 0)
  // Value-weighted day change over positions that report one.
  const withDay = invested.filter(r => r.day_change_pct != null && r.day_change_pct !== '')
  const dayBase = withDay.reduce((s, r) => s + n(r.current_value), 0)
  const dayPct = dayBase > 0 ? withDay.reduce((s, r) => s + n(r.day_change_pct) * n(r.current_value), 0) / dayBase : null
  const asOf = held.reduce<string>((m, r) => (r.updated_at && r.updated_at > m ? r.updated_at : m), '')
  const prices: PortfolioSnapshot['prices'] = {}
  for (const r of [...invested].sort((a, b) => n(b.current_value) - n(a.current_value)).slice(0, 15)) {
    const c = n(r.cost_basis)
    prices[r.ticker!] = {
      px: r2(n(r.current_price)),
      day_pct: r.day_change_pct != null && r.day_change_pct !== '' ? r2(n(r.day_change_pct)) : null,
      vs_cost_pct: c > 0 ? r2(((n(r.current_value) - c) / c) * 100) : null,
    }
  }
  return {
    account_est: r2(total),
    cash: r2(cash),
    vs_cost_upl_pct: cost > 0 ? r2(((value - cost) / cost) * 100) : null,
    day_pct: dayPct == null ? null : r2(dayPct),
    as_of: asOf ? asOf.slice(0, 16).replace('T', ' ') + ' UTC' : null,
    prices,
  }
}

/** One line per holding for the prompt. */
export function holdingsLines(s: PortfolioSnapshot | null): string {
  if (!s) return 'No holdings on file.'
  return [
    `Account ≈ $${s.account_est.toLocaleString('en-US')} (cash $${s.cash.toLocaleString('en-US')}), vs cost ${s.vs_cost_upl_pct ?? '—'}%, prices as of ${s.as_of ?? 'unknown'}`,
    ...Object.entries(s.prices).map(([t, p]) => `- ${t}: $${p.px}${p.day_pct != null ? `, last day ${p.day_pct}%` : ''}${p.vs_cost_pct != null ? `, vs cost ${p.vs_cost_pct}%` : ''}`),
  ].join('\n')
}
