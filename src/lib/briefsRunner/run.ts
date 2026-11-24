// ───────────────────────────────────────────────────────────────────────────
// API-key briefs runner (OFF by default; docs/BRIEFS_RUNNER.md).
//
// The weekday Claude routine is the live path. This is the same job done with
// an Anthropic API key, kept behind BRIEFS_API_ENABLED so the cost can be
// measured before anything switches over. Order of checks, all fail closed:
//   1. config (flag, key, model allow list, limits)
//   2. a service client (never the hardcoded fallback data)
//   3. this month's logged spend + the worst case of this run under the cap
// Then each brief: one call, validated with zod, written only if valid, and
// every call's real usage logged to brief_runs.
// ───────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getFinancialData } from '../financial-data-service'
import { loadMoneyBriefInputs } from '../finance/moneyBriefLoader'
import { renderMoneyBriefInputs } from '../finance/moneyBrief'
import { checkBudget, estimateCostUsd, monthStartIso, readRunnerConfig, worstCaseRunUsd, type RunnerConfig, type UsageLike } from './guard'
import { AI_PROMPT, MARKETS_PROMPT, MONEY_PROMPT, SHARED_RULES } from './prompts'
import { BriefDocSchema, MarketsDocSchema, extractJson } from './schema'
import { holdingsLines, snapshotFromPositions, type PositionRow } from './portfolio'

type Tab = 'money' | 'ai' | 'markets'
const SEARCH_TABS: Tab[] = ['ai', 'markets']
/** Resume a paused server-tool turn at most this many times. */
const MAX_CONTINUATIONS = 2

export interface TabResult { tab: Tab; status: 'ok' | 'failed'; costUsd: number; error?: string }
export type RunResult =
  | { ran: false; reason: string }
  | { ran: true; results: TabResult[]; spentBeforeUsd: number }

const isoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())

async function monthSpend(service: SupabaseClient, today: string): Promise<number | null> {
  const { data, error } = await service.from('brief_runs').select('cost_usd').gte('ran_at', monthStartIso(today))
  if (error || !data) return null // table missing or unreadable: fail closed
  return data.reduce((s, r) => s + Number((r as { cost_usd: number }).cost_usd ?? 0), 0)
}

async function guidance(service: SupabaseClient, tab: Tab): Promise<{ text: string; tweakIds: string[] }> {
  const [{ data: cfg }, { data: tweaks }] = await Promise.all([
    service.from('brief_config').select('text').eq('tab', tab).maybeSingle(),
    service.from('brief_tweaks').select('id, kind, section, text').eq('tab', tab).eq('status', 'open').limit(20),
  ])
  const lines: string[] = []
  const standing = (cfg as { text?: string } | null)?.text?.trim()
  if (standing) lines.push(`Standing guidance from Brandon:\n${standing.slice(0, 2000)}`)
  const t = (tweaks ?? []) as { id: string; kind: string; section: string | null; text: string }[]
  if (t.length) lines.push('His notes on earlier editions (apply them):\n' + t.map(x => `- [${x.kind}${x.section ? `, ${x.section}` : ''}] ${x.text.slice(0, 300)}`).join('\n'))
  return { text: lines.join('\n\n'), tweakIds: t.map(x => x.id) }
}

interface CallOut { text: string; usage: UsageLike[] }

async function callModel(client: Anthropic, c: RunnerConfig, system: string, user: string, search: boolean): Promise<CallOut> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: user }]
  const usage: UsageLike[] = []
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const res = await client.messages.create({
      model: c.model,
      max_tokens: c.maxTokensPerCall,
      thinking: { type: 'disabled' },
      system,
      messages,
      ...(search ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: c.maxSearchesPerCall }] } : {}),
    })
    usage.push(res.usage as UsageLike)
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content })
      continue
    }
    if (res.stop_reason === 'refusal') throw new Error('model declined')
    if (res.stop_reason === 'max_tokens') throw new Error('hit max_tokens before finishing')
    const text = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')
    return { text, usage }
  }
  throw new Error('still paused after the continuation limit')
}

async function logRun(service: SupabaseClient, row: Record<string, unknown>) {
  const { error } = await service.from('brief_runs').insert(row)
  if (error) console.error('[briefs runner] could not log run', error.message)
}

