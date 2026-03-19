import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── Helper: recalculate and persist streak ─────────────────────────────────

function isScheduledOn(
  frequency: string,
  daysOfWeek: string[] | null,
  date: Date,
): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayName = dayNames[date.getDay()]
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  switch (frequency) {
    case 'daily': return true
    case 'weekdays': return !isWeekend
    case 'weekends': return isWeekend
    case 'weekly':
    case 'custom': return (daysOfWeek ?? []).includes(dayName)
    default: return true
  }
}

async function recalcStreak(supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never, routineId: string) {
  const { data: routine } = await supabase
    .from('routines')
    .select('frequency, days_of_week, streak_best')
    .eq('id', routineId)
    .single()

  if (!routine) return { streak_current: 0, streak_best: 0 }

  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)

  const { data: completions } = await supabase
    .from('routine_completions')
    .select('completed_date')
    .eq('routine_id', routineId)
    .eq('skipped', false)
    .gte('completed_date', yearAgo.toISOString().split('T')[0])
    .order('completed_date', { ascending: false })

  if (!completions || completions.length === 0) {
    await supabase
      .from('routines')
      .update({ streak_current: 0, updated_at: new Date().toISOString() })
      .eq('id', routineId)
    return { streak_current: 0, streak_best: routine.streak_best ?? 0 }
  }

  const completedSet = new Set(completions.map((c: { completed_date: string }) => c.completed_date))

  // Walk backwards from today counting consecutive scheduled days that are complete
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let checkDate = new Date(today)

  // If today isn't completed yet, start from yesterday
  if (!completedSet.has(checkDate.toISOString().split('T')[0])) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  for (let i = 0; i < 366; i++) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (!isScheduledOn(routine.frequency, routine.days_of_week, checkDate)) {
      checkDate.setDate(checkDate.getDate() - 1)
      continue
    }
    if (completedSet.has(dateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  const bestStreak = Math.max(routine.streak_best ?? 0, streak)
  await supabase
    .from('routines')
    .update({ streak_current: streak, streak_best: bestStreak, updated_at: new Date().toISOString() })
    .eq('id', routineId)

  return { streak_current: streak, streak_best: bestStreak }
}

// ── GET: fetch completions for a date or date range ────────────────────────

export async function GET(req: Request) {
  const supabase = await createClient()
  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')

  let query = supabase.from('routine_completions').select('routine_id, completed_date, skipped')

  if (date) {
    query = query.eq('completed_date', date)
  } else if (start && end) {
    query = query.gte('completed_date', start).lte('completed_date', end)
  } else {
    return NextResponse.json({ error: 'date or start/end required' }, { status: 400 })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── POST: toggle completion for a routine on a date ────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { routine_id, date, skipped = false, skip_reason } = await req.json()
  if (!routine_id || !date) return NextResponse.json({ error: 'routine_id and date required' }, { status: 400 })

  // Check if already completed
  const { data: existing } = await supabase
    .from('routine_completions')
    .select('id')
    .eq('routine_id', routine_id)
    .eq('completed_date', date)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // Delete (un-complete)
    await supabase.from('routine_completions').delete().eq('id', existing.id)
    const streakData = await recalcStreak(supabase, routine_id)
    return NextResponse.json({ action: 'removed', ...streakData })
  } else {
    // Insert (complete)
    const { data, error } = await supabase
      .from('routine_completions')
      .insert({ routine_id, completed_date: date, user_id: user.id, skipped, skip_reason: skip_reason ?? null })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const streakData = await recalcStreak(supabase, routine_id)
    return NextResponse.json({ action: 'added', id: data.id, ...streakData })
  }
}
