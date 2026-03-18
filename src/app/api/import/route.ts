import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ── Column header patterns for each data type ──────────────────────────────

const DEBT_PATTERNS: Record<string, string[]> = {
  name: ['name', 'account', 'creditor', 'lender', 'card', 'bank', 'institution'],
  balance: ['balance', 'owed', 'current balance', 'amount owed', 'principal'],
  interest_rate: ['rate', 'apr', 'interest', 'apy', 'interest rate', 'annual rate'],
  minimum_payment: ['min', 'minimum', 'min payment', 'minimum payment', 'monthly payment'],
  account_type: ['type', 'account type', 'category', 'kind'],
  notes: ['notes', 'decision', 'action', 'comment', 'note', 'strategy', 'remarks'],
}

const SUB_PATTERNS: Record<string, string[]> = {
  name: ['name', 'service', 'subscription', 'vendor', 'app', 'provider'],
  amount: ['amount', 'cost', 'monthly', 'price', 'fee', 'charge', 'monthly cost'],
  action: ['action', 'status', 'decision', 'recommendation'],
  category: ['category', 'type', 'group', 'section'],
  billing_cycle: ['billing', 'cycle', 'frequency', 'period', 'billing cycle'],
  notes: ['notes', 'reason', 'comment', 'note', 'remarks'],
}

const BUDGET_PATTERNS: Record<string, string[]> = {
  name: ['name', 'category', 'expense', 'item', 'line item'],
  monthly_actual: ['monthly actual', 'monthly', 'actual monthly', 'month actual', 'actual'],
  annual_actual: ['annual actual', 'annual', 'yearly', 'year', 'annual total'],
  survival_budget: ['survival', 'budget', 'target', 'goal', 'survival budget'],
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreHeaders(headers: string[], patterns: Record<string, string[]>): number {
  let score = 0
  const hLower = headers.map(h => h.toLowerCase().trim())
  for (const patList of Object.values(patterns)) {
    if (hLower.some(h => patList.some(p => h.includes(p) || p.includes(h)))) score++
  }
  return score
}

function detectDataType(headers: string[]): 'debt_accounts' | 'subscriptions' | 'budget_categories' {
  const debtScore = scoreHeaders(headers, DEBT_PATTERNS)
  const subScore = scoreHeaders(headers, SUB_PATTERNS)
  const budgetScore = scoreHeaders(headers, BUDGET_PATTERNS)
  if (debtScore >= subScore && debtScore >= budgetScore) return 'debt_accounts'
  if (subScore >= budgetScore) return 'subscriptions'
  return 'budget_categories'
}

function findColumn(headers: string[], patterns: string[]): string | undefined {
  const hLower = headers.map(h => h.toLowerCase().trim())
  for (const pat of patterns) {
    const idx = hLower.findIndex(h => h.includes(pat) || pat.includes(h))
    if (idx !== -1) return headers[idx]
  }
  return undefined
}

function parseCurrency(val: unknown): number | null {
  if (val == null || val === '') return null
  const n = parseFloat(String(val).replace(/[$,\s]/g, ''))
  return isNaN(n) ? null : n
}

function parseRate(val: unknown): number | null {
  if (val == null || val === '') return null
  const n = parseFloat(String(val).replace(/[%,\s]/g, ''))
  return isNaN(n) ? null : n
}

// ── Row parsers ────────────────────────────────────────────────────────────

function buildColumnMap(
  headers: string[],
  patterns: Record<string, string[]>
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [field, pats] of Object.entries(patterns)) {
    const col = findColumn(headers, pats)
    if (col) map[field] = col
  }
  return map
}

function parseDebtRow(
  row: Record<string, unknown>,
  colMap: Record<string, string>
): Record<string, unknown> | null {
  const name = colMap.name ? String(row[colMap.name] ?? '').trim() : ''
  if (!name) return null

  const balance = parseCurrency(colMap.balance ? row[colMap.balance] : null)
  const rate = parseRate(colMap.interest_rate ? row[colMap.interest_rate] : null)
  const minPayment = parseCurrency(colMap.minimum_payment ? row[colMap.minimum_payment] : null)
  const notesRaw = colMap.notes ? String(row[colMap.notes] ?? '') : ''

  let account_type = 'other'
  if (colMap.account_type) {
    const t = String(row[colMap.account_type] ?? '').toLowerCase()
    if (t.includes('credit') || t.includes('card')) account_type = 'credit_card'
    else if (t.includes('mortgage') || t.includes('home loan')) account_type = 'mortgage'
    else if (t.includes('heloc')) account_type = 'heloc'
    else if (t.includes('auto') || t.includes('car') || t.includes('loan')) account_type = 'loan'
    else if (t.includes('line') || t.includes('loc')) account_type = 'line_of_credit'
  } else {
    // Infer from name
    const n = name.toLowerCase()
    if (n.includes('mortgage') || n.includes('home')) account_type = 'mortgage'
    else if (n.includes('heloc')) account_type = 'heloc'
    else if (n.includes('auto') || n.includes('car') || n.includes('lightstream')) account_type = 'loan'
    else if (
      n.includes('chase') ||
      n.includes('amex') ||
      n.includes('citi') ||
      n.includes('credit') ||
      n.includes('nordstrom') ||
      n.includes('best buy')
    )
      account_type = 'credit_card'
    else if (n.includes('sofi') || n.includes('personal loan') || n.includes('dad') || n.includes('family'))
      account_type = 'loan'
  }

  return {
    name,
    balance: balance ?? 0,
    interest_rate: rate ?? 0,
    minimum_payment: minPayment,
    account_type,
    status: 'active',
    notes: notesRaw || null,
  }
}

