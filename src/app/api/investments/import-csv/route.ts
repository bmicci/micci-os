import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── Chase Tax Lots CSV format (J.P. Morgan Self-Directed Investing) ──
//
// Export path: Portfolio → Holdings → Download → Tax Lots
//
// File characteristics:
//   - UTF-8 BOM (﻿)
//   - One row per tax lot — multiple rows per ticker is normal
//   - Numbers are plain (no $ signs), commas used as thousands separator
//   - Cash/money market appears as ticker "QDERQ"
//   - Key columns (0-indexed): Ticker=8, Quantity=10, Price=13, Cost=23,
//     Description=7, Asset Strategy=5, Unit Cost=41
//
// ── Chase Transaction History CSV ────────────────────────────────────
//
// Export path: Portfolio → Activity → Download → Transaction History
//
// File characteristics:
//   - No BOM
//   - Columns: Trade Date, Post Date, Settlement Date, Account Name,
//     Account Number, Account Type, Type, Description, Cusip, Ticker,
//     Security Type, Local Currency, Price USD, Price Local, Quantity,
//     G/L Short USD, ..., Tran Code, Tran Code Description, ...
//   - One row per transaction (Buy, Sell, Dividend, STK SPLT, BNK, etc.)
//
// This route detects which format was uploaded and handles accordingly.
// Tax Lots → upsert positions. Transactions → stored as future feature.

interface ParsedPosition {
  ticker:    string
  name:      string
  shares:    number
  price:     number
  costBasis: number
  unitCost:  number
  isCash:    boolean
  strategy:  string
}

/** Strip commas, handle negative parens. Numbers in Tax Lots have NO $ signs. */
function parseNum(raw: string | undefined): number {
  if (!raw) return 0
  const s = raw.trim().replace(/,/g, '')
  if (s.startsWith('(') && s.endsWith(')')) return -(parseFloat(s.slice(1, -1)) || 0)
  return parseFloat(s) || 0
}

/** Split a CSV line respecting double-quoted fields */
function splitLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else cur += ch
  }
  result.push(cur.trim())
  return result
}

/** Detect format: 'taxlots' | 'transactions' | 'unknown' */
function detectFormat(headers: string[]): 'taxlots' | 'transactions' | 'unknown' {
  const h = headers.map(x => x.toLowerCase().trim())
  if (h.includes('asset strategy') && h.includes('quantity') && h.includes('cost'))
    return 'taxlots'
  if (h.includes('trade date') && h.includes('tran code'))
    return 'transactions'
  return 'unknown'
}

// ── Tax Lots parser ──────────────────────────────────────────────────

function parseTaxLots(lines: string[]): { positions: ParsedPosition[]; warnings: string[] } {
  const warnings: string[] = []
  const headers = splitLine(lines[0])
  const h = headers.map(x => x.toLowerCase().trim())

  const col = (names: string[]): number => {
    for (const n of names) {
      const idx = h.findIndex(hh => hh === n || hh.includes(n))
      if (idx !== -1) return idx
    }
    return -1
  }

  const iTicker  = col(['ticker'])
  const iQty     = col(['quantity'])
  const iPrice   = col(['price'])
  const iCost    = col(['cost'])                // "Cost" (not "Orig Cost")
  const iDesc    = col(['description'])
  const iStrat   = col(['asset strategy'])
  const iUnitCost= col(['unit cost'])

  if (iTicker === -1 || iQty === -1 || iPrice === -1) {
    return { positions: [], warnings: ['Tax Lots format: cannot find Ticker/Quantity/Price columns'] }
  }

  // Aggregate lots by ticker
  const map = new Map<string, ParsedPosition>()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cells  = splitLine(line)
    const ticker = cells[iTicker]?.trim()
    if (!ticker || ticker.toLowerCase() === 'ticker') continue

    const qty      = parseNum(cells[iQty])
    const price    = parseNum(cells[iPrice])
    const cost     = iCost     !== -1 ? parseNum(cells[iCost])     : qty * price
    const unitCost = iUnitCost !== -1 ? parseNum(cells[iUnitCost]) : (qty > 0 ? cost / qty : 0)
    const desc     = iDesc     !== -1 ? (cells[iDesc]?.trim() || ticker) : ticker
    const strategy = iStrat    !== -1 ? (cells[iStrat]?.trim() || '') : ''
    const isCash   = ['QDERQ', 'SPAXX', 'VMFXX', 'FZFXX', 'SWVXX'].includes(ticker)

    if (map.has(ticker)) {
      const ex = map.get(ticker)!
      ex.shares   += qty
      ex.price     = price     // same for all lots; last one wins
      ex.costBasis+= cost
      ex.unitCost  = ex.shares > 0 ? ex.costBasis / ex.shares : unitCost
    } else {
      map.set(ticker, { ticker, name: desc, shares: qty, price, costBasis: cost, unitCost, isCash, strategy })
    }
  }

  if (map.size === 0) warnings.push('No position rows found — verify this is a Tax Lots export')

  return { positions: Array.from(map.values()), warnings }
}

