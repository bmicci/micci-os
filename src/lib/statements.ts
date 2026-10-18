// ───────────────────────────────────────────────────────────────────────────
// Statements pipeline — server-only.
//
// Card statements are the only place banks publish per-segment promo terms
// (each balance transfer's APR, remaining balance and promo end date,
// deferred interest). Plaid Liabilities gives APR buckets but not promo
// expiry, so promo_deadlines was hand-maintained. This closes that gap:
//
//   1. Daily Plaid sync lists + downloads statement PDFs (Plaid Statements)
//      into the private "statements" bucket. Manual upload lands in the same
//      place for banks Plaid can't pull from.
//   2. Claude reads each new PDF and extracts the balance segments.
//   3. The extraction is diffed against promo_deadlines into
//      statement_findings. NOTHING is written to promo_deadlines until the
//      user confirms a finding in /import ("Statement findings"). Promos are
//      marked paid, never deleted.
// ───────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { PlaidApi } from 'plaid'
import type { DbPlaidItem } from '@/lib/plaid'
import { diffStatementAgainstPromos, type PromoRow, type StatementExtraction, type StatementSegment } from '@/lib/finance/statementDiff'

export const STATEMENTS_BUCKET = 'statements'
const MODEL = 'claude-opus-5-5'
/** How far back the first sync downloads (later syncs only fetch new ones). */
const HISTORY_MONTHS = 6
/** Ask Plaid to look for a newer statement when the latest is this old. */
const REFRESH_AFTER_DAYS = 33
const MAX_DOWNLOADS_PER_RUN = 12

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Extraction schema ─────────────────────────────────────────────────────
const SegmentSchema = z.object({
  // Plain string (normalized below): the schema converter flattens enums
  // to a description, and one odd label must not fail the whole parse.
  type: z.string().describe('One of: purchase, balance_transfer, cash_advance, promo_purchase, other'),
  description: z.string().describe('Label exactly as printed, e.g. "BALANCE TRANSFER 07/15/25" or "Purchases"'),
  balance: z.number().describe('Balance subject to this rate at statement close, in dollars'),
  apr: z.number().nullable().describe('APR in percent for this segment (0 for a 0% promo)'),
  promo_end_date: z.string().nullable().describe('YYYY-MM-DD the promotional rate expires, if printed'),
  deferred_interest: z.number().nullable().describe('Accrued deferred interest that would be charged if not paid by the promo end, if printed'),
  transfer_date: z.string().nullable().describe('YYYY-MM-DD the transfer/promo started, if printed'),
})

const ExtractionSchema = z.object({
  is_card_statement: z.boolean().describe('false if this is not a credit card / revolving loan statement'),
  issuer: z.string().nullable(),
  account_name: z.string().nullable().describe('Card product name, e.g. "Freedom Unlimited"'),
  account_last4: z.string().nullable(),
  closing_date: z.string().nullable().describe('Statement closing date, YYYY-MM-DD'),
  new_balance: z.number().nullable(),
  minimum_payment: z.number().nullable(),
  payment_due_date: z.string().nullable().describe('YYYY-MM-DD'),
  credit_limit: z.number().nullable(),
  interest_charged: z.number().nullable().describe('Total interest charged this period'),
  fees_charged: z.number().nullable().describe('Total fees charged this period (incl. balance transfer fees)'),
  segments: z.array(SegmentSchema).describe('One entry per row of the "Interest Charge Calculation" (or equivalent) table, plus any promo/deferred-interest plan listed separately'),
  notes: z.string().nullable().describe('Anything that matters for promo payoff planning that does not fit above (e.g. a promo ending next cycle)'),
})

const SYSTEM_PROMPT = `You extract balance segments from US credit card statements for a personal finance app that tracks 0% promotional balances before they expire.

The owner relies on these numbers to avoid being charged interest, so accuracy matters more than completeness: if a value is not printed on the statement, return null rather than estimating it. Dates are YYYY-MM-DD.

The key table is usually titled "Interest Charge Calculation" (Chase, Citi, BofA) or "Interest Charged" / "Plan It" / "Promotional balances" (Amex, store cards). Return one segment per row, including $0 rows that show a promo end date. Balance transfers and promotional purchases often each have their own row with their own expiration date — keep them separate. For deferred-interest plans (store cards), report the accrued deferred interest amount and the date it must be paid by.`

let anthropic: Anthropic | null = null
function claude(): Anthropic {
  anthropic ??= new Anthropic()
  return anthropic
}

