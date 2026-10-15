import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/supabase/require-user'
import { isBriefTab, TWEAK_KINDS, type TweakKind } from '@/lib/briefs'

// POST /api/briefs — the hub's two write paths:
//   { op: 'tweak',  tab, edition?, section?, kind, text }  → new feedback note
//                                                          the next Routine run applies
//   { op: 'config', tab, text }                            → replace the tab's inputs
//   { op: 'dismiss', id }                                  → drop an open tweak
export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  if (body.op === 'tweak') {
    const { tab, edition, section, kind, text } = body
    if (!isBriefTab(tab) || !TWEAK_KINDS.includes(kind as TweakKind)
        || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Invalid tweak' }, { status: 400 })
    }
    const { data, error } = await service.from('brief_tweaks').insert({
      tab,
      edition: typeof edition === 'string' ? edition : null,
      section: typeof section === 'string' ? section.slice(0, 200) : null,
      kind,
      text: text.trim().slice(0, 2000),
    }).select('id, tab, edition, section, kind, text, status, created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (body.op === 'config') {
    const { tab, text } = body
    if (!isBriefTab(tab) || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid config' }, { status: 400 })
    }
    const { data, error } = await service.from('brief_config').upsert({
      tab,
      text: text.slice(0, 20000),
      source: 'micci-os',
      updated_at: new Date().toISOString(),
    }).select('tab, text, updated_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (body.op === 'dismiss') {
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await service.from('brief_tweaks')
      .update({ status: 'dismissed' })
      .eq('id', body.id)
      .eq('status', 'open')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
}
