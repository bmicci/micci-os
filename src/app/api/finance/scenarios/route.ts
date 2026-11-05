import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/require-user'
import { createServiceClient } from '@/lib/supabase/service'
import { pickScenarioFields } from '@/lib/finance/scenarioFields'


// GET /api/finance/scenarios
export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('financial_scenarios')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[/api/finance/scenarios] Table error:', error.message)
    return NextResponse.json([])
  }

  return NextResponse.json(data ?? [])
}

// POST /api/finance/scenarios
export async function POST(req: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const row = pickScenarioFields(await req.json().catch(() => null))
  if (typeof row.name !== 'string' || !row.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  // Only one baseline at a time
  if (row.is_baseline === true) {
    await supabase.from('financial_scenarios').update({ is_baseline: false }).eq('is_baseline', true)
  }

  const { data, error } = await supabase
    .from('financial_scenarios')
    .insert(row)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
