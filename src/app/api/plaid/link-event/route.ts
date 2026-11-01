import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/require-user'

// Plaid Link exited with an error (Link's UI only shows "Something went
// wrong"). Log Plaid's error code + request id to the runtime logs so the
// failure can be diagnosed — and quoted to Plaid support if needed.
export async function POST(req: NextRequest) {
  if (!(await requireUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const s = (k: string) => (typeof b[k] === 'string' ? (b[k] as string).slice(0, 300) : null)
  console.warn('[plaid/link-exit]', JSON.stringify({
    item_id: s('item_id'), institution: s('institution'), status: s('status'),
    error_type: s('error_type'), error_code: s('error_code'), error_message: s('error_message'),
    request_id: s('request_id'), link_session_id: s('link_session_id'),
  }))
  return NextResponse.json({ ok: true })
}
