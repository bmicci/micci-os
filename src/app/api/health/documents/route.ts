import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/supabase/require-user'
import { HEALTH_BUCKET, IMAGE_TYPES, parseHealthDocument } from '@/lib/healthDocs'
import { upsertBodyMetric } from '@/lib/health/bodyMetrics'

// Lab reports + InBody sheets (/health → Labs / Body).
//   GET                              → recent documents (with extraction)
//   GET  ?file=<id>                  → 5-minute signed URL to the original
//   POST multipart {kind, file}      → upload, read with Claude, save for review
//   POST { op:'apply', id, markers? | inbody? } → write the confirmed values
//   POST { op:'parse', id }          → re-read a stored document
//   POST { op:'dismiss', id }        → mark reviewed without writing
export const maxDuration = 120
const MAX_BYTES = 4 * 1024 * 1024 // Vercel function body limit is 4.5 MB

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const isoDate = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

export async function GET(req: NextRequest) {
  if (!(await requireUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const fileId = req.nextUrl.searchParams.get('file')
  if (fileId) {
    const { data: doc } = await service.from('health_documents').select('storage_path').eq('id', fileId).single()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data, error } = await service.storage.from(HEALTH_BUCKET).createSignedUrl(doc.storage_path, 300)
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'No URL' }, { status: 500 })
    return NextResponse.json({ url: data.signedUrl })
  }

  const { data, error } = await service.from('health_documents')
    .select('id, kind, file_name, status, parse_error, extracted, collected_on, provider, applied_at, created_at')
    .order('created_at', { ascending: false }).limit(30)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  if (req.headers.get('content-type')?.startsWith('multipart/form-data')) {
    const form = await req.formData()
    const kind = form.get('kind')
    const file = form.get('file')
    if (kind !== 'lab' && kind !== 'inbody') return NextResponse.json({ error: 'Unknown kind' }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 })
    const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')
    if (mime !== 'application/pdf' && !(IMAGE_TYPES as readonly string[]).includes(mime)) {
      return NextResponse.json({ error: 'Upload a PDF or a JPG/PNG photo' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File is over 4 MB' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const path = `${kind}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: upErr } = await service.storage.from(HEALTH_BUCKET).upload(path, buf, { contentType: mime, upsert: false })
    if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
    const { data: doc, error } = await service.from('health_documents')
      .insert({ kind, file_name: file.name.slice(0, 200), storage_path: path, mime_type: mime })
      .select('id').single()
    if (error || !doc) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
    const result = await parseHealthDocument(service, doc.id)
    return NextResponse.json(result, { status: result.error ? 422 : 200 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  if (body.op === 'parse') {
    const result = await parseHealthDocument(service, body.id)
    return NextResponse.json(result, { status: result.error ? 422 : 200 })
  }

  const { data: doc } = await service.from('health_documents').select('*').eq('id', body.id).single()
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  const now = new Date().toISOString()

  if (body.op === 'dismiss') {
    await service.from('health_documents').update({ status: 'applied', applied_at: now }).eq('id', doc.id)
    return NextResponse.json({ ok: true, written: 0 })
  }
  if (body.op !== 'apply') return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
  if (doc.status === 'applied') return NextResponse.json({ error: 'Already saved' }, { status: 409 })

  if (doc.kind === 'lab') {
    const testDate = isoDate(body.collected_on) ?? doc.collected_on
    if (!testDate) return NextResponse.json({ error: 'Collection date is required' }, { status: 400 })
    const markers = Array.isArray(body.markers) ? body.markers as Record<string, unknown>[] : []
    const rows = markers
      .filter(m => m.include !== false && str(m.canonical_name) && num(m.value) != null)
      .map(m => ({
        marker_name: str(m.canonical_name)!,
        test_date: testDate,
        value: num(m.value)!,
        unit: str(m.unit, 40) ?? '',
        reference_low: num(m.reference_low),
        reference_high: num(m.reference_high),
        flag: str(m.flag, 10),
        panel: str(m.panel),
        source: doc.provider ?? 'lab report',
        document_id: doc.id,
        is_confirmed: true,
        notes: str(m.value_text) ? `As reported: ${str(m.value_text)}` : null,
      }))
    // One value per marker per day: skip ones already recorded for this date.
    const { data: existing } = await service.from('lab_markers').select('marker_name').eq('test_date', testDate)
    const have = new Set((existing ?? []).map(r => String(r.marker_name).toLowerCase()))
    const fresh = rows.filter(r => !have.has(r.marker_name.toLowerCase()))
    if (fresh.length) {
      const { error } = await service.from('lab_markers').insert(fresh)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await service.from('health_documents').update({ status: 'applied', applied_at: now, collected_on: testDate }).eq('id', doc.id)
    return NextResponse.json({ ok: true, written: fresh.length, skipped: rows.length - fresh.length })
  }

  // InBody → one body_metrics row
  const x = (body.inbody ?? {}) as Record<string, unknown>
  const date = isoDate(x.test_date) ?? doc.collected_on
  if (!date) return NextResponse.json({ error: 'Test date is required' }, { status: 400 })
  const seg = (doc.extracted as { segmental_lean_lbs?: unknown } | null)?.segmental_lean_lbs ?? null
  const row = {
    metric_date: date,
    source: 'inbody',
    external_id: doc.id,
    document_id: doc.id,
    weight_lbs: num(x.weight_lbs),
    skeletal_muscle_lbs: num(x.skeletal_muscle_lbs),
    muscle_mass_lbs: num(x.skeletal_muscle_lbs),
    fat_mass_lbs: num(x.body_fat_mass_lbs),
    body_fat_pct: num(x.body_fat_pct),
    body_fat_percent: num(x.body_fat_pct),
    body_water_lbs: num(x.total_body_water_lbs),
    visceral_fat_level: num(x.visceral_fat_level),
    bmr_kcal: num(x.bmr_kcal),
    inbody_score: num(x.inbody_score),
    segmental: seg,
    is_confirmed: true,
    notes: doc.provider ? `${doc.provider} scan` : 'InBody scan',
  }
  const { error } = await upsertBodyMetric(service, row)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await service.from('health_documents').update({ status: 'applied', applied_at: now, collected_on: date }).eq('id', doc.id)
  return NextResponse.json({ ok: true, written: 1 })
}
