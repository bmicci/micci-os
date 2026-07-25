import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlaidClient, plaidConfigured, syncPlaidItem, type DbPlaidItem } from '@/lib/plaid'

// Completes a Plaid Link flow: exchanges the public_token for a permanent
// access_token, stores the item with an account-id → display-name map,
// and runs the first sync immediately so the dashboard updates right away.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!plaidConfigured()) return NextResponse.json({ error: 'Plaid not configured' }, { status: 501 })

  const { public_token, institution_name } = await request.json()
  if (!public_token) return NextResponse.json({ error: 'public_token required' }, { status: 400 })

  try {
    const client = getPlaidClient()
    const { data: exchange } = await client.itemPublicTokenExchange({ public_token })

    // Build "Institution Name ····1234" display names per account — these
    // become transactions.account_name, consistent per account forever.
    const { data: accounts } = await client.accountsGet({ access_token: exchange.access_token })
    const accountMap: Record<string, string> = {}
    for (const a of accounts.accounts) {
      const label = [institution_name || 'Bank', a.name, a.mask ? `···${a.mask}` : '']
        .filter(Boolean).join(' ')
      accountMap[a.account_id] = label
    }

    const service = await createServiceClient()
    const { data: itemRow, error } = await service
      .from('plaid_items')
      .upsert({
        user_id: user.id,
        item_id: exchange.item_id,
        access_token: exchange.access_token,
        institution_name: institution_name ?? null,
        account_map: accountMap,
        status: 'active',
      }, { onConflict: 'item_id' })
      .select()
      .single()
    if (error) throw new Error(error.message)

    const result = await syncPlaidItem(service, itemRow as DbPlaidItem)
    return NextResponse.json({ ok: true, sync: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Plaid exchange failed'
    console.error('[plaid/exchange]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
