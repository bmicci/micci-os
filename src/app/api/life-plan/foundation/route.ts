import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/life-plan/foundation — replace a foundation document.
 * Body: { key: 'foundation' | 'rituals', data: object }
 * Auth-gated; writes via service client (single-user app).
 */
export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key, data } = (await request.json()) as { key?: string; data?: unknown }
  if (!key || !['foundation', 'rituals'].includes(key) || !data || typeof data !== 'object') {
    return NextResponse.json({ error: 'key (foundation|rituals) and data object required' }, { status: 400 })
  }

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Service client unavailable' }, { status: 500 })

  const { error } = await service
    .from('life_plan_foundation')
    .upsert({ key, data, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
