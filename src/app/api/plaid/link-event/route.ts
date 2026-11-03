import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/require-user'
import { createServiceClient } from '@/lib/supabase/server'

// Plaid Link exited with an error (Link's UI only shows "Something went
// wrong"). Log Plaid's error code + request id to the runtime logs so the
// failure can be diagnosed — and quoted to Plaid support if needed.
export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const s = (k: string) => (typeof b[k] === 'string' ? (b[k] as string).slice(0, 300) : null)
  console.warn('[plaid/link-exit]', JSON.stringify({
    item_id: s('item_id'), institution: s('institution'), status: s('status'),
    error_type: s('error_type'), error_code: s('error_code'), error_message: s('error_message'),
    request_id: s('request_id'), link_session_id: s('link_session_id'),
  }))

  // Update mode asked for one product and the bank doesn't offer it through
  // Plaid: record that so the row shows n/a and stops offering Add details.
  const product = s('product')
  const itemId = s('item_id')
  if (b.error_code === 'PRODUCTS_NOT_SUPPORTED' && itemId && product && ['liabilities', 'statements', 'investments'].includes(product)) {
    const service = await createServiceClient()
    const { data: item } = await service.from('plaid_items').select('product_status').eq('id', itemId).eq('user_id', user.id).single()
    if (item) {
      const ps = { ...((item.product_status ?? {}) as Record<string, string>), [product]: 'unsupported' }
      await service.from('plaid_items').update({ product_status: ps }).eq('id', itemId).eq('user_id', user.id)
    }
  }
  return NextResponse.json({ ok: true })
}
