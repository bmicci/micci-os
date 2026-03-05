import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Toggle completion of a hardcoded/static goal
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { goal_key, completed } = await request.json()
  if (!goal_key) return NextResponse.json({ error: 'Missing goal_key' }, { status: 400 })

  if (completed) {
    const { error } = await supabase
      .from('life_plan_goal_states')
      .upsert({ goal_key, completed: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('life_plan_goal_states')
      .delete()
      .eq('goal_key', goal_key)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, goal_key, completed })
}
