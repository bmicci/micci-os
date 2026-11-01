// ───────────────────────────────────────────────────────────────────────────
// Morning overview — the latest edition of every brief, as one headline each.
//
// Used by /briefs (overview), the dashboard's "This morning" strip and the
// section pages (/financial, /pipeline, /health). Sources:
//   · `briefs` (service client; deny-all RLS) — every tab the Routines and
//     Grok bots write through upsert_brief()
//   · `markets_bot_briefs` (session client; owner SELECT via RLS) — the
//     Stocks & ETFs Grok bot, which the Markets tab shows instead of `briefs`
// ───────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { BRIEF_TABS, type BriefBlock, type BriefTab, type TodayPayload } from '@/lib/briefs'
import { BRIEF_TYPE_LABEL, isBriefType, isTestBrief, normalizeHighlights } from '@/lib/marketsBriefs'

export interface BriefHeadline {
  tab: BriefTab
  label: string
  headline: string | null
  date: string | null
  /** Latest edition is from today (America/Chicago). */
  fresh: boolean
  /** Items the brief marked critical (or, for Today, people waiting on Brandon). */
  flags: number
  /** Written by a Grok bot rather than a Claude Routine. */
  grok: boolean
  /** Short context after the date, e.g. "Close · hold". */
  note: string | null
  href: string
}

interface BriefsRow {
  tab: string
  doc_key: string
  brief_date: string
  headline: string | null
  source: string | null
  blocks: BriefBlock[] | null
  payload: Record<string, unknown> | null
}

interface MarketsBotRow {
  brief_type: string
  brief_date: string
  title: string | null
  status: string | null
  action_bias: string | null
  highlights: unknown
  created_at: string
}

export function chicagoToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(now)
}

const shiftDay = (iso: string, days: number) => {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Critical items in a brief: tone "crit" on any kpi or list item; Today counts who is waiting on him. */
export function countFlags(tab: string, blocks: BriefBlock[] | null, payload: Record<string, unknown> | null): number {
  if (tab === 'today') {
    const counts = (payload as TodayPayload | null)?.sections?.counts
    return Number(counts?.waiting_on_me ?? 0) || 0
  }
  let n = 0
  for (const b of blocks ?? []) {
    if (b.type === 'kpis' || b.type === 'list') {
      for (const item of b.items ?? []) if (item.tone === 'crit') n++
    }
  }
  return n
}

/** Newest row per tab. Rows must arrive newest first (brief_date desc, doc_key desc). */
export function latestPerTab(rows: BriefsRow[]): Map<string, BriefsRow> {
  const out = new Map<string, BriefsRow>()
  for (const r of rows) if (!out.has(r.tab)) out.set(r.tab, r)
  return out
}

export async function loadBriefHeadlines(
  service: SupabaseClient | null,
  session: SupabaseClient | null,
  today: string = chicagoToday(),
): Promise<BriefHeadline[]> {
  const [briefsRes, marketsRes] = await Promise.all([
    service
      ? service.from('briefs')
          .select('tab, doc_key, brief_date, headline, source, blocks, payload')
          .gte('brief_date', shiftDay(today, -21))
          .order('brief_date', { ascending: false })
          .order('doc_key', { ascending: false })
          .limit(120)
      : Promise.resolve({ data: null }),
    session
      ? session.from('markets_bot_briefs')
          .select('brief_type, brief_date, title, status, action_bias, highlights, created_at')
          .order('brief_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: null }),
  ])

  const latest = latestPerTab((briefsRes.data ?? []) as BriefsRow[])
  const bot = ((marketsRes.data ?? []) as MarketsBotRow[])
    .find(r => isBriefType(r.brief_type) && r.status !== 'failed' && !isTestBrief(r)) ?? null

  return BRIEF_TABS.map(t => {
    const href = `/briefs?tab=${t.id}`
    if (t.id === 'markets' && bot) {
      const type = bot.brief_type as keyof typeof BRIEF_TYPE_LABEL
      return {
        tab: t.id, label: t.label, href,
        headline: bot.title ?? normalizeHighlights(bot.highlights)[0] ?? null,
        date: bot.brief_date,
        fresh: bot.brief_date === today,
        flags: bot.action_bias === 'trim' ? 1 : 0,
        grok: true,
        note: [BRIEF_TYPE_LABEL[type], bot.action_bias].filter(Boolean).join(' · '),
      }
    }
    const r = latest.get(t.id)
    return {
      tab: t.id, label: t.label, href,
      headline: r?.headline ?? null,
      date: r?.brief_date ?? null,
      fresh: r?.brief_date === today,
      flags: r ? countFlags(t.id, r.blocks, r.payload) : 0,
      grok: r ? (r.source === 'grok' || r.doc_key.endsWith('-grok')) : false,
      note: null,
    }
  })
}
