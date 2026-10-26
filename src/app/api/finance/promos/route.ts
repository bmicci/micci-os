import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/require-user'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * /api/finance/promos — close a 0% promo by hand once it's paid off.
 *   PATCH { id, status: 'paid' }   → mark paid (stays in the table as history)
 *   PATCH { id, status: 'active' } → undo a mistaken Mark paid
 * Never deletes. The statements pipeline closes promos the same way when a
 * statement proves the payoff; this is the manual path for older promos.
 */

const PAID_NOTE = /\s*Paid — marked by hand \d{4}-\d{2}-\d{2}\.$/

export async function PATCH(request: NextRequest) {
  if (!(await requireUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { id?: unknown; status?: unknown }
  const id = typeof body.id === 'string' ? body.id : ''
  const status = body.status
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  if (status !== 'paid' && status !== 'active') {
    return NextResponse.json({ error: "status must be 'paid' or 'active'" }, { status: 400 })
  }

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Service client unavailable' }, { status: 500 })

  const { data: promo, error: readErr } = await service
    .from('promo_deadlines').select('note, status').eq('id', id).single()
  if (readErr || !promo) return NextResponse.json({ error: 'Promo not found' }, { status: 404 })

  const now = new Date().toISOString()
  const base = String(promo.note ?? '').replace(PAID_NOTE, '')
  const patch = status === 'paid'
    ? {
        status, updated_at: now, verified_at: now, verified_source: 'manual',
        note: [base, `Paid — marked by hand ${now.slice(0, 10)}.`].filter(Boolean).join(' '),
      }
    : { status, updated_at: now, note: base || null }

  const { error } = await service.from('promo_deadlines').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
