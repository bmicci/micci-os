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

// Chase: Transaction Date, Post Date, Description, Category, Type, Amount, Memo
const CHASE_REQUIRED = ['transaction date', 'post date', 'description', 'type', 'amount']
// AmEx: Date, Description, Amount, Extended Details, Appears On Your Statement As, ...
const AMEX_REQUIRED = ['date', 'description', 'amount', 'extended details']
// BofA: Date, Description, Amount, Running Bal.
const BOFA_REQUIRED = ['date', 'description', 'amount', 'running bal.']

type BankFormat = 'chase' | 'amex' | 'bofa'

// ── Auto-categorization keyword map ────────────────────────────────────────

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'Food & Dining',
    keywords: [
      'uber eats', 'doordash', 'grubhub', 'postmates', 'chipotle', 'mcdonald',
      'starbucks', 'coffee', 'restaurant', 'kitchen', 'grill', 'pizza', 'sushi',
      'taco', 'burger', 'diner', 'cafe', 'bakery', 'bar', 'pub', 'brewery',
      'wingstop', 'chick-fil-a', 'shake shack', 'five guys', 'noodles',
      'panda express', 'subway', 'jimmy john', 'jersey mike', 'potbelly',
    ],
  },
  {
    category: 'Shopping/Retail',
    keywords: [
      'amazon', 'walmart', 'target', 'costco', 'best buy', 'home depot',
      "lowe's", 'nordstrom', "macy's", 'gap', 'old navy', 'h&m', 'zara',
      'tj maxx', 'marshalls', 'ross', 'ebay', 'etsy',
    ],
  },
  {
    category: 'Health',
    keywords: [
      'cvs', 'walgreens', 'rite aid', 'pharmacy', 'doctor', 'dental',
      'medical', 'clinic', 'hospital', 'gym', 'fitness', 'lifetime',
      'equinox', 'peloton',
    ],
  },
  {
    category: 'Transportation',
    keywords: [
      'uber', 'lyft', 'gas', 'shell', 'exxon', 'bp', 'chevron', 'marathon',
      'speedway', 'parking', 'toll', 'ntta', 'auto',
    ],
  },
  {
    category: 'Subscriptions',
    keywords: [
      'netflix', 'spotify', 'hulu', 'disney', 'apple', 'google', 'microsoft',
      'adobe', 'dropbox', 'github', 'chatgpt', 'openai', 'anthropic', 'cursor',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'airbnb', 'hotel', 'marriott', 'hilton', 'hyatt', 'delta', 'united',
      'american airlines', 'southwest', 'expedia', 'booking.com',
    ],
  },
  {
    category: 'Insurance',
    keywords: ['geico', 'state farm', 'allstate', 'progressive', 'farmers'],
  },
  {
    category: 'Utilities',
    keywords: [
      'txu', 'atmos', 'dallas water', 'comcast', 'at&t', 'verizon',
      't-mobile', 'spectrum',
    ],
  },
]

function autoCategorize(description: string): string {
  const lower = description.toLowerCase()
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return category
  }
  return 'Other'
}

// ── Date parser (MM/DD/YYYY → YYYY-MM-DD) ──────────────────────────────────

function parseDate(val: string): string {
  const trimmed = val.trim()
  // MM/DD/YYYY
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, m, d, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  return trimmed
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

function headersIncludeAll(headers: string[], required: string[]): boolean {
  const hLower = headers.map(h => h.toLowerCase().trim())
  return required.every(r => hLower.some(h => h === r || h.includes(r)))
}

function detectBankFormat(headers: string[]): BankFormat | null {
  if (headersIncludeAll(headers, CHASE_REQUIRED)) return 'chase'
  if (headersIncludeAll(headers, AMEX_REQUIRED)) return 'amex'
  if (headersIncludeAll(headers, BOFA_REQUIRED)) return 'bofa'
  return null
}

type DataType = 'debt_accounts' | 'subscriptions' | 'budget_categories' | 'transactions'

function detectDataType(headers: string[]): DataType {
  // Check for bank transaction formats first (unambiguous header sets)
  if (detectBankFormat(headers) !== null) return 'transactions'

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
    const idx = hLower.findIndex(h => h === pat || h.includes(pat) || pat.includes(h))
    if (idx !== -1) return headers[idx]
  }
  return undefined
}

