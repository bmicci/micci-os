import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * PATCH /api/finance/actions — update an action item's status.
 * Body: { id: string, status: 'active' | 'done' | 'dismissed' }
 * Auth-gated; writes via the service client (single-user app).
 */
export async function PATCH(request: NextRequest) {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, status } = (await request.json()) as { id?: string; status?: string }
  if (!id || !status || !['active', 'done', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 })
  }

  const service = createServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'Service client unavailable' }, { status: 500 })
  }

  const { data, error } = await service
    .from('action_items')
    .update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}
