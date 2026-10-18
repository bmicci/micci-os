import { NextRequest, NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlaidClient, plaidConfigured } from '@/lib/plaid'

interface PlaidErrorBody { error_type?: string; error_code?: string; error_message?: string; display_message?: string | null }
/** Plaid's real error lives in the Axios response body, not err.message. */
function plaidErrorBody(err: unknown): PlaidErrorBody | null {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  return data && typeof data === 'object' ? data as PlaidErrorBody : null
}

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
    // OAuth institutions (Chase, Amex, …) bounce through the bank's own
    // site and back — Plaid requires a redirect_uri that EXACTLY matches
    // one registered in the Plaid dashboard (API → Allowed redirect URIs).
    // Derive it from the request origin so preview + production both work.
    const origin = request.nextUrl.origin
    const redirectUri = process.env.PLAID_REDIRECT_URI || `${origin}/import`
    const body = await request.json().catch(() => ({})) as { item_id?: string }
    const base = {
      user: { client_user_id: user.id },
      client_name: 'micci-os',
      country_codes: [CountryCode.Us],
      language: 'en',
      redirect_uri: redirectUri,
    }

    // Update mode: an existing Item grants Liabilities + Investments without
    // disconnecting (same Item, same transaction history).
    if (body.item_id) {
      const service = await createServiceClient()
      const { data: item } = await service.from('plaid_items')
        .select('access_token').eq('id', body.item_id).eq('user_id', user.id).single()
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      // Plaid rejects the whole request if the bank doesn't support one of
      // the products (Amex has no investments; PayPal supports neither), so
      // try both, then each alone, and report what the bank can't provide.
      const attempts: Products[][] = [
        [Products.Liabilities, Products.Investments],
        [Products.Liabilities],
        [Products.Investments],
      ]
      let lastErr: unknown = null
      for (const products of attempts) {
        try {
          const { data } = await client.linkTokenCreate({
            ...base,
            access_token: item.access_token,
            additional_consented_products: products,
          })
          return NextResponse.json({ link_token: data.link_token, mode: 'update', products })
        } catch (err) {
          lastErr = err
          if (plaidErrorBody(err)?.error_type !== 'INVALID_REQUEST' && plaidErrorBody(err)?.error_code !== 'INVALID_FIELD') break
        }
      }
      const pErr = plaidErrorBody(lastErr)
      console.error('[plaid/create-link-token] update mode failed', pErr ?? lastErr)
      return NextResponse.json({
        error: pErr?.error_code === 'INVALID_FIELD' || pErr?.error_type === 'INVALID_REQUEST'
          ? `This bank does not offer card/loan terms or holdings through Plaid (${pErr.error_message ?? pErr.error_code}).`
          : pErr?.error_message ?? 'Plaid error',
        code: pErr?.error_code ?? null,
      }, { status: 422 })
    }

    // New connection: transactions required; liabilities (card/mortgage
    // terms) and investments (holdings) wherever the bank supports them.
    const { data } = await client.linkTokenCreate({
      ...base,
      products: [Products.Transactions],
      optional_products: [Products.Liabilities, Products.Investments],
      transactions: { days_requested: 730 },
    })
    return NextResponse.json({ link_token: data.link_token, mode: 'new' })
  } catch (err) {
    const pErr = plaidErrorBody(err)
    const msg = pErr?.error_message ?? (err instanceof Error ? err.message : 'Plaid error')
    console.error('[plaid/create-link-token]', pErr ?? err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
