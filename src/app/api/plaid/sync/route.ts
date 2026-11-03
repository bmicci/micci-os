import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { plaidConfigured, syncAllPlaidItems } from '@/lib/plaid'
import { parsePendingStatements, pendingStatementIds } from '@/lib/statements'
import { verifiedOwner } from '@/lib/supabase/require-user'

export const maxDuration = 300

// POST — manual "Sync now" from the Import Center (user-authenticated).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await verifiedOwner(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!plaidConfigured()) return NextResponse.json({ error: 'Plaid not configured' }, { status: 501 })

  try {
    const service = await createServiceClient()
    const results = await syncAllPlaidItems(service, user.id)
    // Reading statements (~1 min each with Claude) happens in follow-up
    // requests from the browser (POST /api/statements {op:'parse_next'}),
    // one per call — doing it here pushed Sync past Vercel's 300s limit.
    const pending = (await pendingStatementIds(service)).length
    return NextResponse.json({ results, statements_pending: pending })
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
    const started = Date.now()
    const service = await createServiceClient()
    const results = await syncAllPlaidItems(service)
    // Leave ~100s of headroom under maxDuration for the last parse to finish
    const statements = await parsePendingStatements(service, 3, started + 180_000)
    return NextResponse.json({ results, statements })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    console.error('[plaid/sync cron]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
