import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── Chase CSV format (J.P. Morgan Self-Directed Investing) ────────
// Chase exports may have leading metadata rows before the header.
// Typical columns (may vary slightly by account type):
//
//   Symbol | Description | Quantity | Price | Price Change % |
//   Market Value | Day Change | Day Change % | Cost Basis |
//   Gain/Loss | Gain/Loss % | Ratings | Account
//
// Numbers include $, commas, % and parentheses for negatives.

interface ParsedRow {
  ticker:      string
  name:        string
  shares:      number
  price:       number
  marketValue: number
  costBasis:   number
  isCash:      boolean
}

/** Strip $, commas, %, spaces; handle (123.45) as negative */
function parseNum(raw: string | undefined): number {
  if (!raw) return 0
  const s = raw.trim().replace(/[$,%\s]/g, '')
  if (s.startsWith('(') && s.endsWith(')')) return -parseFloat(s.slice(1, -1)) || 0
  return parseFloat(s) || 0
}

/** Find the header row index — Chase files sometimes start with account info */
function findHeaderRow(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('symbol') && lower.includes('quantity')) return i
  }
  return 0
}

/** Split a CSV line respecting quoted fields */
function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseChaseCSV(text: string): { rows: ParsedRow[]; warnings: string[] } {
  const lines   = text.split(/\r?\n/).filter(l => l.trim())
  const headerI = findHeaderRow(lines)
  const headers = splitCSVLine(lines[headerI]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

  // Map header names → column indexes
  const col = (names: string[]): number => {
    for (const n of names) {
      const idx = headers.findIndex(h => h.includes(n))
      if (idx !== -1) return idx
    }
    return -1
  }

  const iSymbol    = col(['symbol'])
  const iDesc      = col(['description', 'name'])
  const iQty       = col(['quantity', 'shares', 'qty'])
  const iPrice     = col(['price'])
  const iMktVal    = col(['marketvalue', 'value'])
  const iCostBasis = col(['costbasis', 'cost'])

  if (iSymbol === -1 || iQty === -1) {
    return { rows: [], warnings: ['Could not find Symbol or Quantity column — check file format'] }
  }

  const rows: ParsedRow[]   = []
  const warnings: string[]  = []

  for (let i = headerI + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('--') || line.startsWith('Total')) continue

    const cells  = splitCSVLine(line)
    const ticker = cells[iSymbol]?.trim().toUpperCase()
    if (!ticker || ticker.length === 0) continue

    // Skip header repetitions and summary rows
    if (ticker === 'SYMBOL' || ticker === 'TOTAL' || ticker === 'ACCOUNT') continue

    const shares     = parseNum(cells[iQty])
    const price      = iPrice     !== -1 ? parseNum(cells[iPrice])     : 0
    const marketValue= iMktVal    !== -1 ? parseNum(cells[iMktVal])    : shares * price
    const costBasis  = iCostBasis !== -1 ? parseNum(cells[iCostBasis]) : 0
    const name       = iDesc      !== -1 ? (cells[iDesc]?.trim() || ticker) : ticker

    // Cash-like tickers
    const isCash = ['CASH', 'SPAXX', 'VMFXX', 'FZFXX', 'SWVXX', 'JPST'].includes(ticker)

    rows.push({ ticker, name, shares, price, marketValue, costBasis, isCash })
  }

  if (rows.length === 0) {
    warnings.push('No position rows found after header — verify the CSV came from Chase Investments')
  }

  return { rows, warnings }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  let text: string
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    text = await (file as File).text()
  } catch {
    return NextResponse.json({ error: 'Failed to read uploaded file' }, { status: 400 })
  }

  const { rows, warnings } = parseChaseCSV(text)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No parseable rows found', warnings }, { status: 422 })
  }

  // Fetch existing positions to preserve theme/account fields
  const { data: existing } = await supabase
    .from('portfolio_positions')
    .select('ticker, theme, account')

  const existingMap: Record<string, { theme: string; account: string }> = {}
  for (const e of existing ?? []) {
    existingMap[e.ticker] = { theme: e.theme, account: e.account }
  }

  const upsertRows = rows.map(r => ({
    ticker:        r.ticker,
    name:          r.name,
    shares:        r.shares,
    current_price: r.price,
    cost_basis:    r.costBasis,
    unit_cost:     r.shares > 0 ? r.costBasis / r.shares : 0,
    theme:         existingMap[r.ticker]?.theme  ?? 'Uncategorized',
    account:       existingMap[r.ticker]?.account ?? 'IRA-3509',
    is_cash:       r.isCash,
    updated_at:    new Date().toISOString(),
  }))

  // Upsert by ticker (match on ticker column)
  const { error: upsertErr } = await supabase
    .from('portfolio_positions')
    .upsert(upsertRows, { onConflict: 'ticker' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message, warnings }, { status: 500 })
  }

  return NextResponse.json({
    imported: rows.length,
    warnings,
    tickers: rows.map(r => r.ticker),
    timestamp: new Date().toISOString(),
  })
}
