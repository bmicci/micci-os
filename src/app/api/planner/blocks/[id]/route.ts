import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'No client' }, { status: 500 })

  const body = await req.json()
  const { time_label, cat, task, sort_order, is_deleted } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (time_label !== undefined) updates.time_label = time_label
  if (cat !== undefined) updates.cat = cat
  if (task !== undefined) updates.task = task
  if (sort_order !== undefined) updates.sort_order = sort_order
  if (is_deleted !== undefined) updates.is_deleted = is_deleted

  const { data, error } = await supabase
    .from('schedule_blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ block: data })
}
