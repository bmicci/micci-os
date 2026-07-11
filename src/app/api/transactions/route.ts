import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { monthlyTrend, fetchAllTxns } from '@/lib/finance/txnAggregate'

export async function GET(request: NextRequest) {
  // Auth gate uses the user session; data reads use the service client so the
  // dashboard works regardless of which of the owner's accounts is signed in
  // (matches financial-data-service). Single-user personal app.
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = (await createServiceClient()) ?? authClient

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') // 'monthly_spend' | 'balance_history' | 'recent'

  if (view === 'monthly_spend') {
    // Aggregate transactions by month + category for the spend trend chart.
    // Paged fetch — a single select silently caps at 1,000 rows.
    const rows = await fetchAllTxns(supabase)
    const { months, categories } = monthlyTrend(rows)
    return NextResponse.json({ months, categories })
  }

  if (view === 'balance_history') {
    const { data, error } = await supabase
      .from('balance_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ snapshots: data ?? [] })
  }

  // Default: recent transactions
  const limit = parseInt(searchParams.get('limit') || '50')
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ transactions: data ?? [] })
}
