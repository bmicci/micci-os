import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Quick-log a touch. Friction is the failure mode for this kind of tool
// (spec §3), so this accepts a minimal payload and infers the rest.
export async function POST(request: NextRequest) {
  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'No database' }, { status: 500 })

  const body = await request.json()
  const { prong, company_id, contact_id, channel, direction, got_reply, summary, occurred_at } = body

  if (!prong) return NextResponse.json({ error: 'prong required' }, { status: 400 })

  const { error } = await service.from('touchpoint').insert({
    prong,
    company_id: company_id || null,
    contact_id: contact_id || null,
    channel: channel || null,
    direction: direction || 'outbound',
    got_reply: Boolean(got_reply),
    summary: summary || null,
    occurred_at: occurred_at || new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Logging a touch against a contact updates their last_touch, and sets
  // the next_touch default by contact type (spec §8: retained search 14d,
  // internal TA 7d, everyone else 10d).
  if (contact_id) {
    const { data: c } = await service.from('contact').select('contact_type').eq('id', contact_id).single()
    const days = c?.contact_type === 'retained_search' ? 14 : c?.contact_type === 'internal_ta' ? 7 : 10
    const next = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
    await service.from('contact').update({
      last_touch: new Date().toISOString().slice(0, 10),
      next_touch: next,
    }).eq('id', contact_id)
  }

  return NextResponse.json({ ok: true })
}

// PATCH — update a company's status or a contact's next_touch inline.
export async function PATCH(request: NextRequest) {
  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'No database' }, { status: 500 })

  const { table, id, patch } = await request.json()
  if (!['target_company', 'contact', 'requisition'].includes(table)) {
    return NextResponse.json({ error: 'bad table' }, { status: 400 })
  }
  const { error } = await service.from(table).update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
