import { NextRequest, NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlaidClient, plaidConfigured } from '@/lib/plaid'
import { statementsLinkRange } from '@/lib/statements'
import { verifiedOwner } from '@/lib/supabase/require-user'

interface PlaidErrorBody { error_type?: string; error_code?: string; error_message?: string; display_message?: string | null }
/** Plaid's real error lives in the Axios response body, not err.message. */
function plaidErrorBody(err: unknown): PlaidErrorBody | null {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  return data && typeof data === 'object' ? data as PlaidErrorBody : null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await verifiedOwner(supabase)
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
    const body = await request.json().catch(() => ({})) as { item_id?: string; skip?: string[] }
    const base = {
      user: { client_user_id: user.id },
      client_name: 'micci-os',
      country_codes: [CountryCode.Us],
      language: 'en',
      redirect_uri: redirectUri,
    }

    // Update mode: an existing Item grants Liabilities + Investments +
    // Statements without disconnecting (same Item, same transaction history).
    if (body.item_id) {
      const service = await createServiceClient()
      const { data: item } = await service.from('plaid_items')
        .select('access_token, product_status').eq('id', body.item_id).eq('user_id', user.id).single()
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      // One product per Link session, most useful first. Bundling several
      // (e.g. Amex: liabilities + statements + investments, which Amex
      // doesn't offer) made Link die with INTERNAL_SERVER_ERROR, while the
      // single-product Chase statements session worked. Skip products this
      // Item already granted, ones the bank doesn't offer, and ones the
      // client saw fail in Link (body.skip) so the next click moves on.
      const ps = (item.product_status ?? {}) as Record<string, string>
      const skip = new Set(Array.isArray(body.skip) ? body.skip : [])
      const S = Products.Statements
      const order = [['liabilities', Products.Liabilities], ['statements', S], ['investments', Products.Investments]] as const
      const candidates = order.filter(([k]) => ps[k] !== 'ok' && ps[k] !== 'unsupported' && !skip.has(k))
      if (candidates.length === 0) {
        return NextResponse.json({
          error: skip.size
            ? 'Plaid could not add the remaining details for this bank. Try again later, or upload statements as PDFs below.'
            : 'This bank has already granted everything it offers.',
        }, { status: 409 })
      }
      // Statements goes in `products` with its date range; the others in
      // `additional_consented_products` (Plaid's update-mode rules). If Plaid
      // rejects a product at token time, try the next one.
      let lastErr: unknown = null
      for (const [key, product] of candidates) {
        try {
          const { data } = await client.linkTokenCreate({
            ...base,
            access_token: item.access_token,
            ...(product === S
              ? { products: [S], statements: statementsLinkRange() }
              : { additional_consented_products: [product] }),
          })
          return NextResponse.json({ link_token: data.link_token, mode: 'update', product: key })
        } catch (err) {
          lastErr = err
          if (plaidErrorBody(err)?.error_type !== 'INVALID_REQUEST' && plaidErrorBody(err)?.error_code !== 'INVALID_FIELD') break
        }
      }
      const pErr = plaidErrorBody(lastErr)
      console.error('[plaid/create-link-token] update mode failed', pErr ?? lastErr)
      return NextResponse.json({
        error: pErr?.error_code === 'INVALID_FIELD' || pErr?.error_type === 'INVALID_REQUEST'
          ? `This bank does not offer card/loan terms, holdings or statements through Plaid (${pErr.error_message ?? pErr.error_code}).`
          : pErr?.error_message ?? 'Plaid error',
        code: pErr?.error_code ?? null,
      }, { status: 422 })
    }

    // New connection: transactions required; liabilities (card/mortgage
    // terms), investments (holdings) and statements (PDFs) wherever the bank
    // supports them.
    const { data } = await client.linkTokenCreate({
      ...base,
      products: [Products.Transactions],
      optional_products: [Products.Liabilities, Products.Investments, Products.Statements],
      transactions: { days_requested: 730 },
      statements: statementsLinkRange(),
    })
    return NextResponse.json({ link_token: data.link_token, mode: 'new' })
  } catch (err) {
    const pErr = plaidErrorBody(err)
    const msg = pErr?.error_message ?? (err instanceof Error ? err.message : 'Plaid error')
    console.error('[plaid/create-link-token]', pErr ?? err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
