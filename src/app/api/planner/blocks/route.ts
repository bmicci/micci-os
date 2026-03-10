import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ blocks: [] })

  const { data, error } = await supabase
    .from('schedule_blocks')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ blocks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'No client' }, { status: 500 })

  const body = await req.json()
  const { day_date, week, time_label, cat, task, sort_order, static_key, is_deleted } = body

  if (!day_date || !time_label || !cat || !task) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert({
      day_date,
      week: week ?? 1,
      time_label,
      cat,
      task,
      sort_order: sort_order ?? 0,
      static_key: static_key ?? null,
      is_deleted: is_deleted ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ block: data }, { status: 201 })
}
