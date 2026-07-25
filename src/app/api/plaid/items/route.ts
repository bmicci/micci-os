import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlaidClient, plaidConfigured } from '@/lib/plaid'

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
// Calls Plaid's /item/remove so the Item stops billing and FREES a slot
// against the account's Item limit — deleting only our row would leave
// the connection alive on Plaid's side, silently eating the quota.
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const service = await createServiceClient()
  const { data: item, error: fetchErr } = await service
    .from('plaid_items')
    .select('access_token')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (fetchErr || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  if (plaidConfigured()) {
    try {
      await getPlaidClient().itemRemove({ access_token: item.access_token })
    } catch (err) {
      // Already-removed / invalid items shouldn't block local cleanup
      console.warn('[plaid/items] itemRemove failed (continuing):', err)
    }
  }

  const { error } = await service.from('plaid_items').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
