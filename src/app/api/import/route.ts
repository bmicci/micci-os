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

type BankFormat = 'chase' | 'chase_checking' | 'amex' | 'bofa' | 'generic'

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
  chase_checking: {
    dateCol: ['posting date', 'date'],
    descCol: ['description'],
    amountCol: ['amount'],
    categoryCol: [], // ignore Chase "Type" (ACH_DEBIT/DEPOSIT) — use autoCategory on description
    signLogic: 'bofa', // negative = outflow (bills/payments), positive = inflow (deposits)
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
  // ════════════════════════════════════════════════════════════════════════
  // Checking-account ACH patterns — MUST precede merchant/spend rules.
  // First match wins. These keep the burn-rate calc honest:
  //   · 'Card Payment' & 'Transfer' = EXCLUDED from spend (avoid double-count)
  //   · 'Debt Service', 'Taxes' = REAL costs, included
  //   · 'Income' = real inflows (payroll / unemployment / HSA)
  // ════════════════════════════════════════════════════════════════════════
  // Income — payroll, unemployment, HSA reimbursements (check before payment rules)
  [/jpmorgan\s*chase.*payroll|twc-benefits|ui\s*benefit|inspira|payroll\s*dd/i, 'Income'],
  // Credit-card / BNPL payments OUT of checking — settle card charges, EXCLUDE from spend
  [/chase\s*credit\s*crd\s*autopay|payment\s*to\s*chase\s*card|jpmorgan\s*chase\s*b\s*payments|applecard\s*gsbank|apple\s*card.*payment|bk\s*of\s*amer\s*mc|bank\s*of\s*america\s*payment|amex\s*epayment|american\s*express\s*ach\s*pmt|amex.*ach\s*pmt|citi\s*autopay|citibank.*payment|best\s*buy.*(auto\s*pymt|payment|pmt)|nordstrom.*(pymt|payment)|home\s*depot.*(online\s*pmt|pymt)|nefurnmart|nfmcardpmt|discover.*e-?pay|synchrony.*(pay|pmt)|affirm.*(pay|pmt)|paypal.*(credit|repaymen|inst\s*xfer)|credit\s*card\s*payment/i, 'Card Payment'],
  // Debt service — HELOC, auto/personal loans, installment lines (REAL cost, keep)
  [/credit\s*union\s*of\s+billpay|cutx\s+billpay|virginia\s*cu.*loan|va\s*fcu\s*loan|lightstream|sofi\s*bank|sofi.*pymt|citizens\s*pay\s*line|lawrence.*line\s*of\s*cr/i, 'Debt Service'],
  // Taxes — IRS, county property tax, withholding
  [/irs\s*usataxpymt|usataxpymt|federal\s*interest\s*withheld|dallas\s*c(ty|ounty).*tax|tax\s*pmt/i, 'Taxes'],
  // Internal / peer transfers, balance-transfer funding, investing sweeps — EXCLUDE
  [/apple\s*cash\s*bank\s*xfer|chase\s*credit\s*crd\s*baltran|zelle\s*payment\s*(to|from)|virginia\s*fcu\s*xternal|external\s*transfer|acctverify|wire\s*transfer|wealthfront|venmo/i, 'Transfer'],
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
  // Chase checking: "Details","Posting Date","Description","Amount","Type","Balance"
  // Distinguished from Chase credit cards by the running "Balance" column.
  if (hLower.some(h => h === 'posting date') && hLower.some(h => h === 'balance') && hLower.some(h => h === 'amount'))
    return 'chase_checking'
  // Chase credit card: "Transaction Date", "Post Date", "Description", "Category", "Type", "Amount"
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

type DataType = 'debt_accounts' | 'subscriptions' | 'budget_categories' | 'transactions' | 'tax_lots' | 'investment_transactions'

// ── Investment CSV detection ──────────────────────────────────────────────

function isTaxLotCSV(headers: string[]): boolean {
  const hLower = headers.map(h => h.toLowerCase().trim())
  // Chase tax lots have: Ticker, Quantity, Value, Cost, Acquisition Date, Tax term
  const hasTicker = hLower.some(h => h === 'ticker')
  const hasQuantity = hLower.some(h => h === 'quantity')
  const hasCost = hLower.some(h => h === 'cost')
  const hasAcqDate = hLower.some(h => h.includes('acquisition date'))
  const hasTaxTerm = hLower.some(h => h.includes('tax term'))
  const hasAssetClass = hLower.some(h => h.includes('asset class'))
  // Need at least 4 of these signals
  return [hasTicker, hasQuantity, hasCost, hasAcqDate, hasTaxTerm, hasAssetClass]
    .filter(Boolean).length >= 4
}

function isInvestmentTransactionCSV(headers: string[]): boolean {
  const hLower = headers.map(h => h.toLowerCase().trim())
  // Chase investment transactions: Trade Date, Type (Buy/Sell/Dividend), Ticker, Amount USD, Tran Code
  const hasTradeDate = hLower.some(h => h === 'trade date')
  const hasTicker = hLower.some(h => h === 'ticker')
  const hasTranCode = hLower.some(h => h.includes('tran code'))
  const hasAmountUSD = hLower.some(h => h === 'amount usd')
  const hasSecurityType = hLower.some(h => h === 'security type')
  return [hasTradeDate, hasTicker, hasTranCode, hasAmountUSD, hasSecurityType]
    .filter(Boolean).length >= 3
}

function detectDataType(headers: string[]): DataType {
  // Check investment types FIRST (they also have date/amount/desc columns)
  if (isTaxLotCSV(headers)) return 'tax_lots'
  if (isInvestmentTransactionCSV(headers)) return 'investment_transactions'

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

  // Reject rows with no balance — these are likely transaction descriptions, not debt accounts
  const finalBalance = balance ?? 0
  if (finalBalance <= 0) return null

  return {
    name,
    balance: finalBalance,
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
      date: dateStr, // legacy NOT NULL column — mirror transaction_date
      merchant: description,
      amount: Math.abs(amount),
      category: category || autoCategory(description),
      account_name: accountName,
      is_income: isPayment, // payment/credit/refund — not a charge
      raw_description: description,
    })
  }

  return { rows, bankFormat }
}

