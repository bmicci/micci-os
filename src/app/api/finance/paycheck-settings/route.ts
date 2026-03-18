import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/finance/paycheck-settings
export async function GET() {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('paycheck_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[/api/finance/paycheck-settings] Table error:', error.message)
    return NextResponse.json(null)
  }

  return NextResponse.json(data)
}

// PUT /api/finance/paycheck-settings — upsert
export async function PUT(req: Request) {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const body = await req.json()

  const { data, error } = await supabase
    .from('paycheck_settings')
    .upsert({ ...body, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
