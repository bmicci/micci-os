import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: states }, { data: custom }] = await Promise.all([
    supabase.from('life_plan_goal_states').select('*'),
    supabase.from('life_plan_custom_goals').select('*').order('created_at'),
  ])

  return NextResponse.json({ states: states ?? [], custom: custom ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { section_id, timeframe, category_header, goal_text, ai_generated } = body

  if (!section_id || !timeframe || !goal_text?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('life_plan_custom_goals')
    .insert({ section_id, timeframe, category_header: category_header ?? null, goal_text: goal_text.trim(), ai_generated: ai_generated ?? false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