// ── Investment row parsers ─────────────────────────────────────────────────

function parseDate(val: unknown): string | null {
  if (val == null || val === '') return null
  const s = String(val).trim()
  // Handle "MM/DD/YYYY HH:MM:SS" or "MM/DD/YYYY"
  const datePart = s.split(' ')[0]
  const parts = datePart.split('/')
  if (parts.length === 3) {
    const [m, d, y] = parts
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Try ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

function parseNum(val: unknown): number | null {
  if (val == null || val === '') return null
  const n = parseFloat(String(val).replace(/[$,%\s]/g, ''))
  return isNaN(n) ? null : n
}

function findHeader(headers: string[], exact: string): string | undefined {
  return headers.find(h => h.toLowerCase().trim() === exact.toLowerCase())
}

function findHeaderIncludes(headers: string[], pattern: string): string | undefined {
  return headers.find(h => h.toLowerCase().trim().includes(pattern.toLowerCase()))
}

function parseTaxLotRows(
  rawRows: Record<string, unknown>[],
  headers: string[]
): { rows: Record<string, unknown>[]; accountName: string; accountNumber: string } {
  const colAccountName = findHeader(headers, 'Account name')
  const colAccountNumber = findHeader(headers, 'Account number')
  const colTicker = findHeader(headers, 'Ticker')
  const colCusip = findHeader(headers, 'CUSIP')
  const colDescription = findHeader(headers, 'Description')
  const colAssetClass = findHeader(headers, 'Asset Class')
  const colAssetStrategy = findHeader(headers, 'Asset Strategy')
  const colQuantity = findHeader(headers, 'Quantity')
  const colPrice = findHeader(headers, 'Price')
  const colValue = findHeader(headers, 'Value')
  const colCost = findHeader(headers, 'Cost')
  const colOrigCost = findHeaderIncludes(headers, 'orig cost')
  const colUnitCost = findHeader(headers, 'Unit Cost')
  const colUnrealizedGL = findHeaderIncludes(headers, 'unrealized g/l amt')
  const colUnrealizedGLPct = findHeaderIncludes(headers, 'unrealized gain/loss (%)')
  const colAcqDate = findHeader(headers, 'Acquisition Date')
  const colTaxTerm = findHeader(headers, 'Tax term')
  const colDaysHeld = findHeader(headers, 'Days held')
  const colDaysUntilLong = findHeader(headers, 'Days until long')
  const colEstAnnualIncome = findHeader(headers, 'Est. Annual Income')
  const colAccruedIncome = findHeader(headers, 'Accrued Income')
  const colPricingDate = findHeader(headers, 'Pricing Date')
  const colAsOf = findHeader(headers, 'As of')
  const colCurrency = findHeader(headers, 'Base CCY')

  let accountName = ''
  let accountNumber = ''
  const rows: Record<string, unknown>[] = []

  for (const raw of rawRows) {
    const ticker = colTicker ? String(raw[colTicker] ?? '').trim() : ''
    if (!ticker) continue

    if (!accountName && colAccountName) accountName = String(raw[colAccountName] ?? '').trim()
    if (!accountNumber && colAccountNumber) accountNumber = String(raw[colAccountNumber] ?? '').trim()

    rows.push({
      account_name: colAccountName ? String(raw[colAccountName] ?? '').trim() : '',
      account_number: colAccountNumber ? String(raw[colAccountNumber] ?? '').trim() : '',
      ticker,
      cusip: colCusip ? String(raw[colCusip] ?? '').trim() : null,
      description: colDescription ? String(raw[colDescription] ?? '').trim() : null,
      asset_class: colAssetClass ? String(raw[colAssetClass] ?? '').trim() : null,
      asset_strategy: colAssetStrategy ? String(raw[colAssetStrategy] ?? '').trim() : null,
      quantity: colQuantity ? parseNum(raw[colQuantity]) : 0,
      price: colPrice ? parseNum(raw[colPrice]) : null,
      value: colValue ? parseNum(raw[colValue]) : null,
      cost: colCost ? parseNum(raw[colCost]) : null,
      original_cost: colOrigCost ? parseNum(raw[colOrigCost]) : null,
      unit_cost: colUnitCost ? parseNum(raw[colUnitCost]) : null,
      unrealized_gl: colUnrealizedGL ? parseNum(raw[colUnrealizedGL]) : null,
      unrealized_gl_pct: colUnrealizedGLPct ? parseNum(raw[colUnrealizedGLPct]) : null,
      acquisition_date: colAcqDate ? parseDate(raw[colAcqDate]) : null,
      tax_term: colTaxTerm ? String(raw[colTaxTerm] ?? '').trim() : null,
      days_held: colDaysHeld ? parseNum(raw[colDaysHeld]) : null,
      days_until_long: colDaysUntilLong ? parseNum(raw[colDaysUntilLong]) : null,
      est_annual_income: colEstAnnualIncome ? parseNum(raw[colEstAnnualIncome]) : null,
      accrued_income: colAccruedIncome ? parseNum(raw[colAccruedIncome]) : null,
      pricing_date: colPricingDate ? parseDate(raw[colPricingDate]) : null,
      as_of_date: colAsOf ? parseDate(raw[colAsOf]) : null,
      currency: colCurrency ? String(raw[colCurrency] ?? 'USD').trim() : 'USD',
    })
  }

  return { rows, accountName, accountNumber }
}

function parseInvestmentTransactionRows(
  rawRows: Record<string, unknown>[],
  headers: string[]
): { rows: Record<string, unknown>[]; accountName: string; accountNumber: string } {
  const colTradeDate = findHeader(headers, 'Trade Date')
  const colPostDate = findHeader(headers, 'Post Date')
  const colSettleDate = findHeader(headers, 'Settlement Date')
  const colAccountName = findHeader(headers, 'Account Name')
  const colAccountNumber = findHeader(headers, 'Account Number')
  const colType = findHeader(headers, 'Type')
  const colDescription = findHeader(headers, 'Description')
  const colCusip = findHeader(headers, 'Cusip')
  const colTicker = findHeader(headers, 'Ticker')
  const colSecurityType = findHeader(headers, 'Security Type')
  const colPriceUSD = findHeader(headers, 'Price USD')
  const colQuantity = findHeader(headers, 'Quantity')
  const colAmountUSD = findHeader(headers, 'Amount USD')
  const colIncomeUSD = findHeader(headers, 'Income USD')
  const colGLShort = findHeaderIncludes(headers, 'g/l short')
  const colGLLong = findHeaderIncludes(headers, 'g/l long')
  const colCommissions = findHeaderIncludes(headers, 'commissions')
  const colTranCode = findHeader(headers, 'Tran Code')
  const colTranCodeDesc = findHeaderIncludes(headers, 'tran code description')
  const colTaxWithheld = findHeader(headers, 'Tax Withheld')

  let accountName = ''
  let accountNumber = ''
  const rows: Record<string, unknown>[] = []

  for (const raw of rawRows) {
    const tradeDate = colTradeDate ? parseDate(raw[colTradeDate]) : null
    if (!tradeDate) continue

    if (!accountName && colAccountName) accountName = String(raw[colAccountName] ?? '').trim()
    if (!accountNumber && colAccountNumber) accountNumber = String(raw[colAccountNumber] ?? '').trim()

    const txnType = colType ? String(raw[colType] ?? '').trim() : 'Unknown'

    rows.push({
      account_name: colAccountName ? String(raw[colAccountName] ?? '').trim() : '',
      account_number: colAccountNumber ? String(raw[colAccountNumber] ?? '').trim() : '',
      trade_date: tradeDate,
      post_date: colPostDate ? parseDate(raw[colPostDate]) : null,
      settlement_date: colSettleDate ? parseDate(raw[colSettleDate]) : null,
      transaction_type: txnType,
      description: colDescription ? String(raw[colDescription] ?? '').trim() : null,
      cusip: colCusip ? String(raw[colCusip] ?? '').trim() || null : null,
      ticker: colTicker ? String(raw[colTicker] ?? '').trim() || null : null,
      security_type: colSecurityType ? String(raw[colSecurityType] ?? '').trim() || null : null,
      price: colPriceUSD ? parseNum(raw[colPriceUSD]) : null,
      quantity: colQuantity ? parseNum(raw[colQuantity]) : null,
      amount: colAmountUSD ? parseNum(raw[colAmountUSD]) : null,
      income: colIncomeUSD ? parseNum(raw[colIncomeUSD]) : null,
      gl_short: colGLShort ? parseNum(raw[colGLShort]) : null,
      gl_long: colGLLong ? parseNum(raw[colGLLong]) : null,
      commissions: colCommissions ? parseNum(raw[colCommissions]) : null,
      tran_code: colTranCode ? String(raw[colTranCode] ?? '').trim() || null : null,
      tran_code_description: colTranCodeDesc ? String(raw[colTranCodeDesc] ?? '').trim() || null : null,
      tax_withheld: colTaxWithheld ? parseNum(raw[colTaxWithheld]) : null,
      currency: 'USD',
    })
  }

  return { rows, accountName, accountNumber }
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

  // Handle investment tax lots
  if (detectedType === 'tax_lots') {
    const { rows: parsed, accountName: acctName, accountNumber: acctNum } = parseTaxLotRows(rawRows, headers)
    return NextResponse.json({
      detectedType: 'tax_lots',
      headers,
      rows: parsed,
      sheetName,
      totalRaw: rawRows.length,
      totalParsed: parsed.length,
      accountName: acctName,
      accountNumber: acctNum,
    })
  }

  // Handle investment transactions
  if (detectedType === 'investment_transactions') {
    const { rows: parsed, accountName: acctName, accountNumber: acctNum } = parseInvestmentTransactionRows(rawRows, headers)
    return NextResponse.json({
      detectedType: 'investment_transactions',
      headers,
      rows: parsed,
      sheetName,
      totalRaw: rawRows.length,
      totalParsed: parsed.length,
      accountName: acctName,
      accountNumber: acctNum,
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

    // Summary totals returned to the client (charges vs credits/income)
    const totalSpend = rows
      .filter(r => !r.is_income)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const totalCredits = rows
      .filter(r => r.is_income)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)

    return NextResponse.json({
      imported,
      errors,
      dataType,
      mode: 'dedup',
      skipped: rows.length - imported - errors,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
    })
  }

  // Investment tax lots: upsert with account auto-creation
  if (dataType === 'tax_lots') {
    const acctName = String(rows[0]?.account_name ?? '')
    const acctNumber = String(rows[0]?.account_number ?? '')

    // Upsert investment_account
    const { data: acctData } = await service
      .from('investment_accounts')
      .upsert({
        user_id: user.id,
        account_name: acctName,
        account_number: acctNumber,
        account_type: 'Brokerage',
        institution: 'Chase',
        as_of_date: rows[0]?.as_of_date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,account_name,account_number' })
      .select('id')
      .single()

    const accountId = acctData?.id || null

    // Clear existing lots for this account and re-import (replace strategy)
    if (accountId) {
      await service.from('tax_lots').delete().eq('account_id', accountId)
    }

    const rowsWithUser = rows.map(r => ({
      ...r,
      user_id: user.id,
      account_id: accountId,
    }))

    const BATCH = 100
    for (let i = 0; i < rowsWithUser.length; i += BATCH) {
      const chunk = rowsWithUser.slice(i, i + BATCH)
      const { data, error } = await service
        .from('tax_lots')
        .upsert(chunk, {
          onConflict: 'user_id,account_name,ticker,acquisition_date,quantity',
          ignoreDuplicates: false,
        })
        .select('id')

      if (error) {
        console.error('[import] Tax lot batch error:', error)
        errors += chunk.length
      } else {
        imported += data?.length ?? 0
      }
    }

    // Update account totals
    if (accountId) {
      const totalValue = rows.reduce((s, r) => s + (Number(r.value) || 0), 0)
      const totalCost = rows.reduce((s, r) => s + (Number(r.cost) || 0), 0)
      const totalGL = rows.reduce((s, r) => s + (Number(r.unrealized_gl) || 0), 0)
      await service.from('investment_accounts').update({
        total_value: Math.round(totalValue * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        unrealized_gl: Math.round(totalGL * 100) / 100,
        updated_at: new Date().toISOString(),
      }).eq('id', accountId)
    }

    return NextResponse.json({ imported, errors, dataType, mode: 'replace', accountId })
  }

  // Investment transactions: upsert with dedup
  if (dataType === 'investment_transactions') {
    const acctName = String(rows[0]?.account_name ?? '')
    const acctNumber = String(rows[0]?.account_number ?? '')

    // Upsert investment_account
    const { data: acctData } = await service
      .from('investment_accounts')
      .upsert({
        user_id: user.id,
        account_name: acctName,
        account_number: acctNumber,
        account_type: 'Brokerage',
        institution: 'Chase',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,account_name,account_number' })
      .select('id')
      .single()

    const accountId = acctData?.id || null

    const rowsWithUser = rows.map(r => ({
      ...r,
      user_id: user.id,
      account_id: accountId,
    }))

    const BATCH = 100
    for (let i = 0; i < rowsWithUser.length; i += BATCH) {
      const chunk = rowsWithUser.slice(i, i + BATCH)
      const { data, error } = await service
        .from('investment_transactions')
        .upsert(chunk, {
          onConflict: 'user_id,account_name,trade_date,ticker,transaction_type,amount',
          ignoreDuplicates: true,
        })
        .select('id')

      if (error) {
        console.error('[import] Investment txn batch error:', error)
        errors += chunk.length
      } else {
        imported += data?.length ?? 0
      }
    }

    return NextResponse.json({ imported, errors, dataType, mode: 'dedup', accountId, skipped: rows.length - imported - errors })
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
