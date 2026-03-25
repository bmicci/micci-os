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

// ── Bank-specific transaction CSV formats ─────────────────────────────────

type BankFormat = 'chase' | 'amex' | 'bofa' | 'generic'

interface BankFormatConfig {
  dateCol: string[]
  descCol: string[]
  amountCol: string[]
  categoryCol: string[]
  // Chase uses "Type" (Sale/Return/Payment), AmEx uses no type, BofA uses no type
  signLogic: 'chase' | 'amex' | 'bofa' | 'generic'
}

const BANK_FORMATS: Record<BankFormat, BankFormatConfig> = {
  chase: {
    dateCol: ['transaction date', 'posting date'],
    descCol: ['description'],
    amountCol: ['amount'],
    categoryCol: ['category'],
    signLogic: 'chase', // negative = charge, positive = payment/refund
  },
  amex: {
    dateCol: ['date'],
    descCol: ['description'],
    amountCol: ['amount'],
    categoryCol: ['category'],
    signLogic: 'amex', // positive = charge, negative = payment/credit
  },
  bofa: {
    dateCol: ['date', 'posted date'],
    descCol: ['payee', 'description'],
    amountCol: ['amount'],
    categoryCol: [],
    signLogic: 'bofa', // negative = charge, positive = deposit
  },
  generic: {
    dateCol: ['date', 'transaction date', 'trans date', 'posted'],
    descCol: ['description', 'merchant', 'payee', 'memo', 'name'],
    amountCol: ['amount', 'debit', 'charge'],
    categoryCol: ['category', 'type'],
    signLogic: 'generic',
  },
}

// ── Auto-categorization rules ─────────────────────────────────────────────

const CATEGORY_RULES: [RegExp, string][] = [
  // Food & Dining
  [/uber\s*eats|doordash|grubhub|postmates|caviar/i, 'Food & Dining'],
  [/starbucks|coffee|dunkin|peet/i, 'Food & Dining'],
  [/mcdonald|chick-fil|wendy|burger|taco\s*bell|chipotle|subway|panera|shake\s*shack/i, 'Food & Dining'],
  [/restaurant|grill|pizza|sushi|thai|chinese|mexican|steakhouse|bistro|cafe|diner|eatery/i, 'Food & Dining'],
  [/whole\s*foods|trader\s*joe|kroger|safeway|heb|publix|aldi|costco|walmart\s*(grocery|supercenter)|target.*grocery|instacart/i, 'Groceries'],
  // Shopping
  [/amazon|amzn/i, 'Shopping'],
  [/target(?!.*grocery)|walmart(?!.*grocery)|best\s*buy|home\s*depot|lowes|ikea|costco(?!.*gas)/i, 'Shopping'],
  [/nordstrom|zara|h&m|nike|adidas|gap|old\s*navy|uniqlo/i, 'Shopping'],
  // Transport
  [/uber(?!\s*eats)|lyft|taxi|cab\b/i, 'Transport'],
  [/exxon|shell|chevron|bp\b|gas\s*station|fuel|costco\s*gas|buc-ee/i, 'Transport'],
  [/parking|toll|dart|transit/i, 'Transport'],
  // Health
  [/gym|fitness|lifetime|la\s*fitness|equinox|yoga|pilates|crossfit|peloton/i, 'Health & Fitness'],
  [/pharmacy|cvs|walgreens|rite\s*aid|quest\s*diag|lab\s*corp|doctor|medical|dental|optom/i, 'Health & Medical'],
  // Entertainment
  [/netflix|hulu|disney|hbo|spotify|apple\s*music|youtube\s*premium|paramount|peacock/i, 'Entertainment'],
  [/movie|cinema|amc|regal|concert|ticket|live\s*nation|stubhub/i, 'Entertainment'],
  // Subscriptions / Software
  [/adobe|microsoft|google\s*(one|storage|workspace)|dropbox|icloud|chatgpt|openai|notion|slack/i, 'Software & Subscriptions'],
  [/paddle|substack|patreon|medium/i, 'Software & Subscriptions'],
  // Travel
  [/airline|delta|united|american\s*air|southwest|jetblue|frontier|spirit/i, 'Travel'],
  [/hotel|marriott|hilton|hyatt|airbnb|vrbo|booking|expedia/i, 'Travel'],
  // Housing
  [/mortgage|rent|hoa|property\s*tax/i, 'Housing'],
  [/electric|power|energy|water|gas\s*(company|utility)|trash|waste|sewer/i, 'Utilities'],
  [/at&t|verizon|t-mobile|spectrum|comcast|xfinity|internet/i, 'Utilities'],
  // Insurance
  [/insurance|geico|state\s*farm|allstate|progressive|liberty\s*mutual|usaa/i, 'Insurance'],
  // Personal Care
  [/salon|barber|spa|nail|massage|beauty|sephora|ulta/i, 'Personal Care'],
  // Payments / Transfers (ignore)
  [/payment\s*(thank|received)|autopay|online\s*payment|credit\s*card\s*payment/i, 'Payment/Credit'],
]