export async function runBriefs(env: Record<string, string | undefined> = process.env): Promise<RunResult> {
  const cfg = readRunnerConfig(env)
  if (!cfg.ok) return { ran: false, reason: cfg.reason }
  const c = cfg.config

  const { createServiceClient } = await import('../supabase/service')
  const service = createServiceClient()
  if (!service) return { ran: false, reason: 'no Supabase service client (would fall back to sample data)' }

  const today = isoToday()
  const spent = await monthSpend(service, today)
  const budget = checkBudget(c, spent, worstCaseRunUsd(c, 3, SEARCH_TABS.length))
  if (!budget.go) return { ran: false, reason: budget.reason }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const results: TabResult[] = []

  const run = async (tab: Tab, prompt: string, data: string, write: (json: unknown, meta: Record<string, unknown>) => Promise<void>) => {
    let usage: UsageLike[] = []
    const g = await guidance(service, tab)
    try {
      const system = `${SHARED_RULES}\n\n${prompt}${g.text ? `\n\n${g.text}` : ''}`
      const out = await callModel(client, c, system, `Today is ${today}.\n\n<data>\n${data}\n</data>`, SEARCH_TABS.includes(tab))
      usage = out.usage
      const cost = usage.reduce((s, u) => s + estimateCostUsd(c.model, u), 0)
      const meta = {
        model: c.model,
        input_tokens: usage.reduce((s, u) => s + u.input_tokens, 0),
        output_tokens: usage.reduce((s, u) => s + u.output_tokens, 0),
        searches: usage.reduce((s, u) => s + (u.server_tool_use?.web_search_requests ?? 0), 0),
        cost_usd: Math.round(cost * 10000) / 10000,
      }
      await write(extractJson(out.text), meta)
      if (g.tweakIds.length) await service.from('brief_tweaks').update({ status: 'applied', applied_at: new Date().toISOString() }).in('id', g.tweakIds)
      await logRun(service, { tab, status: 'ok', ...meta })
      results.push({ tab, status: 'ok', costUsd: meta.cost_usd })
    } catch (err) {
      const cost = usage.reduce((s, u) => s + estimateCostUsd(c.model, u), 0)
      const msg = err instanceof Error ? err.message : String(err)
      await logRun(service, {
        tab, status: 'failed', model: c.model, error: msg.slice(0, 500),
        input_tokens: usage.reduce((s, u) => s + u.input_tokens, 0),
        output_tokens: usage.reduce((s, u) => s + u.output_tokens, 0),
        searches: usage.reduce((s, u) => s + (u.server_tool_use?.web_search_requests ?? 0), 0),
        cost_usd: Math.round(cost * 10000) / 10000,
      })
      results.push({ tab, status: 'failed', costUsd: cost, error: msg })
    }
  }

  const writeBrief = (tab: 'money' | 'ai') => async (json: unknown, meta: Record<string, unknown>) => {
    const doc = BriefDocSchema.parse(json)
    const { error } = await service.rpc('upsert_brief', {
      p_tab: tab,
      p_doc_key: today,
      p_doc: { ...doc, date: today, source: 'api-runner', run_meta: meta },
    })
    if (error) throw new Error(`upsert_brief failed: ${error.message}`)
  }

  // Money: no tools, all numbers come from the app's own finance code.
  const fin = await getFinancialData()
  const moneyData = renderMoneyBriefInputs(await loadMoneyBriefInputs(fin, service, today))
  await run('money', MONEY_PROMPT, moneyData, writeBrief('money'))

  // AI News: web search only.
  await run('ai', AI_PROMPT, 'No local data; search the web.', writeBrief('ai'))

  // Markets: holdings from the database, the snapshot built here, not by the model.
  const { data: positions } = await service.from('portfolio_positions')
    .select('ticker, name, shares, current_price, current_value, cost_basis, day_change_pct, is_cash, updated_at')
  const snapshot = snapshotFromPositions((positions ?? []) as PositionRow[])
  await run('markets', MARKETS_PROMPT, holdingsLines(snapshot), async (json, meta) => {
    const m = MarketsDocSchema.parse(json)
    const { error } = await service.from('markets_bot_briefs').upsert({
      brief_type: 'pre_market',
      brief_date: today,
      title: m.title,
      body_md: m.body_md,
      highlights: m.highlights,
      sources: m.sources,
      action_bias: m.action_bias,
      portfolio_snapshot: snapshot ?? {},
      as_of: new Date().toISOString(),
      status: 'ok',
    }, { onConflict: 'brief_type,brief_date' })
    if (error) throw new Error(`markets upsert failed: ${error.message}`)
    void meta
  })

  return { ran: true, results, spentBeforeUsd: spent ?? 0 }
}
