import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/goals/[id]  — update title/description or toggle completed
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if ('title' in body) updates.title = body.title
  if ('description' in body) updates.description = body.description
  if ('completed' in body) {
    updates.completed = body.completed
    updates.completed_at = body.completed ? new Date().toISOString() : null
    updates.status = body.completed ? 'completed' : 'active'
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Goal update error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
  return NextResponse.json({ goal: data })
}

// DELETE /api/goals/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) {
    console.error('Goal delete error:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
