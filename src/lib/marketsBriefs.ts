// ───────────────────────────────────────────────────────────────────────────
// Markets bot briefs — types + pure normalizers for /markets.
//
// Writer: the Stocks & ETFs Grok bot, which upserts one row per
// (brief_type, brief_date) into `public.markets_bot_briefs` (weekdays
// ~7:00 AM CT pre-market, ~3:30 PM CT close). Micci-OS only READS that table;
// this feature never touches the finance/portfolio tables or the shared
// `briefs` hub.
//
// `portfolio_snapshot` is deliberately loose JSON (holdings rotate without
// migrations), and the bot's early rows don't match the documented shape
// exactly — prices as bare numbers, `vs_cost_pct` instead of
// `vs_cost_upl_pct`, etc. Everything here tolerates both so the UI never
// hardcodes a ticker list or breaks on a missing key.
// ───────────────────────────────────────────────────────────────────────────

export const MARKETS_BRIEF_TYPES = ['pre_market', 'close'] as const
export type MarketsBriefType = (typeof MARKETS_BRIEF_TYPES)[number]

export const BRIEF_TYPE_LABEL: Record<MarketsBriefType, string> = {
  pre_market: 'Pre-market',
  close: 'Close',
}

export const BRIEF_TYPE_SCHEDULE: Record<MarketsBriefType, string> = {
  pre_market: 'Weekdays ~7:00 AM CT',
  close: 'Weekdays ~3:30 PM CT',
}

export type MarketsBriefStatus = 'ok' | 'partial' | 'failed'
export type ActionBias = 'hold' | 'watch' | 'trim' | 'add'

export const isBriefType = (v: unknown): v is MarketsBriefType =>
  typeof v === 'string' && (MARKETS_BRIEF_TYPES as readonly string[]).includes(v)

/** Row as stored. JSON columns are `unknown` until normalized. */
export interface MarketsBriefRow {
  id: string
  brief_type: string
  brief_date: string
  title: string | null
  body_md: string | null
  highlights: unknown
  portfolio_snapshot: unknown
  sources: unknown
  account_mask: string | null
  as_of: string | null
  status: string | null
  action_bias: string | null
  created_at: string | null
}

/** Lightweight row for the history list. */
export type MarketsBriefEdition = Pick<
  MarketsBriefRow,
  'id' | 'brief_type' | 'brief_date' | 'title' | 'status' | 'action_bias'
>

export interface PriceRow {
  ticker: string
  px: number | null
  dayPct: number | null
  vsCostPct: number | null
}

export interface SnapshotView {
  accountEst: number | null
  cash: number | null
  dayPct: number | null
  uplPct: number | null
  qqqWeightPct: number | null
  qqqSmhWeightPct: number | null
  asOfLabel: string | null
  accountMask: string | null
  prices: PriceRow[]
  futures: { symbol: string; value: number }[]
  flags: { key: string; value: string }[]
  movers: string[]
}

export interface BriefSource { label: string; url: string | null }

export interface MarketsBriefView {
  id: string
  type: MarketsBriefType
  date: string
  title: string
  body: string
  highlights: string[]
  sources: BriefSource[]
  status: MarketsBriefStatus
  bias: ActionBias | null
  asOf: string | null
  accountMask: string | null
  snapshot: SnapshotView | null
  isTest: boolean
  createdAt: string | null
}

// ── primitives ─────────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/[$,%\s]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** First numeric value among candidate keys (documented key first). */
function pick(o: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const n = num(o[k])
    if (n !== null) return n
  }
  return null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

// ── normalizers ────────────────────────────────────────────────────────────

/**
 * The bot sometimes double-escapes newlines (literal `\n` in the text). If the
 * body has escaped newlines but no real ones, unescape them.
 */
export function normalizeBody(body: string | null | undefined): string {
  if (!body) return ''
  if (!body.includes('\n') && body.includes('\\n')) {
    return body.replace(/\\r\\n|\\n/g, '\n').replace(/\\t/g, '  ')
  }
  return body
}

export function normalizeHighlights(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map(h => (typeof h === 'string' ? h.trim() : isObj(h) ? str(h.text) ?? str(h.label) ?? '' : ''))
    .filter(Boolean)
}

export function normalizeSources(v: unknown): BriefSource[] {
  if (!Array.isArray(v)) return []
  const out: BriefSource[] = []
  for (const s of v) {
    if (!isObj(s)) continue
    const url = str(s.url)
    const safeUrl = url && /^https?:\/\//i.test(url) ? url : null
    const label = str(s.label) ?? str(s.title) ?? safeUrl
    if (label) out.push({ label, url: safeUrl })
  }
  return out
}

/** Price entries may be `{ px, day_pct, vs_cost_pct }` or a bare number. */
export function normalizePrices(v: unknown): PriceRow[] {
  if (!isObj(v)) return []
  return Object.entries(v)
    .map(([ticker, raw]): PriceRow => {
      if (isObj(raw)) {
        return {
          ticker,
          px: pick(raw, 'px', 'price', 'last'),
          dayPct: pick(raw, 'day_pct', 'change_pct', 'pct'),
          vsCostPct: pick(raw, 'vs_cost_pct', 'upl_pct'),
        }
      }
      return { ticker, px: num(raw), dayPct: null, vsCostPct: null }
    })
    .filter(r => r.px !== null || r.dayPct !== null || r.vsCostPct !== null)
}

function formatFlag(v: unknown): string | null {
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  return str(v)
}

