import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/finance/deadlines
// Returns all upcoming deadlines ordered by deadline_date ascending
export async function GET() {
  const supabase = createServiceClient()

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('financial_deadlines')
    .select('*')
    .neq('status', 'completed')
    .order('deadline_date', { ascending: true })

  if (error) {
    // Table may not exist yet — return empty array instead of error
    console.warn('[/api/finance/deadlines] Table error:', error.message)
    return NextResponse.json([])
  }

  return NextResponse.json(data ?? [])
}

// PATCH /api/finance/deadlines/:id — mark completed
export async function PATCH(req: Request) {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const body = await req.json()
  const { id, status } = body as { id: string; status: string }

  const { data, error } = await supabase
    .from('financial_deadlines')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
