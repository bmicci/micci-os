import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/job-search?table=job_pipeline
export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get('table')
  if (!table) return NextResponse.json({ error: 'Missing table param' }, { status: 400 })

  const allowed = ['job_pipeline', 'job_outreach', 'job_content', 'job_recruiters', 'job_weekly_kpis']
  if (!allowed.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from(table).select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/job-search — insert a row
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { table, row } = body as { table: string; row: Record<string, unknown> }

  const allowed = ['job_pipeline', 'job_outreach', 'job_content', 'job_recruiters', 'job_weekly_kpis']
  if (!table || !allowed.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/job-search — update a row
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { table, id, updates } = body as {
    table: string
    id: string
    updates: Record<string, unknown>
  }

  const allowed = ['job_pipeline', 'job_outreach', 'job_content', 'job_recruiters', 'job_weekly_kpis']
  if (!table || !allowed.includes(table) || !id) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/job-search — delete a row
export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { table, id } = body as { table: string; id: string }

  const allowed = ['job_pipeline', 'job_outreach', 'job_content', 'job_recruiters', 'job_weekly_kpis']
  if (!table || !allowed.includes(table) || !id) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
