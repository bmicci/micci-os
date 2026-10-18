import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/supabase/require-user'
import { parseStatement, STATEMENTS_BUCKET } from '@/lib/statements'
import type { PromoProposal } from '@/lib/finance/statementDiff'

// Statement findings review (/import).
//   GET                                   → recent statements + findings
//   GET  ?file=<statement id>             → short-lived signed URL to the PDF
//   POST multipart {file}                 → manual upload, parsed immediately
//   POST { op: 'apply',   id, proposed? } → write ONE confirmed finding to promo_deadlines
//   POST { op: 'dismiss', id }            → ignore a finding
//   POST { op: 'parse',   statement_id }  → (re)run extraction on a stored statement
export const maxDuration = 120

const MAX_PDF_BYTES = 4 * 1024 * 1024 // Vercel function body limit is 4.5 MB

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const fileId = req.nextUrl.searchParams.get('file')
  if (fileId) {
    const { data: st } = await service.from('statements').select('storage_path').eq('id', fileId).single()
    if (!st) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data, error } = await service.storage.from(STATEMENTS_BUCKET).createSignedUrl(st.storage_path, 300)
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'No URL' }, { status: 500 })
    return NextResponse.json({ url: data.signedUrl })
  }

  const [stRes, fRes] = await Promise.all([
    service.from('statements')
      .select('id, source, institution, account_name, account_mask, period_year, period_month, status, parse_error, parsed_at, created_at, extracted')
      .order('created_at', { ascending: false }).limit(40),
    service.from('statement_findings')
      .select('id, statement_id, kind, promo_id, account_name, title, current, proposed, status, resolved_at, created_at')
      .neq('status', 'dismissed').order('created_at', { ascending: false }).limit(100),
  ])
  if (stRes.error) return NextResponse.json({ error: stRes.error.message }, { status: 500 })
  // Ship only the summary of each extraction, not the whole document.
  const statements = (stRes.data ?? []).map(({ extracted, ...s }) => ({
    ...s,
    summary: extracted ? {
      closing_date: extracted.closing_date ?? null,
      new_balance: extracted.new_balance ?? null,
      minimum_payment: extracted.minimum_payment ?? null,
      payment_due_date: extracted.payment_due_date ?? null,
      segments: extracted.segments ?? [],
    } : null,
  }))
  return NextResponse.json({ statements, findings: fRes.data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  // ── Manual upload fallback (banks Plaid can't pull statements from) ──
  if (req.headers.get('content-type')?.startsWith('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Statements must be PDFs' }, { status: 400 })
    }
    if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: 'PDF is over 4 MB — download a single statement, not a year bundle' }, { status: 400 })
    const buf = Buffer.from(await file.arrayBuffer())
    const path = `upload/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: upErr } = await service.storage.from(STATEMENTS_BUCKET)
      .upload(path, buf, { contentType: 'application/pdf', upsert: false })
    if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
    const { data: st, error } = await service.from('statements')
      .insert({ source: 'upload', storage_path: path, file_size: buf.length })
      .select('id').single()
    if (error || !st) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
    const result = await parseStatement(service, st.id)
    return NextResponse.json(result, { status: result.error ? 422 : 200 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  if (body.op === 'parse' && typeof body.statement_id === 'string') {
    const result = await parseStatement(service, body.statement_id)
    return NextResponse.json(result, { status: result.error ? 422 : 200 })
  }

  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { data: f } = await service.from('statement_findings')
    .select('*, statements(institution, period_year, period_month)').eq('id', body.id).single()
  if (!f) return NextResponse.json({ error: 'Finding not found' }, { status: 404 })
  if (f.status !== 'pending') return NextResponse.json({ error: `Already ${f.status}` }, { status: 409 })
  const now = new Date().toISOString()

  if (body.op === 'dismiss') {
    await service.from('statement_findings').update({ status: 'dismissed', resolved_at: now }).eq('id', f.id)
    return NextResponse.json({ ok: true })
  }

  if (body.op !== 'apply') return NextResponse.json({ error: 'Unknown op' }, { status: 400 })

  // The user may edit the proposal in the review card before confirming.
  const proposed: PromoProposal = { ...(f.proposed ?? {}), ...sanitize(body.proposed) }
  const s = f.statements as { institution: string | null; period_year: number | null; period_month: number | null } | null
  const source = `statement ${s?.period_year ?? ''}-${String(s?.period_month ?? '').padStart(2, '0')}${s?.institution ? ` (${s.institution})` : ''}`

  if (f.kind === 'update_promo' && f.promo_id) {
    const patch: Record<string, unknown> = { updated_at: now, verified_at: now, verified_source: source }
    if (proposed.balance != null) patch.balance = proposed.balance
    if (proposed.expires) patch.expires = proposed.expires
    if (proposed.deferred_interest !== undefined) patch.deferred_interest = proposed.deferred_interest
    const { error } = await service.from('promo_deadlines').update(patch).eq('id', f.promo_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (f.kind === 'promo_paid' && f.promo_id) {
    const { data: promo } = await service.from('promo_deadlines').select('note').eq('id', f.promo_id).single()
    const note = [promo?.note, `Paid — confirmed from ${source}.`].filter(Boolean).join(' ')
    const { error } = await service.from('promo_deadlines')
      .update({ status: 'paid', note, updated_at: now, verified_at: now, verified_source: source }).eq('id', f.promo_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (f.kind === 'new_promo') {
    if (!proposed.name || !proposed.expires || proposed.balance == null) {
      return NextResponse.json({ error: 'New promo needs a name, balance and expiry' }, { status: 400 })
    }
    const { error } = await service.from('promo_deadlines').insert({
      name: proposed.name, account_name: proposed.account_name ?? f.account_name ?? proposed.name,
      balance: proposed.balance, expires: proposed.expires, deferred_interest: proposed.deferred_interest ?? null,
      note: `Added from ${source}${proposed.apr != null ? ` · ${proposed.apr}% APR` : ''}.`,
      status: 'active', verified_at: now, verified_source: source,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // 'info' findings are acknowledged only.

  await service.from('statement_findings').update({ status: 'applied', resolved_at: now, proposed }).eq('id', f.id)
  return NextResponse.json({ ok: true })
}

/** Accept only the editable proposal fields, with the right types. */
function sanitize(raw: unknown): PromoProposal {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  const out: PromoProposal = {}
  if (typeof r.name === 'string' && r.name.trim()) out.name = r.name.trim().slice(0, 200)
  if (typeof r.balance === 'number' && Number.isFinite(r.balance) && r.balance >= 0) out.balance = r.balance
  if (typeof r.expires === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.expires)) out.expires = r.expires
  if (r.deferred_interest === null || (typeof r.deferred_interest === 'number' && Number.isFinite(r.deferred_interest))) {
    out.deferred_interest = r.deferred_interest as number | null
  }
  return out
}