function autoCategory(description: string): string {
  const desc = description.trim()
  for (const [regex, cat] of CATEGORY_RULES) {
    if (regex.test(desc)) return cat
  }
  return 'Other'
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

function detectBankFormat(headers: string[]): BankFormat | null {
  const hLower = headers.map(h => h.toLowerCase().trim())
  // Chase: "Transaction Date", "Post Date", "Description", "Category", "Type", "Amount"
  if (hLower.some(h => h === 'transaction date') && hLower.some(h => h === 'type') && hLower.some(h => h === 'amount'))
    return 'chase'
  // AmEx: "Date", "Description", "Amount" (sometimes "Card Member", "Account #")
  if (hLower.some(h => h === 'date') && hLower.some(h => h === 'description') && hLower.some(h => h === 'amount') && !hLower.some(h => h === 'transaction date'))
    return 'amex'
  // BofA: "Posted Date", "Payee", "Amount" OR "Date", "Description", "Amount" with "Reference Number"
  if (hLower.some(h => h === 'posted date' || h === 'reference number') && hLower.some(h => h === 'amount'))
    return 'bofa'
  return null
}

function isTransactionCSV(headers: string[]): boolean {
  const hLower = headers.map(h => h.toLowerCase().trim())
  const hasDate = hLower.some(h => h.includes('date'))
  const hasAmount = hLower.some(h => h.includes('amount') || h.includes('debit') || h.includes('charge'))
  const hasDesc = hLower.some(h => h.includes('description') || h.includes('merchant') || h.includes('payee') || h.includes('memo'))
  return hasDate && hasAmount && hasDesc
}

type DataType = 'debt_accounts' | 'subscriptions' | 'budget_categories' | 'transactions'

function detectDataType(headers: string[]): DataType {
  // Check for transaction CSV first (bank statements)
  if (isTransactionCSV(headers)) {
    const bankFmt = detectBankFormat(headers)
    if (bankFmt) return 'transactions'
    // Even without known bank format, if it looks like transactions, treat as such
    const hLower = headers.map(h => h.toLowerCase().trim())
    const hasTxnSignals = hLower.some(h => h.includes('transaction') || h.includes('posting') || h.includes('post date'))
    if (hasTxnSignals) return 'transactions'
  }

  const debtScore = scoreHeaders(headers, DEBT_PATTERNS)
  const subScore = scoreHeaders(headers, SUB_PATTERNS)
  const budgetScore = scoreHeaders(headers, BUDGET_PATTERNS)

  // Transactions can also win via column pattern matching
  if (isTransactionCSV(headers)) {
    const txnScore = 3 // date + amount + desc matched
    if (txnScore > debtScore && txnScore > subScore && txnScore > budgetScore) return 'transactions'
  }

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

// ── Transaction row parser ─────────────────────────────────────────────────

function parseTransactionDate(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim()
  // Try MM/DD/YYYY or MM/DD/YY
  const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdyMatch) {
    let year = parseInt(mdyMatch[3])
    if (year < 100) year += 2000
    const month = mdyMatch[1].padStart(2, '0')
    const day = mdyMatch[2].padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  // Try YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  // Try "Mon DD, YYYY" (e.g. "Jan 15, 2025")
  const namedMatch = s.match(/^(\w{3})\s+(\d{1,2}),?\s+(\d{4})/)
  if (namedMatch) {
    const months: Record<string, string> = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' }
    const m = months[namedMatch[1].toLowerCase()]
    if (m) return `${namedMatch[3]}-${m}-${namedMatch[2].padStart(2, '0')}`
  }
  return null
}

function parseTransactionRows(
  rawRows: Record<string, unknown>[],
  headers: string[],
  accountName: string
): { rows: Record<string, unknown>[]; bankFormat: string } {
  const bankFormat = detectBankFormat(headers) || 'generic'
  const config = BANK_FORMATS[bankFormat]

  // Find column names
  const hLower = headers.map(h => h.toLowerCase().trim())
  const findCol = (pats: string[]) => {
    for (const p of pats) {
      const idx = hLower.findIndex(h => h.includes(p) || p.includes(h))
      if (idx !== -1) return headers[idx]
    }
    return undefined
  }

  const dateCol = findCol(config.dateCol)
  const descCol = findCol(config.descCol)
  const amountCol = findCol(config.amountCol)
  const catCol = findCol(config.categoryCol)

  const rows: Record<string, unknown>[] = []
  for (const raw of rawRows) {
    const dateStr = dateCol ? parseTransactionDate(raw[dateCol]) : null
    if (!dateStr) continue

    const description = descCol ? String(raw[descCol] ?? '').trim() : ''
    if (!description) continue

    let rawAmount = parseCurrency(amountCol ? raw[amountCol] : null)
    if (rawAmount == null) continue

    // Normalize sign: we want charges (spending) as positive, payments/credits as negative
    let amount: number
    switch (config.signLogic) {
      case 'chase':
        // Chase: negative = charge, positive = payment/refund
        amount = -rawAmount
        break
      case 'amex':
        // AmEx: positive = charge, negative = credit/payment
        amount = rawAmount
        break
      case 'bofa':
        // BofA: negative = charge, positive = deposit
        amount = -rawAmount
        break
      default:
        // Generic: assume negative = charge
        amount = rawAmount < 0 ? -rawAmount : rawAmount
    }

    // Skip payments/credits for now (they show as negative after normalization)
    const isPayment = amount < 0
    const category = catCol ? String(raw[catCol] ?? '').trim() : autoCategory(description)

    rows.push({
      transaction_date: dateStr,
      merchant: description,
      amount: Math.abs(amount),
      category: category || autoCategory(description),
      account_name: accountName,
      is_credit: isPayment,
      original_description: description,
    })
  }

  return { rows, bankFormat }
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

  // Handle transactions separately
  if (detectedType === 'transactions') {
    if (!accountName) {
      return NextResponse.json({ error: 'Account name is required for transaction imports' }, { status: 400 })
    }
    const { rows: parsed, bankFormat } = parseTransactionRows(rawRows, headers, accountName)
    return NextResponse.json({
      detectedType: 'transactions',
      headers,
      columnMap: { bankFormat },
      rows: parsed,
      sheetName,
      totalRaw: rawRows.length,
      totalParsed: parsed.length,
      bankFormat,
      accountName,
    })
  }

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

  const { rows, dataType, mode, accountName } = (await request.json()) as {
    rows: Record<string, unknown>[]
    dataType: DataType
    mode: 'replace' | 'upsert'
    accountName?: string
  }

  if (!rows || !dataType) {
    return NextResponse.json({ error: 'rows and dataType are required' }, { status: 400 })
  }

  const service = await createServiceClient()

  let imported = 0
  let errors = 0

  // Transactions use ON CONFLICT DO NOTHING for dedup
  if (dataType === 'transactions') {
    // Add user_id to each row
    const rowsWithUser = rows.map(r => ({ ...r, user_id: user.id }))

    // Batch insert with dedup — insert in chunks of 500
    const BATCH = 500
    for (let i = 0; i < rowsWithUser.length; i += BATCH) {
      const chunk = rowsWithUser.slice(i, i + BATCH)
      const { data, error } = await service
        .from('transactions')
        .upsert(chunk, {
          onConflict: 'user_id,transaction_date,merchant,amount,account_name',
          ignoreDuplicates: true,
        })
        .select('id')

      if (error) {
        console.error('[import] Transaction batch error:', error)
        errors += chunk.length
      } else {
        imported += data?.length ?? 0
      }
    }

    // Also snapshot the import as a balance event if accountName provided
    if (accountName) {
      const totalSpend = rows
        .filter(r => !r.is_credit)
        .reduce((s, r) => s + (Number(r.amount) || 0), 0)
      const totalCredits = rows
        .filter(r => r.is_credit)
        .reduce((s, r) => s + (Number(r.amount) || 0), 0)

      await service.from('balance_snapshots').insert({
        user_id: user.id,
        account_name: accountName,
        snapshot_date: new Date().toISOString().split('T')[0],
        total_charges: totalSpend,
        total_credits: totalCredits,
        transaction_count: rows.length,
      }).select()
    }

    return NextResponse.json({ imported, errors, dataType, mode: 'dedup', skipped: rows.length - imported - errors })
  }

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