export function normalizeSnapshot(v: unknown, fallbackMask: string | null = null): SnapshotView | null {
  if (!isObj(v)) return null

  const prices = normalizePrices(v.prices)
  const futures = isObj(v.futures)
    ? Object.entries(v.futures)
        .map(([symbol, val]) => ({ symbol, value: num(val) }))
        .filter((f): f is { symbol: string; value: number } => f.value !== null)
    : []
  // TNX (10Y yield) rides along as a top-level key on some rows — show it with futures.
  const tnx = num(v.tnx)
  if (tnx !== null && !futures.some(f => f.symbol.toUpperCase() === 'TNX')) {
    futures.push({ symbol: '10Y', value: tnx })
  }
  const flags = isObj(v.flags)
    ? Object.entries(v.flags)
        .map(([key, val]) => ({ key, value: formatFlag(val) }))
        .filter((f): f is { key: string; value: string } => f.value !== null)
    : []
  const movers = Array.isArray(v.movers)
    ? v.movers
        .map(m => (typeof m === 'string' ? m : isObj(m) ? [str(m.ticker), str(m.note) ?? (num(m.day_pct) !== null ? `${num(m.day_pct)}%` : null)].filter(Boolean).join(' ') : ''))
        .filter(Boolean)
    : []

  const view: SnapshotView = {
    accountEst: pick(v, 'account_est', 'account_value'),
    cash: pick(v, 'cash'),
    dayPct: pick(v, 'vs_prior_close_pct', 'day_pct', 'fri_change_pct', 'change_pct'),
    uplPct: pick(v, 'vs_cost_upl_pct', 'vs_cost_pct', 'upl_pct'),
    qqqWeightPct: pick(v, 'qqq_weight_pct'),
    qqqSmhWeightPct: pick(v, 'qqq_smh_weight_pct'),
    asOfLabel: str(v.as_of),
    accountMask: fallbackMask ?? str(v.account_mask),
    prices,
    futures,
    flags,
    movers,
  }

  const hasData = view.accountEst !== null || view.dayPct !== null || view.uplPct !== null
    || prices.length > 0 || futures.length > 0 || flags.length > 0 || movers.length > 0
  return hasData ? view : null
}

/** Setup noise the handoff says to hide: test titles and failed runs. */
export function isTestBrief(row: Pick<MarketsBriefRow, 'title' | 'status'>): boolean {
  return /^\s*test/i.test(row.title ?? '') || row.status === 'failed'
}

const STATUSES: MarketsBriefStatus[] = ['ok', 'partial', 'failed']
const BIASES: ActionBias[] = ['hold', 'watch', 'trim', 'add']

export function normalizeBrief(row: MarketsBriefRow): MarketsBriefView | null {
  if (!isBriefType(row.brief_type)) return null
  const status = (STATUSES as string[]).includes(row.status ?? '') ? (row.status as MarketsBriefStatus) : 'ok'
  const biasRaw = row.action_bias?.toLowerCase() ?? ''
  const bias = (BIASES as string[]).includes(biasRaw) ? (biasRaw as ActionBias) : null
  const snapshot = normalizeSnapshot(row.portfolio_snapshot, str(row.account_mask))
  return {
    id: row.id,
    type: row.brief_type,
    date: row.brief_date,
    title: str(row.title) ?? `${BRIEF_TYPE_LABEL[row.brief_type]} brief`,
    body: normalizeBody(row.body_md),
    highlights: normalizeHighlights(row.highlights),
    sources: normalizeSources(row.sources),
    status,
    bias,
    asOf: str(row.as_of),
    accountMask: str(row.account_mask) ?? snapshot?.accountMask ?? null,
    snapshot,
    isTest: isTestBrief(row),
    createdAt: row.created_at,
  }
}

/** Today's calendar date in America/Chicago, as YYYY-MM-DD. */
export function chicagoToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

export const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

// ── inline markdown ────────────────────────────────────────────────────────

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; url: string }

/** Tokenizes `**bold**`, `` `code` `` and `[label](https://…)`. */
export function tokenizeInline(s: string): InlineToken[] {
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  const out: InlineToken[] = []
  let last = 0
  for (const m of s.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) out.push({ kind: 'text', text: s.slice(last, i) })
    if (m[1] !== undefined) out.push({ kind: 'bold', text: m[1] })
    else if (m[2] !== undefined) out.push({ kind: 'code', text: m[2] })
    else out.push({ kind: 'link', text: m[3], url: m[4] })
    last = i + m[0].length
  }
  if (last < s.length) out.push({ kind: 'text', text: s.slice(last) })
  return out
}

export type MdBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }

/** Minimal block-level markdown: headings, bullet/numbered lists, paragraphs. */
export function parseMarkdown(md: string): MdBlock[] {
  const blocks: MdBlock[] = []
  let para: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flushPara = () => { if (para.length) { blocks.push({ kind: 'para', text: para.join(' ') }); para = [] } }
  const flushList = () => { if (list) { blocks.push({ kind: 'list', ...list }); list = null } }

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd()
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line)
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (!line.trim()) { flushPara(); flushList(); continue }
    if (h) { flushPara(); flushList(); blocks.push({ kind: 'heading', level: h[1].length, text: h[2] }); continue }
    if (ul || ol) {
      flushPara()
      const ordered = !!ol
      if (list && list.ordered !== ordered) flushList()
      if (!list) list = { ordered, items: [] }
      list.items.push((ul ?? ol)![1])
      continue
    }
    flushList()
    para.push(line.trim())
  }
  flushPara(); flushList()
  return blocks
}
