import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * /api/finance/actions — CRUD for the unified action list (action_items).
 * Backs both the Financial Overview rail and the full Tasks page.
 *   POST   { title, detail?, priority?, due_date?, amount?, category? }
 *   PATCH  { id, ...any of: status, title, detail, priority, due_date, amount, category }
 *   DELETE { id }
 * Auth-gated; writes via the service client (single-user app).
 */

const PRIORITIES = ['red', 'amber', 'blue']
const STATUSES = ['active', 'done', 'dismissed']
const CATEGORIES = ['finance', 'heloc', 'tax', 'legal', 'job_search', 'health', 'personal', 'career']

async function requireAuth() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Service client unavailable' }, { status: 500 })

  const { data, error } = await service
    .from('action_items')
    .insert({
      title,
      detail: typeof body.detail === 'string' ? body.detail : '',
      priority: PRIORITIES.includes(body.priority as string) ? body.priority : 'amber',
      due_date: typeof body.due_date === 'string' && body.due_date ? body.due_date : null,
      amount: typeof body.amount === 'number' && Number.isFinite(body.amount) ? body.amount : null,
      category: CATEGORIES.includes(body.category as string) ? body.category : 'personal',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as string)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    updates.status = body.status
    updates.completed_at = body.status === 'done' ? new Date().toISOString() : null
  }
  if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim()
  if (typeof body.detail === 'string') updates.detail = body.detail
  if (PRIORITIES.includes(body.priority as string)) updates.priority = body.priority
  if (body.due_date !== undefined) updates.due_date = typeof body.due_date === 'string' && body.due_date ? body.due_date : null
  if (body.amount !== undefined) updates.amount = typeof body.amount === 'number' && Number.isFinite(body.amount) ? body.amount : null
  if (CATEGORIES.includes(body.category as string)) updates.category = body.category

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Service client unavailable' }, { status: 500 })

  const { data, error } = await service
    .from('action_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = (await request.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const service = createServiceClient()
  if (!service) return NextResponse.json({ error: 'Service client unavailable' }, { status: 500 })

  const { error } = await service.from('action_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
