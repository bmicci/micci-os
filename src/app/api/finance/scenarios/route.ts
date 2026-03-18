import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/finance/scenarios
export async function GET() {
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
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const body = await req.json()

  const { data, error } = await supabase
    .from('financial_scenarios')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
