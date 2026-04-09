import { createServiceClient } from '@/lib/supabase/service'
import HELOCTracker from '@/components/financial/simulators/HELOCTracker'
import type { HELOCDebtAccount, AccountType } from '@/types/finance'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'HELOC Tracker — Micci OS' }

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

  // High-rate or standard debt (including the HELOC balance itself) → rolled
  return 'rolled'
}

async function fetchDebtAccounts(): Promise<HELOCDebtAccount[] | null> {
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

    return data.map((row, i) => {
      const balance = Number(row.balance ?? 0)
      const rate = Number(row.interest_rate ?? 0)
      return {
        id: row.id ?? String(i + 1),
        userId: '',
        accountName: row.name,
        accountType: mapAccountType(row.account_type),
        originalBalance: balance,
        currentBalance: balance,
        interestRate: rate,
        monthlyPayment: Number(row.minimum_payment ?? 0),
        status: inferStatus(row.name, rate, balance, row.account_type, row.notes),
        rollDate: null,
        promoExpiry: null,
        deferredExpiry: null,
        notes: row.notes ?? null,
      } satisfies HELOCDebtAccount
    })
  } catch (err) {
    console.error('[heloc/page] Unexpected error fetching debt accounts:', err)
    return null
  }
}

export default async function HELOCPage() {
  const initialAccounts = await fetchDebtAccounts()

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <h1 className="text-lg font-bold gradient-text">🏦 HELOC Consolidation Tracker</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          $190K limit @ 6.85% · First draw: ~$153K · Balance timeline + deadline countdowns
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <HELOCTracker initialAccounts={initialAccounts ?? undefined} />
      </div>
    </div>
  )
}
