import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/goals?timeframe=weekly&section=career&page=1&limit=10
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  const timeframe = searchParams.get('timeframe')
  const section = searchParams.get('section')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50') || 50))
  const offset = (page - 1) * limit

  let query = supabase
    .from('goals')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (timeframe && timeframe !== 'all') query = query.eq('timeframe', timeframe)
  if (section) query = query.eq('section', section)

  const { data, error, count } = await query

  if (error) {
    console.error('Goals fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
  return NextResponse.json({ goals: data, total: count, page, limit })
}

// POST /api/goals
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const { title, description, section, timeframe } = body
  if (!title || !section || !timeframe) {
    return NextResponse.json({ error: 'title, section, timeframe required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({ title, description, section, timeframe, completed: false, status: 'active', priority: 3 })
    .select()
    .single()

  if (error) {
    console.error('Goal create error:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
  return NextResponse.json({ goal: data }, { status: 201 })
}