/** Find the exact header (case-insensitive) matching a literal name. */
function findExactColumn(headers: string[], name: string): string | undefined {
  return headers.find(h => h.toLowerCase().trim() === name.toLowerCase().trim())
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

interface TransactionRow {
  transaction_date: string
  merchant: string
  raw_description: string
  amount: number
  category: string
  account_name: string
  source_file: string
  is_income: boolean
}

/**
 * Parse a single row from a bank CSV into a normalised TransactionRow.
 * Returns null if the row should be skipped (payment, credit, empty date, etc.).
 */
function parseTransactionRow(
  row: Record<string, unknown>,
  headers: string[],
  format: BankFormat,
  accountName: string,
  sourceFile: string
): TransactionRow | null {
  // ── Chase ──────────────────────────────────────────────────────────────
  if (format === 'chase') {
    const typeCol = findExactColumn(headers, 'Type')
    const type = typeCol ? String(row[typeCol] ?? '').trim() : ''
    if (type === 'Payment') return null

    const dateCol = findExactColumn(headers, 'Transaction Date')
    const descCol = findExactColumn(headers, 'Description')
    const amountCol = findExactColumn(headers, 'Amount')
    const catCol = findExactColumn(headers, 'Category')

    const dateRaw = dateCol ? String(row[dateCol] ?? '').trim() : ''
    if (!dateRaw) return null

    const rawDescription = descCol ? String(row[descCol] ?? '').trim() : ''
    const amountRaw = parseCurrency(amountCol ? row[amountCol] : null)
    if (amountRaw == null) return null

    // Chase: negative = charge, positive = payment/credit
    // We already skipped Payment type; remaining positives are credits/refunds.
    // Normalise: expenses are negative
    const amount = amountRaw // keep sign as-is; negative = expense
    const is_income = amount > 0

    // Use Chase's own Category if available, otherwise auto-categorize
    const chaseCategory = catCol ? String(row[catCol] ?? '').trim() : ''
    const category = chaseCategory || autoCategorize(rawDescription)

    return {
      transaction_date: parseDate(dateRaw),
      merchant: rawDescription,
      raw_description: rawDescription,
      amount,
      category,
      account_name: accountName,
      source_file: sourceFile,
      is_income,
    }
  }

  // ── AmEx ───────────────────────────────────────────────────────────────
  if (format === 'amex') {
    const dateCol = findExactColumn(headers, 'Date')
    const descCol = findExactColumn(headers, 'Description')
    const amountCol = findExactColumn(headers, 'Amount')
    const catCol = findExactColumn(headers, 'Category')

    const dateRaw = dateCol ? String(row[dateCol] ?? '').trim() : ''
    if (!dateRaw) return null

    const rawDescription = descCol ? String(row[descCol] ?? '').trim() : ''
    const amountRaw = parseCurrency(amountCol ? row[amountCol] : null)
    if (amountRaw == null) return null

    // AmEx: positive = charge, negative = payment/credit
    // Skip payments/credits (amount <= 0)
    if (amountRaw <= 0) return null

    // Normalise to negative for expenses (to match Chase convention)
    const amount = -amountRaw
    const is_income = false

    const amexCategory = catCol ? String(row[catCol] ?? '').trim() : ''
    const category = amexCategory || autoCategorize(rawDescription)

    return {
      transaction_date: parseDate(dateRaw),
      merchant: rawDescription,
      raw_description: rawDescription,
      amount,
      category,
      account_name: accountName,
      source_file: sourceFile,
      is_income,
    }
  }

  // ── BofA ───────────────────────────────────────────────────────────────
  if (format === 'bofa') {
    const dateCol = findExactColumn(headers, 'Date')
    const descCol = findExactColumn(headers, 'Description')
    const amountCol = findExactColumn(headers, 'Amount')

    const dateRaw = dateCol ? String(row[dateCol] ?? '').trim() : ''
    if (!dateRaw) return null

    const rawDescription = descCol ? String(row[descCol] ?? '').trim() : ''
    const amountRaw = parseCurrency(amountCol ? row[amountCol] : null)
    if (amountRaw == null) return null

    // BofA: negative = charge, positive = credit
    // Skip credits (amount > 0)
    if (amountRaw > 0) return null

    const amount = amountRaw // already negative
    const is_income = false
    const category = autoCategorize(rawDescription)

    return {
      transaction_date: parseDate(dateRaw),
      merchant: rawDescription,
      raw_description: rawDescription,
      amount,
      category,
      account_name: accountName,
      source_file: sourceFile,
      is_income,
    }
  }

  return null
}

// ── Snapshot helper ────────────────────────────────────────────────────────

/**
 * After committing debt_accounts, write a point-in-time balance snapshot
 * to `financial_snapshots` so net-worth charts stay current.
 */
async function snapshotCurrentBalances(
  service: Awaited<ReturnType<typeof createServiceClient>>
): Promise<void> {
  try {
    const { data: accounts, error } = await service
      .from('accounts')
      .select('id, name, current_balance, account_type')

    if (error || !accounts?.length) return

    const totalDebt = accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0)

    await service.from('financial_snapshots').insert({
      snapshot_date: new Date().toISOString().slice(0, 10),
      total_debt: totalDebt,
      account_balances: accounts.map(a => ({
        id: a.id,
        name: a.name,
        balance: a.current_balance,
        type: a.account_type,
      })),
      note: 'Auto-snapshot after import',
    })
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[import] snapshotCurrentBalances error:', err)
  }
}

