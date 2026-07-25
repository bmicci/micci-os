import { NextRequest, NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { createClient } from '@/lib/supabase/server'
import { getPlaidClient, plaidConfigured } from '@/lib/plaid'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!plaidConfigured()) {
    return NextResponse.json(
      { error: 'Plaid is not configured. Add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV in Vercel (keys at dashboard.plaid.com), then redeploy.' },
      { status: 501 },
    )
  }

  try {
    const client = getPlaidClient()
    const { data } = await client.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'micci-os',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      transactions: { days_requested: 730 },
    })
    return NextResponse.json({ link_token: data.link_token })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Plaid error'
    console.error('[plaid/create-link-token]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
