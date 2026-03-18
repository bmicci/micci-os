import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/finance/modules
// Returns all financial modules ordered by module_number
export async function GET() {
  const supabase = createServiceClient()

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('financial_modules')
    .select('*')
    .order('module_number', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// PATCH /api/finance/modules
// Update module progress/status by id
export async function PATCH(req: Request) {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const body = await req.json()
  const { id, progress, status } = body as { id: string; progress?: number; status?: string }

  const { data, error } = await supabase
    .from('financial_modules')
    .update({ progress, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
