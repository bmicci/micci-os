import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/require-user'
import { createServiceClient } from '@/lib/supabase/service'
import { pickScenarioFields } from '@/lib/finance/scenarioFields'

// PUT /api/finance/scenarios/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const row = pickScenarioFields(await req.json().catch(() => null))
  // Only one baseline at a time
  if (row.is_baseline === true) {
    await supabase.from('financial_scenarios').update({ is_baseline: false }).neq('id', id)
  }

  const { data, error } = await supabase
    .from('financial_scenarios')
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/finance/scenarios/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { error } = await supabase
    .from('financial_scenarios')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
