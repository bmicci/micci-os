import { NextRequest, NextResponse } from 'next/server'
import { runBriefs } from '@/lib/briefsRunner/run'

// API-key briefs runner (docs/BRIEFS_RUNNER.md). OFF: no cron points here and
// the proxy does not let it through yet; even when called it does nothing
// unless BRIEFS_API_ENABLED is "true" and the spend guard allows the run.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runBriefs()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[briefs/run]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Run failed' }, { status: 500 })
  }
}
