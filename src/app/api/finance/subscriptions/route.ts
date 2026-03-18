import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/finance/subscriptions
// Returns all active subscriptions ordered by amount descending
export async function GET() {
  const supabase = createServiceClient()

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('is_active', true)
    .order('amount', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
