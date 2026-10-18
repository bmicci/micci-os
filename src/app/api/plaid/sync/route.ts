import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { plaidConfigured, syncAllPlaidItems } from '@/lib/plaid'
import { parsePendingStatements } from '@/lib/statements'

export const maxDuration = 300

// POST — manual "Sync now" from the Import Center (user-authenticated).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!plaidConfigured()) return NextResponse.json({ error: 'Plaid not configured' }, { status: 501 })

  try {
    const service = await createServiceClient()
    const results = await syncAllPlaidItems(service, user.id)
    // Newly downloaded statements → Claude extraction → pending findings
    const statements = await parsePendingStatements(service, 2)
    return NextResponse.json({ results, statements })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    console.error('[plaid/sync]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — Vercel cron (daily). Same auth pattern as the price-refresh cron.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!plaidConfigured()) return NextResponse.json({ skipped: 'Plaid not configured' })

  try {
    const service = await createServiceClient()
    const results = await syncAllPlaidItems(service)
    const statements = await parsePendingStatements(service, 3)
    return NextResponse.json({ results, statements })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    console.error('[plaid/sync cron]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
