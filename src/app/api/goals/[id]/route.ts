import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['active', 'completed', 'paused', 'archived'] as const
const VALID_PRIORITIES = [1, 2, 3, 4, 5] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status, priority } = body as { status?: string; priority?: number }

  const update: Record<string, unknown> = {}

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = status
    if (status === 'completed') update.completed_at = new Date().toISOString()
    if (status !== 'completed') update.completed_at = null
  }

  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority as typeof VALID_PRIORITIES[number])) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }
    update.priority = priority
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goals')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