/** Ask Claude to read one statement PDF. */
export async function extractStatement(pdf: Buffer): Promise<StatementExtraction> {
  const response = await claude().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(ExtractionSchema) },
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') } },
        { type: 'text', text: 'Extract this statement.' },
      ],
    }],
  })
  if (response.stop_reason === 'refusal') throw new Error('Claude declined to read this document')
  if (response.stop_reason === 'max_tokens') throw new Error('Extraction was cut off (max_tokens)')
  const out = response.parsed_output
  if (!out) throw new Error('Extraction returned no structured output')
  return {
    ...out,
    segments: out.segments.map(seg => ({
      ...seg,
      type: (SEGMENT_TYPES as readonly string[]).includes(seg.type) ? seg.type as StatementSegment['type'] : 'other',
    })),
  }
}

const SEGMENT_TYPES = ['purchase', 'balance_transfer', 'cash_advance', 'promo_purchase', 'other'] as const

// ── Parse + diff ──────────────────────────────────────────────────────────

export interface ParseResult { statement_id: string; findings: number; error?: string }

/** Download a stored statement, extract it, and write pending findings. */
export async function parseStatement(service: any, statementId: string): Promise<ParseResult> {
  const { data: st } = await service.from('statements').select('*').eq('id', statementId).single()
  if (!st) return { statement_id: statementId, findings: 0, error: 'Statement not found' }
  await service.from('statements').update({ status: 'parsing', parse_error: null }).eq('id', statementId)

  try {
    const { data: blob, error: dlErr } = await service.storage.from(STATEMENTS_BUCKET).download(st.storage_path)
    if (dlErr || !blob) throw new Error(`storage: ${dlErr?.message ?? 'missing file'}`)
    const extracted = await extractStatement(Buffer.from(await blob.arrayBuffer()))

    // Uploaded statements learn their account from the PDF itself.
    const patch: Record<string, unknown> = {
      status: 'parsed', extracted, parsed_at: new Date().toISOString(),
    }
    if (!st.account_mask && extracted.account_last4) patch.account_mask = extracted.account_last4
    if (!st.account_name && extracted.account_name) patch.account_name = [extracted.issuer, extracted.account_name].filter(Boolean).join(' ')
    if (!st.institution && extracted.issuer) patch.institution = extracted.issuer
    if (extracted.closing_date && !st.period_year) {
      patch.period_year = Number(extracted.closing_date.slice(0, 4))
      patch.period_month = Number(extracted.closing_date.slice(5, 7))
    }
    await service.from('statements').update(patch).eq('id', statementId)

    const findings = await writeFindings(service, { ...st, ...patch }, extracted)
    return { statement_id: statementId, findings }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await service.from('statements').update({ status: 'error', parse_error: msg.slice(0, 500) }).eq('id', statementId)
    return { statement_id: statementId, findings: 0, error: msg }
  }
}

async function writeFindings(service: any, st: any, extracted: StatementExtraction): Promise<number> {
  if (!extracted.is_card_statement) return 0
  // A newer statement for the same account supersedes older pending findings.
  const { data: older } = await service.from('statements').select('id')
    .eq('account_mask', st.account_mask ?? '__none__').neq('id', st.id)
  const olderIds = (older ?? []).map((r: any) => r.id)
  if (olderIds.length) {
    await service.from('statement_findings').update({ status: 'dismissed', resolved_at: new Date().toISOString() })
      .in('statement_id', olderIds).eq('status', 'pending')
  }
  // Re-parsing the same statement supersedes its own earlier pending findings.
  await service.from('statement_findings').update({ status: 'dismissed', resolved_at: new Date().toISOString() })
    .eq('statement_id', st.id).eq('status', 'pending')

  const { data: promos } = await service.from('promo_deadlines')
    .select('id, name, account_name, balance, expires, deferred_interest, status, note')
  const drafts = diffStatementAgainstPromos(extracted, (promos ?? []) as PromoRow[], {
    accountMask: st.account_mask ?? extracted.account_last4 ?? null,
    accountName: st.account_name ?? null,
  })
  if (!drafts.length) return 0
  const { error } = await service.from('statement_findings').insert(drafts.map(d => ({ ...d, statement_id: st.id })))
  if (error) throw new Error(`findings: ${error.message}`)
  return drafts.length
}

/**
 * Parse the newest unparsed statement per account (older months stay
 * downloaded and can be parsed on demand). Bounded so the cron stays
 * inside its time budget.
 */