// ── Route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  // Parse uploaded file
  let text: string
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    text = await (file as File).text()
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 400 })
  }

  // Strip BOM and split lines
  const clean = text.replace(/^\uFEFF/, '')
  const lines = clean.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) {
    return NextResponse.json({ error: 'File appears empty' }, { status: 422 })
  }

  const headers = splitLine(lines[0])
  const format  = detectFormat(headers)

  if (format === 'transactions') {
    return NextResponse.json({
      message: 'Transaction History detected — position import uses the Tax Lots export instead. Go to Holdings → Download → Tax Lots.',
      format: 'transactions',
      rowCount: lines.length - 1,
    })
  }

  if (format === 'unknown') {
    return NextResponse.json(
      { error: 'Unrecognised CSV format. Expected Chase Tax Lots export (Holdings → Download → Tax Lots).', headers: headers.slice(0, 10) },
      { status: 422 },
    )
  }

  // ── Tax Lots: parse + upsert ───────────────────────────────────────

  const { positions, warnings } = parseTaxLots(lines)
  if (positions.length === 0) {
    return NextResponse.json({ error: 'No positions parsed', warnings }, { status: 422 })
  }

  // Fetch existing positions to preserve theme + account
  const { data: existing } = await supabase
    .from('portfolio_positions')
    .select('ticker, theme, account')

  const existingMap: Record<string, { theme: string; account: string }> = {}
  for (const e of (existing ?? [])) {
    existingMap[e.ticker] = { theme: e.theme as string, account: e.account as string }
  }

  // Strategy → theme fallback mapping
  const STRATEGY_THEME: Record<string, string> = {
    'US Large Cap Equity':          'Broad Market',
    'US Small Cap Equity':          'Industrials',
    'Global Equity':                'Robotics',
    'Real Estate & Infrastructure': 'Industrials',
    'Other Alternative Assets':     'Gold',
    'Cash & Short Term':            'Liquidity',
  }

  const upsertRows = positions.map(p => {
    const existing_ = existingMap[p.ticker]
    // Remap QDERQ (Chase sweep) → CASH display
    const displayTicker = p.ticker === 'QDERQ' ? 'CASH' : p.ticker
    const theme = existing_?.theme
      ?? (p.isCash ? 'Liquidity' : STRATEGY_THEME[p.strategy] ?? 'Uncategorized')

    return {
      ticker:        displayTicker,
      name:          p.name,
      shares:        p.shares,
      current_price: p.price,
      cost_basis:    p.costBasis,
      unit_cost:     p.shares > 0 ? p.costBasis / p.shares : 0,
      theme,
      account:       existing_?.account ?? 'IRA-3509',
      is_cash:       p.isCash,
      updated_at:    new Date().toISOString(),
    }
  })

  const { error: upsertErr } = await supabase
    .from('portfolio_positions')
    .upsert(upsertRows, { onConflict: 'ticker' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message, warnings }, { status: 500 })
  }

  // A Tax Lots export is a full account snapshot — anything fully sold since
  // the last import won't appear in it at all. Upsert alone would leave that
  // stale position sitting in the table forever, so drop what's no longer held.
  const currentTickers = upsertRows.map(r => r.ticker)
  const { data: staleRows } = await supabase
    .from('portfolio_positions')
    .select('ticker')
    .not('ticker', 'in', `(${currentTickers.map(t => `"${t}"`).join(',')})`)
  const staleTickers = (staleRows ?? []).map(r => r.ticker as string)

  if (staleTickers.length > 0) {
    await supabase.from('portfolio_positions').delete().in('ticker', staleTickers)
  }

  return NextResponse.json({
    imported:  positions.length,
    format:    'taxlots',
    tickers:   positions.map(p => p.ticker === 'QDERQ' ? 'CASH(QDERQ)' : p.ticker),
    removed:   staleTickers,
    warnings,
    timestamp: new Date().toISOString(),
  })
}
