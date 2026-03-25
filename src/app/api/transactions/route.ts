import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') // 'monthly_spend' | 'balance_history' | 'recent'

  if (view === 'monthly_spend') {
    // Aggregate transactions by month + category for the spend trend chart
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, amount, category, is_credit')
      .eq('is_credit', false)
      .order('transaction_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by YYYY-MM + category
    const monthMap = new Map<string, Map<string, number>>()
    const allCategories = new Set<string>()

    for (const row of data ?? []) {
      const month = String(row.transaction_date).slice(0, 7) // YYYY-MM
      const cat = row.category || 'Other'
      allCategories.add(cat)

      if (!monthMap.has(month)) monthMap.set(month, new Map())
      const catMap = monthMap.get(month)!
      catMap.set(cat, (catMap.get(cat) || 0) + Number(row.amount))
    }

    // Convert to array sorted by month
    const months = Array.from(monthMap.keys()).sort()
    const result = months.map(month => {
      const catMap = monthMap.get(month)!
      const entry: Record<string, unknown> = { month }
      let total = 0
      for (const [cat, amt] of catMap) {
        entry[cat] = Math.round(amt * 100) / 100
        total += amt
      }
      entry.total = Math.round(total * 100) / 100
      return entry
    })

    return NextResponse.json({
      months: result,
      categories: Array.from(allCategories).sort(),
    })
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
