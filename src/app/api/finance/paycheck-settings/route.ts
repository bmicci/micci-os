import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/require-user'
import { createServiceClient } from '@/lib/supabase/service'
import { activeOffer, parseOffers } from '@/lib/finance/jobIncome'

// Columns the Paycheck simulator saves (one row; single-tenant table, deny-all RLS).
const FIELDS = [
  'salary', 'bonus_percent', 'pay_frequency', 'filing_status', 'state', 'tax_method',
  'manual_effective_rate', 'contribution_401k', 'employer_match_pct', 'employer_match_cap',
  'hsa_contribution', 'health_premium', 'other_pre_tax',
] as const

// GET /api/finance/paycheck-settings
// Saved settings if any; otherwise defaults derived from the accepted job offer
// (financial_settings.job_offers), so the simulator starts from the real job.
export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('paycheck_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) console.warn('[/api/finance/paycheck-settings] Table error:', error.message)
  if (data) return NextResponse.json({ ...data, source: 'saved' })

  const { data: offersRow } = await supabase
    .from('financial_settings').select('value').eq('key', 'job_offers').maybeSingle()
  const offer = activeOffer(parseOffers(offersRow?.value))
  if (!offer) return NextResponse.json(null)

  const salary = offer.kind === 'hourly'
    ? (offer.hourlyRate ?? 0) * (offer.hoursPerWeek ?? 40) * 52
    : offer.annualSalary ?? 0
  return NextResponse.json({
    source: 'offer',
    employer: offer.employer,
    salary,
    // The bonus is excluded from paychecks on purpose (see the offer notes)
    bonus_percent: offer.kind === 'salary' ? (offer.bonusPct ?? 0) : 0,
    pay_frequency: offer.payFrequency,
    filing_status: offer.filingStatus ?? 'single',
    state: 'TX',
    tax_method: 'bracket_calc',
    manual_effective_rate: 22,
    contribution_401k: offer.contribution401kAnnual ?? 0,
    employer_match_pct: 5,
    employer_match_cap: 5,
    hsa_contribution: 0,
    // The offer stores benefits per deducted check; with semi-monthly pay every
    // check is deducted (24/24). Biweekly pay deducts 24 of 26, so average it.
    health_premium: Math.round((((offer.healthPremiumPerCheck ?? 0) * Math.min(24, offer.payFrequency)) / Math.max(1, offer.payFrequency)) * 100) / 100,
    other_pre_tax: 0,
  })
}

// PUT /api/finance/paycheck-settings — update the single row (insert the first time)
export async function PUT(req: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const f of FIELDS) if (f in body) row[f] = body[f]

  const { data: existing } = await supabase.from('paycheck_settings').select('id').limit(1).maybeSingle()
  const q = existing
    ? supabase.from('paycheck_settings').update(row).eq('id', existing.id)
    : supabase.from('paycheck_settings').insert(row)
  const { data, error } = await q.select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
