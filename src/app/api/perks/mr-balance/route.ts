import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/perks/mr-balance — persist the Membership Rewards balance.
 * Body: { balance: number }
 * Stores { balance, as_of } in financial_settings under key 'mr_balance'.
 */
export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { balance } = (await request.json()) as { balance?: number }
  if (typeof balance !== 'number' || !Number.isFinite(balance) || balance < 0) {
    return NextResponse.json({ error: 'balance must be a non-negative number' }, { status: 400 })
  }

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Service client unavailable' }, { status: 500 })

  const as_of = new Date().toISOString().slice(0, 10)
  const { error } = await service.from('financial_settings').upsert(
    { key: 'mr_balance', value: { balance: Math.round(balance), as_of }, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, balance: Math.round(balance), as_of })
}
