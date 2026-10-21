import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/supabase/require-user'
import { upsertBodyMetric } from '@/lib/health/bodyMetrics'
import { chicagoToday, shiftDay } from '@/lib/health/dates'

// Daily check-in (/health/checkin). One row per day in health_checkins.
//   GET  ?date=YYYY-MM-DD → that day's row (or null) + days logged in the last 7
//   POST {checkin_date, ...fields} → upsert; weight also lands in body_metrics

const BOOL_FIELDS = ['lifted', 'sauna', 'walk', 'peloton', 'lights_out_on_time', 'game_off_on_time', 'journal', 'nicotine_free'] as const
const SESSION_TYPES = ['push', 'pull', 'legs', 'upper', 'lower', 'full', 'rest'] as const
const isoDate = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

export async function GET(req: NextRequest) {
  if (!(await requireUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  const today = chicagoToday()
  const date = isoDate(req.nextUrl.searchParams.get('date')) ?? today
  const [{ data: row }, { count }] = await Promise.all([
    service.from('health_checkins').select('*').eq('checkin_date', date).maybeSingle(),
    service.from('health_checkins').select('checkin_date', { count: 'exact', head: true })
      .gte('checkin_date', shiftDay(today, -6)).lte('checkin_date', today),
  ])
  return NextResponse.json({ date, today, checkin: row ?? null, loggedLast7: count ?? 0 })
}

export async function POST(req: NextRequest) {
  if (!(await requireUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const today = chicagoToday()
  const date = isoDate(body.checkin_date) ?? today
  if (date > today || date < shiftDay(today, -7)) {
    return NextResponse.json({ error: 'Check-ins can be logged for the last 7 days' }, { status: 400 })
  }

  const row: Record<string, unknown> = { checkin_date: date, source: 'app', updated_at: new Date().toISOString() }
  for (const f of BOOL_FIELDS) if (typeof body[f] === 'boolean') row[f] = body[f]
  if (typeof body.session_type === 'string' && (SESSION_TYPES as readonly string[]).includes(body.session_type)) row.session_type = body.session_type
  if (body.session_type === null) row.session_type = null
  const sleep = Number(body.sleep_hours)
  if (body.sleep_hours != null && Number.isFinite(sleep) && sleep >= 0 && sleep <= 16) row.sleep_hours = Math.round(sleep * 2) / 2
  const energy = Number(body.energy_level)
  if (body.energy_level != null && Number.isInteger(energy) && energy >= 1 && energy <= 10) row.energy_level = energy
  const cardio = Number(body.cardio_minutes)
  if (body.cardio_minutes != null && Number.isInteger(cardio) && cardio >= 0 && cardio <= 600) row.cardio_minutes = cardio
  const weight = Number(body.weight_lbs)
  const hasWeight = body.weight_lbs != null && body.weight_lbs !== '' && Number.isFinite(weight) && weight > 50 && weight < 600
  if (hasWeight) row.weight_lbs = weight
  const waist = Number(body.waist_in)
  const hasWaist = body.waist_in != null && body.waist_in !== '' && Number.isFinite(waist) && waist > 15 && waist < 80
  if (hasWaist) row.waist_in = waist
  for (const f of ['pain_notes', 'notes'] as const) {
    if (typeof body[f] === 'string') row[f] = (body[f] as string).trim().slice(0, 2000) || null
  }

  const { error } = await service.from('health_checkins').upsert(row, { onConflict: 'checkin_date' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Weigh-ins feed the body trend alongside InBody / Withings (one per day).
  if (hasWeight || hasWaist) {
    const { error: bmErr } = await upsertBodyMetric(service, {
      source: 'manual', external_id: `checkin:${date}`, metric_date: date, is_confirmed: true,
      ...(hasWeight ? { weight_lbs: weight } : {}), ...(hasWaist ? { waist_in: waist } : {}),
    })
    if (bmErr) console.warn('[health/checkin] body_metrics write failed:', bmErr.message)
  }
  return NextResponse.json({ ok: true, date })
}
