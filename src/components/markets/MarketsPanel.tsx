import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  MarketsBriefDetail, TypeToggle, HistoryList, fmtBriefDate, type HistoryDay,
} from '@/components/markets/MarketsBrief'
import {
  BRIEF_TYPE_LABEL, BRIEF_TYPE_SCHEDULE, chicagoToday, isBriefType, isIsoDate, isTestBrief, normalizeBrief,
  type ActionBias, type MarketsBriefEdition, type MarketsBriefRow, type MarketsBriefStatus,
  type MarketsBriefType, type MarketsBriefView,
} from '@/lib/marketsBriefs'

// Markets tab of /briefs — briefs written by the Stocks & ETFs Grok bot.
//
// READ-ONLY, and ONLY from `public.markets_bot_briefs` — this page must never
// read or write the finance/portfolio tables (portfolio_*, plaid_*,
// financial_snapshots) or the shared `briefs` hub. The table's RLS allows the
// signed-in owner to SELECT, so this uses the session client, not the service
// role. The (app) layout's session proxy gates the page. (Was /markets, PR #51.)
const TABLE = 'markets_bot_briefs'

export default async function MarketsPanel({
  params,
}: {
  params: { d?: string; t?: string; tests?: string }
}) {
  const showTests = params.tests === '1'
  const today = chicagoToday()

  const href = (date: string, type?: MarketsBriefType) => {
    const q = new URLSearchParams({ tab: 'markets', d: date })
    if (type) q.set('t', type)
    if (showTests) q.set('tests', '1')
    return `/briefs?${q.toString()}`
  }

  let error: string | null = null
  let editions: MarketsBriefEdition[] = []
  let dayRows: MarketsBriefView[] = []

  const supabase = await createClient()
  const editionsRes = await supabase
    .from(TABLE)
    .select('id, brief_type, brief_date, title, status, action_bias')
    .order('brief_date', { ascending: false })
    .limit(120)
  if (editionsRes.error) error = editionsRes.error.message
  else editions = (editionsRes.data ?? []) as MarketsBriefEdition[]

  const visible = editions.filter(e => isBriefType(e.brief_type) && (showTests || !isTestBrief(e)))
  const hiddenTests = editions.length - visible.length

  // Selected date: ?d=, else today (CT) if it has a brief, else the newest brief.
  const datesWithBriefs = [...new Set(visible.map(e => e.brief_date))]
  const date = isIsoDate(params.d)
    ? params.d
    : datesWithBriefs.includes(today) ? today : (datesWithBriefs[0] ?? today)

  if (!error) {
    const { data, error: dayErr } = await supabase.from(TABLE).select('*').eq('brief_date', date)
    if (dayErr) error = dayErr.message
    else {
      dayRows = ((data ?? []) as MarketsBriefRow[])
        .map(normalizeBrief)
        .filter((b): b is MarketsBriefView => b !== null && (showTests || !b.isTest))
    }
  }

  const available = new Set(dayRows.map(b => b.type))
  // Selected type: ?t= if present, else close (the later brief) when it exists.
  const type: MarketsBriefType = isBriefType(params.t)
    ? params.t
    : available.has('close') ? 'close' : 'pre_market'
  const brief = dayRows.find(b => b.type === type) ?? null

  const days: HistoryDay[] = datesWithBriefs.slice(0, 30).map(d => ({
    date: d,
    types: visible
      .filter(e => e.brief_date === d)
      .sort((a, b) => (a.brief_type === 'pre_market' ? -1 : 1) - (b.brief_type === 'pre_market' ? -1 : 1))
      .map(e => ({
        type: e.brief_type as MarketsBriefType,
        title: e.title ?? BRIEF_TYPE_LABEL[e.brief_type as MarketsBriefType],
        bias: (['hold', 'watch', 'trim', 'add'].includes(e.action_bias ?? '') ? e.action_bias : null) as ActionBias | null,
        status: (['ok', 'partial', 'failed'].includes(e.status ?? '') ? e.status : 'ok') as MarketsBriefStatus,
        isTest: isTestBrief(e),
      })),
  }))

  const testsToggle = showTests
    ? <Link href={`/briefs?tab=markets&d=${date}`} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] underline decoration-dotted">Hide test rows</Link>
    : hiddenTests > 0
      ? <Link href={`/briefs?tab=markets&d=${date}&tests=1`} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] underline decoration-dotted">
          {hiddenTests} test row{hiddenTests === 1 ? '' : 's'} hidden · show
        </Link>
      : null

  return (
      <div className="space-y-4">
        <p className="text-[13px] text-[var(--text-secondary)]">Pre-market and close briefs from the Stocks &amp; ETFs bot · Chase SDIRA</p>
        <div className="flex flex-wrap items-center gap-3">
          <TypeToggle date={date} active={type} available={available} href={href} />
          <form action="/briefs" className="flex items-center gap-2">
            <input type="hidden" name="tab" value="markets" />
            <input
              type="date" name="d" defaultValue={date} max={today} aria-label="Brief date"
              className="text-[13px] rounded-md px-2.5 py-1.5 bg-black/30 text-[var(--text-primary)] outline-none [color-scheme:dark]"
            />
            {showTests && <input type="hidden" name="tests" value="1" />}
            <button type="submit" className="btn btn-ghost btn-sm">Go</button>
          </form>
          {date !== today && (
            <Link href={href(today)} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)]">Today</Link>
          )}
          <div className="ml-auto">{testsToggle}</div>
        </div>

        {error ? (
          <div className="glass-card p-5 text-[13px]" style={{ color: '#f87171' }}>
            Couldn’t load markets briefs: {error}
          </div>
        ) : brief ? (
          <MarketsBriefDetail brief={brief} />
        ) : (
          <div className="glass-card p-6 text-center">
            <p className="text-[14px] text-[var(--text-primary)]">
              No {BRIEF_TYPE_LABEL[type].toLowerCase()} brief for {fmtBriefDate(date)}.
            </p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              The bot writes {BRIEF_TYPE_SCHEDULE[type].toLowerCase()}.
              {available.size > 0 && ' The other brief for this date is available above.'}
            </p>
          </div>
        )}

        <HistoryList days={days} activeDate={date} href={href} />
      </div>
  )
}
