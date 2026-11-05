import { createServiceClient } from '@/lib/supabase/service'
import HELOCTracker from '@/components/financial/simulators/HELOCTracker'
import type { HELOCDebtAccount, AccountType } from '@/types/finance'
import { getFinancialData } from '@/lib/financial-data-service'
import type { DebtAccount } from '@/lib/financial-data'
import { HELOC_LIMIT } from '@/lib/finance/heloc'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'HELOC Tracker — Micci OS' }

/**
 * Bug 2 fix: Parse a deadline date out of the notes field.
 * Handles formats like:
 *   "DEADLINE 06/27/26", "exp 07/09/26", "expires 06/18/27",
 *   "0% promo expires 07/22/2026", "expires Jun 18, 2027"
 */
function parseDeadlineFromNotes(
  notes: string | null,
  accountType: string | null,
): { promoExpiry: string | null; deferredExpiry: string | null } {
  if (!notes) return { promoExpiry: null, deferredExpiry: null }

  let dateStr: string | null = null

  // MM/DD/YY or MM/DD/YYYY
  const slashMatch = notes.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    const year = y.length === 2 ? '20' + y : y
    dateStr = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // "Jun 18, 2027" or "June 18, 2027"
  if (!dateStr) {
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    }
    const monMatch = notes.match(
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
    )
    if (monMatch) {
      const mon = monthMap[monMatch[1].toLowerCase().slice(0, 3)]
      if (mon) dateStr = `${monMatch[3]}-${mon}-${monMatch[2].padStart(2, '0')}`
    }
  }

  if (!dateStr) return { promoExpiry: null, deferredExpiry: null }

  // Deferred interest if account type is deferred_interest OR notes mention DEADLINE/deferred
  const isDeferred =
    accountType === 'deferred_interest' ||
    /\bdeferred\b/i.test(notes) ||
    /\bDEADLINE\b/.test(notes)

  return isDeferred
    ? { promoExpiry: null, deferredExpiry: dateStr }
    : { promoExpiry: dateStr, deferredExpiry: null }
}

function mapAccountType(dbType: string | null): AccountType {
  const map: Record<string, AccountType> = {
    credit_card: 'credit_card',
    loan: 'personal_loan',
    personal_loan: 'personal_loan',
    mortgage: 'mortgage',
    heloc: 'heloc',
    line_of_credit: 'line_of_credit',
    deferred_interest: 'deferred_interest',
    auto_loan: 'auto_loan',
    charge_plan: 'charge_plan',
    other: 'other',
  }
  return (dbType && map[dbType]) ? map[dbType] : 'other'
}

function inferStatus(
  name: string,
  rate: number,
  balance: number,
  accountType: string | null,
  notes: string | null,
): HELOCDebtAccount['status'] {
  if (balance === 0) return 'paid_off'

  const n = name.toLowerCase()
  const notesLower = (notes ?? '').toLowerCase()

  // Deferred interest (e.g. Best Buy promotions)
  if (
    accountType === 'deferred_interest' ||
    notesLower.includes('deferred') ||
    n.includes('best buy')
  ) {
    return 'deferred'
  }

  // 0% promotional rate
  if (rate === 0) return 'promo_hold'

  // Accounts that were rolled into the HELOC (paid off via the initial draw)
  if (notesLower.includes('rolled in')) return 'rolled'

  // The HELOC line itself — the draw vehicle, not a "rolled" item
  if (accountType === 'heloc') return 'keep'

  // All other debts: still being paid separately
  return 'keep'
}

async function fetchDebtAccounts(live: DebtAccount[]): Promise<HELOCDebtAccount[] | null> {
  try {
    const supabase = createServiceClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('debt_accounts')
      .select('*')
      .order('balance', { ascending: false })

    if (error) {
      console.error('[heloc/page] Supabase error:', error.message)
      return null
    }

    if (!data || data.length === 0) return null

    // Prefer the live bank balance (Plaid overlay) over the hand-entered row
    const liveByName = new Map(live.map(d => [d.name, d]))
    return data.map((row, i) => {
      const lv = liveByName.get(row.name)
      const balance = lv ? lv.balance : Number(row.balance ?? 0)
      // Rates are stored as percent values (6.85 = 6.85%) — same convention
      // as financial-data-service.ts. Do not multiply.
      const ratePercent = Number(row.interest_rate ?? 0)

      // Bug 2 fix: parse promoExpiry / deferredExpiry from the notes field.
      const { promoExpiry, deferredExpiry } = parseDeadlineFromNotes(
        row.notes ?? null,
        row.account_type ?? null,
      )

      return {
        id: row.id ?? String(i + 1),
        userId: '',
        accountName: row.name,
        accountType: mapAccountType(row.account_type),
        originalBalance: balance,
        currentBalance: balance,
        interestRate: ratePercent,
        monthlyPayment: lv?.min ?? Number(row.minimum_payment ?? 0),
        status: inferStatus(row.name, ratePercent, balance, row.account_type, row.notes),
        rollDate: null,
        promoExpiry,
        deferredExpiry,
        notes: row.notes ?? null,
      } satisfies HELOCDebtAccount
    })
  } catch (err) {
    console.error('[heloc/page] Unexpected error fetching debt accounts:', err)
    return null
  }
}

export default async function HELOCPage() {
  const data = await getFinancialData()
  const initialAccounts = await fetchDebtAccounts(data.debts)
  const heloc = initialAccounts?.find(a => a.accountType === 'heloc')
  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-4 md:px-6 py-4"
        style={{ borderBottom: '1px solid var(--glass-line)' }}
      >
        <h1 className="text-lg font-bold gradient-text">HELOC Tracker</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {heloc
            ? `${usd(heloc.currentBalance)} drawn of ${usd(HELOC_LIMIT)} @ ${heloc.interestRate}% (variable) · ${usd(HELOC_LIMIT - heloc.currentBalance)} left`
            : 'No HELOC row found in debt accounts'} · payoff timeline + promo deadlines
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <HELOCTracker initialAccounts={initialAccounts ?? undefined} />
      </div>
    </div>
  )
}