export async function parsePendingStatements(service: any, limit = 4): Promise<ParseResult[]> {
  const { data: rows } = await service.from('statements')
    .select('id, plaid_account_id, account_mask, status, period_year, period_month')
    .order('period_year', { ascending: false }).order('period_month', { ascending: false })
  const seen = new Set<string>()
  const todo: string[] = []
  for (const r of rows ?? []) {
    const key = r.plaid_account_id ?? r.account_mask ?? r.id
    if (seen.has(key)) continue
    seen.add(key)
    if (r.status === 'downloaded') todo.push(r.id)
  }
  const results: ParseResult[] = []
  for (const id of todo.slice(0, limit)) results.push(await parseStatement(service, id))
  return results
}

// ── Plaid Statements sync ─────────────────────────────────────────────────

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}

/** Date range Link should consent statements for (Plaid allows up to 2 years). */
export function statementsLinkRange(): { start_date: string; end_date: string } {
  return { start_date: isoDaysAgo(HISTORY_MONTHS * 31), end_date: isoDaysAgo(0) }
}

/**
 * Download any statements Plaid has that we don't. Returns a product status
 * for plaid_items.product_status.statements (same vocabulary as the
 * liabilities/investments mirrors).
 */
export async function syncStatements(
  service: any, client: PlaidApi, item: DbPlaidItem & { statements_refreshed_at?: string | null },
  errorStatus: (err: unknown) => string,
): Promise<string> {
  try {
    const { data } = await client.statementsList({ access_token: item.access_token })
    const { data: known } = await service.from('statements').select('plaid_statement_id').eq('item_id', item.item_id)
    const have = new Set((known ?? []).map((r: any) => r.plaid_statement_id))
    const cutoff = isoDaysAgo(HISTORY_MONTHS * 31)
    let newest = ''

    // Newest first, capped per run so the first backfill can't eat the
    // cron's time budget (the rest arrive on following days).
    const queue = data.accounts.flatMap(acct => acct.statements.map(s => ({
      acct, s, posted: s.date_posted ?? `${s.year}-${String(s.month).padStart(2, '0')}-28`,
    }))).sort((a, b) => b.posted.localeCompare(a.posted))
    let downloaded = 0

    for (const { acct, s, posted } of queue) {
      if (posted > newest) newest = posted
      if (have.has(s.statement_id) || posted < cutoff) continue
      if (downloaded >= MAX_DOWNLOADS_PER_RUN) continue
      downloaded++

      const res = await client.statementsDownload(
        { access_token: item.access_token, statement_id: s.statement_id },
        { responseType: 'arraybuffer' },
      )
      const pdf = Buffer.from(res.data as ArrayBuffer)
      const path = `plaid/${item.item_id}/${acct.account_id}/${s.year}-${String(s.month).padStart(2, '0')}-${s.statement_id}.pdf`
      const { error: upErr } = await service.storage.from(STATEMENTS_BUCKET)
        .upload(path, pdf, { contentType: 'application/pdf', upsert: true })
      if (upErr) return `error:storage ${upErr.message.slice(0, 50)}`

      await service.from('statements').upsert({
        source: 'plaid', plaid_statement_id: s.statement_id, item_id: item.item_id,
        plaid_account_id: acct.account_id, institution: item.institution_name,
        account_name: item.account_map[acct.account_id] ?? acct.account_name,
        account_mask: acct.account_mask, period_year: s.year, period_month: s.month,
        date_posted: s.date_posted ?? null, storage_path: path, file_size: pdf.length,
      }, { onConflict: 'plaid_statement_id' })
    }

    // Plaid only knows statements it has fetched; ask for a refresh when the
    // newest is a cycle old (async — the next daily sync picks it up).
    const lastRefresh = item.statements_refreshed_at ?? ''
    if ((!newest || newest < isoDaysAgo(REFRESH_AFTER_DAYS)) && lastRefresh < isoDaysAgo(7)) {
      try {
        await client.statementsRefresh({ access_token: item.access_token, start_date: isoDaysAgo(60), end_date: isoDaysAgo(0) })
        await service.from('plaid_items').update({ statements_refreshed_at: new Date().toISOString() }).eq('id', item.id)
      } catch (err) {
        console.warn('[statements] refresh failed:', errorStatus(err))
      }
    }
    return 'ok'
  } catch (err) {
    return errorStatus(err)
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