function parseSubRow(
  row: Record<string, unknown>,
  colMap: Record<string, string>
): Record<string, unknown> | null {
  const name = colMap.name ? String(row[colMap.name] ?? '').trim() : ''
  if (!name) return null

  const amount = parseCurrency(colMap.amount ? row[colMap.amount] : null) ?? 0

  let action: string = 'review'
  if (colMap.action) {
    const a = String(row[colMap.action] ?? '').toLowerCase()
    if (a.includes('cancel')) action = 'cancel'
    else if (a.includes('essential') || a.includes('bill')) action = 'essential'
    else if (a.includes('keep')) action = 'keep'
  }

  const billingCycleRaw = colMap.billing_cycle ? String(row[colMap.billing_cycle] ?? '') : ''
  const billing_cycle = billingCycleRaw.toLowerCase().includes('annual') ? 'annual' : 'monthly'

  return {
    name,
    amount,
    billing_cycle,
    category: colMap.category ? String(row[colMap.category] ?? '') || null : null,
    action,
    notes: colMap.notes ? String(row[colMap.notes] ?? '') || null : null,
    is_active: true,
  }
}

function parseBudgetRow(
  row: Record<string, unknown>,
  colMap: Record<string, string>
): Record<string, unknown> | null {
  const name = colMap.name ? String(row[colMap.name] ?? '').trim() : ''
  if (!name) return null

  return {
    name,
    monthly_actual: parseCurrency(colMap.monthly_actual ? row[colMap.monthly_actual] : null),
    annual_actual: parseCurrency(colMap.annual_actual ? row[colMap.annual_actual] : null),
    survival_budget: parseCurrency(colMap.survival_budget ? row[colMap.survival_budget] : null),
  }
}

// ── Parse handler ──────────────────────────────────────────────────────────

async function handleParse(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const dataTypeHint = (formData.get('dataType') as string) || 'auto'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  // Use first sheet (or the most data-rich one)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Convert to JSON with header row
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false, // All values as strings for consistent parsing
    defval: '',
  })

  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'Spreadsheet appears to be empty' }, { status: 400 })
  }

  const headers = Object.keys(rawRows[0])
  const detectedType =
    dataTypeHint === 'auto'
      ? detectDataType(headers)
      : (dataTypeHint as 'debt_accounts' | 'subscriptions' | 'budget_categories')

  const patterns =
    detectedType === 'debt_accounts'
      ? DEBT_PATTERNS
      : detectedType === 'subscriptions'
        ? SUB_PATTERNS
        : BUDGET_PATTERNS

  const colMap = buildColumnMap(headers, patterns)

  const parsed: Record<string, unknown>[] = []
  for (const row of rawRows) {
    let result: Record<string, unknown> | null = null
    if (detectedType === 'debt_accounts') result = parseDebtRow(row, colMap)
    else if (detectedType === 'subscriptions') result = parseSubRow(row, colMap)
    else result = parseBudgetRow(row, colMap)
    if (result) parsed.push(result)
  }

  return NextResponse.json({
    detectedType,
    headers,
    columnMap: colMap,
    rows: parsed,
    sheetName,
    totalRaw: rawRows.length,
    totalParsed: parsed.length,
  })
}

// ── Commit handler ─────────────────────────────────────────────────────────

async function handleCommit(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows, dataType, mode } = (await request.json()) as {
    rows: Record<string, unknown>[]
    dataType: 'debt_accounts' | 'subscriptions' | 'budget_categories'
    mode: 'replace' | 'upsert'
  }

  if (!rows || !dataType) {
    return NextResponse.json({ error: 'rows and dataType are required' }, { status: 400 })
  }

  const service = await createServiceClient()

  let imported = 0
  let errors = 0

  if (mode === 'replace') {
    // Delete all existing rows first, then insert
    const { error: deleteError } = await service.from(dataType).delete().neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.error('[import] Delete error:', deleteError)
      return NextResponse.json({ error: `Failed to clear table: ${deleteError.message}` }, { status: 500 })
    }

    const { data, error } = await service.from(dataType).insert(rows).select()
    if (error) {
      console.error('[import] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    imported = data?.length ?? rows.length
  } else {
    // Upsert by name (matching existing rows by name)
    for (const row of rows) {
      const { error } = await service
        .from(dataType)
        .upsert(row as Record<string, unknown>, { onConflict: 'name', ignoreDuplicates: false })
      if (error) {
        console.error('[import] Upsert error for row:', row, error)
        errors++
      } else {
        imported++
      }
    }
  }

  return NextResponse.json({ imported, errors, dataType, mode })
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Detect action from content type: FormData = parse, JSON = commit
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    return handleParse(request)
  }

  return handleCommit(request)
}
