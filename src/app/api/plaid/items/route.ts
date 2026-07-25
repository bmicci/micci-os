import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { plaidConfigured } from '@/lib/plaid'

// GET — list this user's connected institutions (never exposes tokens).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = await createServiceClient()
  const { data, error } = await service
    .from('plaid_items')
    .select('id, institution_name, status, last_synced_at, last_error, account_map, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ configured: plaidConfigured(), items: data ?? [] })
}

// DELETE — disconnect an institution. Synced transactions stay (history
// is still real); only the connection and future syncs are removed.
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const service = await createServiceClient()
  const { error } = await service.from('plaid_items').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