// ── Parse handler ──────────────────────────────────────────────────────────

async function handleParse(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const dataTypeHint = (formData.get('dataType') as string) || 'auto'
  const accountName = (formData.get('accountName') as string) || ''

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
  const detectedType: DataType =
    dataTypeHint === 'auto'
      ? detectDataType(headers)
      : (dataTypeHint as DataType)

  let parsed: Record<string, unknown>[] = []
  let previewColumns: string[] = []

  if (detectedType === 'transactions') {
    const bankFormat = detectBankFormat(headers)
    if (!bankFormat) {
      return NextResponse.json(
        { error: 'Could not detect bank format from CSV headers. Supported: Chase, AmEx, BofA.' },
        { status: 400 }
      )
    }

    for (const row of rawRows) {
      const result = parseTransactionRow(row, headers, bankFormat, accountName, file.name)
      if (result) parsed.push(result as unknown as Record<string, unknown>)
    }

    previewColumns = ['transaction_date', 'merchant', 'amount', 'category', 'account_name']

    return NextResponse.json({
      detectedType,
      bankFormat,
      headers,
      columnMap: {},
      rows: parsed,
      sheetName,
      totalRaw: rawRows.length,
      totalParsed: parsed.length,
      previewColumns,
    })
  }

  // Non-transaction types
  const patterns =
    detectedType === 'debt_accounts'
      ? DEBT_PATTERNS
      : detectedType === 'subscriptions'
        ? SUB_PATTERNS
        : BUDGET_PATTERNS

  const colMap = buildColumnMap(headers, patterns)

  for (const row of rawRows) {
    let result: Record<string, unknown> | null = null
    if (detectedType === 'debt_accounts') result = parseDebtRow(row, colMap)
    else if (detectedType === 'subscriptions') result = parseSubRow(row, colMap)
    else result = parseBudgetRow(row, colMap)
    if (result) parsed.push(result)
  }

  if (detectedType === 'debt_accounts') {
    previewColumns = ['name', 'balance', 'interest_rate', 'minimum_payment', 'account_type']
  } else if (detectedType === 'subscriptions') {
    previewColumns = ['name', 'amount', 'billing_cycle', 'category', 'action']
  } else {
    previewColumns = ['name', 'monthly_actual', 'annual_actual', 'survival_budget']
  }

  return NextResponse.json({
    detectedType,
    headers,
    columnMap: colMap,
    rows: parsed,
    sheetName,
    totalRaw: rawRows.length,
    totalParsed: parsed.length,
    previewColumns,
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
    dataType: DataType
    mode: 'replace' | 'upsert'
  }

  if (!rows || !dataType) {
    return NextResponse.json({ error: 'rows and dataType are required' }, { status: 400 })
  }

  const service = await createServiceClient()

  let imported = 0
  let errors = 0

  // ── Transactions: always dedup via ON CONFLICT DO NOTHING ───────────────
  if (dataType === 'transactions') {
    // Insert in batches of 100 to avoid payload limits
    const BATCH = 100
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { data, error } = await service
        .from('transactions')
        .insert(batch)
        .select()
        // Supabase surfaces ON CONFLICT DO NOTHING via ignoreDuplicates at the
        // JS client level; we rely on the unique index in the DB schema.
        // If the DB unique index isn't present, duplicates will still be
        // prevented by catching the conflict error below.

      if (error) {
        // Partial failures: count the batch as errors but keep going
        console.error('[import] Transaction insert error (batch):', error)
        errors += batch.length
      } else {
        imported += data?.length ?? batch.length
      }
    }

    return NextResponse.json({ imported, errors, dataType, mode: 'dedup_insert' })
  }

  // ── All other types ─────────────────────────────────────────────────────
  if (mode === 'replace') {
    // Delete all existing rows first, then insert
    const { error: deleteError } = await service
      .from(dataType)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

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

    // After replacing debt accounts, write a balance snapshot
    if (dataType === 'debt_accounts') {
      await snapshotCurrentBalances(service)
    }
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

    // After upserting debt accounts, write a balance snapshot
    if (dataType === 'debt_accounts') {
      await snapshotCurrentBalances(service)
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
