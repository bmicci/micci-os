// One-off local price refresh — mirrors /api/investments/refresh-prices
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { default: YahooFinance } = await import('yahoo-finance2')
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const { data: positions } = await supabase.from('portfolio_positions')
  .select('id, ticker, shares, is_cash').eq('is_cash', false).gt('shares', 0)

let updated = 0
for (const pos of positions ?? []) {
  try {
    const q = await yf.quote(pos.ticker, {}, { validateResult: false })
    const price = q.regularMarketPrice ?? q.ask ?? q.bid
    if (!price) continue
    const { error } = await supabase.from('portfolio_positions').update({
      current_price: price,
      day_change: q.regularMarketChange ?? null,
      day_change_pct: q.regularMarketChangePercent ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', pos.id)
    if (!error) { updated++; console.log(`${pos.ticker.padEnd(6)} $${price}  ${q.regularMarketChangePercent?.toFixed(2)}%`) }
    else console.log(`${pos.ticker}: ${error.message}`)
  } catch (e) { console.log(`${pos.ticker}: ${e.message}`) }
}

const { data: allPos } = await supabase.from('portfolio_positions').select('current_value, shares, day_change')
const totalValue = (allPos ?? []).reduce((s, r) => s + Number(r.current_value ?? 0), 0)
const dayChange = (allPos ?? []).reduce((s, r) => s + Number(r.day_change ?? 0) * Number(r.shares ?? 0), 0)
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
await supabase.from('portfolio_history').upsert(
  { snapshot_date: today, total_value: Math.round(totalValue * 100) / 100, day_change: Math.round(dayChange * 100) / 100 },
  { onConflict: 'snapshot_date' })
console.log(`\n✅ ${updated} updated · total $${totalValue.toFixed(0)} · day ${dayChange >= 0 ? '+' : ''}$${dayChange.toFixed(0)} · history row ${today}`)
