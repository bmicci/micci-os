import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// Type for the yahoo-finance2 v3 instance (loaded dynamically at runtime)
type YFInstance = {
  quote(
    ticker: string,
    queryOptions?: Record<string, unknown>,
    moduleOptions?: Record<string, unknown>,
  ): Promise<{
    regularMarketPrice?: number
    regularMarketChange?: number
    regularMarketChangePercent?: number
    ask?: number
    bid?: number
  }>
}

interface RefreshResult {
  ticker:   string
  oldPrice: number
  newPrice: number
  updated:  boolean
  error?:   string
}

export async function POST() {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  // 1. Fetch non-cash positions with shares > 0
  const { data: positions, error: fetchErr } = await supabase
    .from('portfolio_positions')
    .select('id, ticker, current_price, is_cash, shares')
    .eq('is_cash', false)
    .gt('shares', 0)

  if (fetchErr || !positions || positions.length === 0) {
    return NextResponse.json(
      { error: fetchErr?.message ?? 'No positions found' },
      { status: 500 },
    )
  }

  // 2. Instantiate yahoo-finance2 v3 at runtime (dynamic import avoids
  //    Vercel build-time static analysis failure on the CJS module)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YahooFinance = require('yahoo-finance2').default as new (opts?: Record<string, unknown>) => YFInstance
  const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

  // 3. Fetch quotes concurrently — capture day-change too (powers the
  //    "today's movers" view on the Overview)
  const priceMap: Record<string, { price: number; chg: number | null; chgPct: number | null }> = {}
  await Promise.allSettled(
    (positions as { id: string; ticker: string; current_price: number }[]).map(async pos => {
      try {
        const q = await yf.quote(pos.ticker, {}, { validateResult: false })
        const price = q.regularMarketPrice ?? q.ask ?? q.bid ?? null
        if (price && price > 0) {
          priceMap[pos.ticker] = {
            price,
            chg: q.regularMarketChange ?? null,
            chgPct: q.regularMarketChangePercent ?? null,
          }
        }
      } catch {
        // silently skip — captured in results below
      }
    }),
  )

  // 4. Update Supabase
  const results: RefreshResult[] = []
  await Promise.allSettled(
    (positions as { id: string; ticker: string; current_price: number }[]).map(async pos => {
      const oldPrice = Number(pos.current_price ?? 0)
      const quote = priceMap[pos.ticker]

      if (!quote) {
        results.push({ ticker: pos.ticker, oldPrice, newPrice: 0, updated: false, error: 'No price returned from Yahoo' })
        return
      }

      const { error: updateErr } = await supabase
        .from('portfolio_positions')
        .update({
          current_price: quote.price,
          day_change: quote.chg,
          day_change_pct: quote.chgPct,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pos.id)

      results.push({
        ticker:   pos.ticker,
        oldPrice,
        newPrice: quote.price,
        updated:  !updateErr,
        error:    updateErr?.message,
      })
    }),
  )

  // 5. Snapshot today's total into portfolio_history (one row per day —
  //    accumulates into the performance sparkline)
  const { data: allPos } = await supabase
    .from('portfolio_positions')
    .select('current_value, shares, day_change')
  if (allPos && allPos.length > 0) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const totalValue = (allPos as any[]).reduce((s, r) => s + Number(r.current_value ?? 0), 0)
    const dayChangeTotal = (allPos as any[]).reduce(
      (s, r) => s + Number(r.day_change ?? 0) * Number(r.shares ?? 0), 0)
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    await supabase.from('portfolio_history').upsert({
      snapshot_date: today,
      total_value: Math.round(totalValue * 100) / 100,
      day_change: Math.round(dayChangeTotal * 100) / 100,
    }, { onConflict: 'snapshot_date' })
  }

  return NextResponse.json({
    updated:   results.filter(r => r.updated).length,
    failed:    results.filter(r => !r.updated).length,
    timestamp: new Date().toISOString(),
    results,
  })
}

// GET — called by Vercel Cron
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST()
}
