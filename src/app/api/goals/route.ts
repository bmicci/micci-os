import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.then(s => s.getAll()) },
        setAll() {},
      },
    }
  )
}

// GET /api/goals?timeframe=weekly&section=career&page=1&limit=10
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)

  const timeframe = searchParams.get('timeframe')
  const section = searchParams.get('section')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  let query = supabase
    .from('goals')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (timeframe && timeframe !== 'all') query = query.eq('timeframe', timeframe)
  if (section) query = query.eq('section', section)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goals: data, total: count, page, limit })
}

// POST /api/goals
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()

  const { title, description, section, timeframe } = body
  if (!title || !section || !timeframe) {
    return NextResponse.json({ error: 'title, section, timeframe required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({ title, description, section, timeframe, completed: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data }, { status: 201 })
}
