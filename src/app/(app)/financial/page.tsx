import { createClient } from '@/lib/supabase/server'
import KPIStrip from '@/components/financial/KPIStrip'
import ModuleTracker from '@/components/financial/ModuleTracker'
import DebtTable from '@/components/financial/DebtTable'
import DebtDonut from '@/components/financial/DebtDonut'
import DeadlineTimeline, { type Deadline } from '@/components/financial/DeadlineTimeline'
import SubscriptionBurn from '@/components/financial/SubscriptionBurn'
import TaxSnapshot from '@/components/financial/TaxSnapshot'
import BudgetBreakdown from '@/components/financial/BudgetBreakdown'
import DocumentUpload from '@/components/DocumentUpload'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Financial — Micci OS' }

// ── Hardcoded deadlines (dates don't change) ──────────────────────────────
const DEADLINE_SEEDS: Array<Omit<Deadline, 'daysRemaining'> & { isoDate: string }> = [
  {
    date: 'Mar 19, 2026',
    isoDate: '2026-03-19',
    label: 'HELOC Close Deadline',
    urgency: 'critical',
    note: 'Last day at JPMC — must close while employed, lender requires active income verification',
  },
  {
    date: 'May 15, 2026',
    isoDate: '2026-05-15',
    label: 'DCAD Property Tax Protest',
    urgency: 'high',
    note: 'File at ifile.dallascad.org — protest $850K assessment before deadline',
  },
  {
    date: 'Jun 27, 2026',
    isoDate: '2026-06-27',
    label: 'Best Buy Promo Expires',
    urgency: 'high',
    note: '$1,312 balance — pay off or $339 deferred interest hits immediately',
  },
  {
    date: 'Jul 2026',
    isoDate: '2026-07-01',
    label: 'Chase CFU Promo Starts Expiring',
    urgency: 'medium',
    note: '$22,531 — pay from HELOC as individual purchase buckets expire Jul–Dec 2026',
  },
  {
    date: 'Apr 15, 2027',
    isoDate: '2027-04-15',
    label: '2026 Tax Return Due',
    urgency: 'low',
    note: 'Partial JPMC year + new job income — may need quarterly estimated payments in 2026',
  },
  {
    date: 'Jun 18, 2027',
    isoDate: '2027-06-18',
    label: 'Citi Diamond 0% Expires',
    urgency: 'low',
    note: '$12,476 — longest runway, pay from HELOC before expiry to avoid deferred interest',
  },
]

function daysUntil(isoDate: string): number | null {
  const diff = Math.ceil(
    (new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  return diff > 0 ? diff : null
}

// ── Page ─────────────────────────────────────────────────────────────────
export default async function FinancialPage() {
  const supabase = await createClient()

  const [
    { data: accounts },
    { data: modules },
    { data: subscriptions },
    { data: budgets },
  ] = await Promise.all([
    supabase
      .from('debt_accounts')
      .select('*')
      .order('balance', { ascending: false }),
    supabase
      .from('financial_modules')
      .select('*')
      .order('module_number'),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true),
    supabase
      .from('budget_categories')
      .select('*')
      .order('pct_of_total', { ascending: false }),
  ])

  // Compute days remaining server-side to avoid hydration mismatch
  const deadlines: Deadline[] = DEADLINE_SEEDS.map((d) => ({
    date: d.date,
    label: d.label,
    urgency: d.urgency,
    note: d.note,
    daysRemaining:
      d.urgency === 'critical' || d.urgency === 'high' ? daysUntil(d.isoDate) : null,
  }))

  const march19Days = daysUntil('2026-03-19')

  return (
    <div className="px-6 md:px-10 py-8 space-y-10">

      {/* ── Section 1: Header ── */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-1">💰 Financial Command Center</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          March 2026 · Survival Budget Mode · JPMC Exit: March 19
        </p>
      </div>

      {/* ── Urgency Banner ── */}
      {march19Days != null && (
        <div className="rounded-xl p-4 bg-red-500/15 border border-red-500/30 flex items-start gap-3">
          <span className="text-xl mt-0.5 shrink-0">⚡</span>
          <div>
            <p className="font-semibold text-red-300">
              HELOC closing window:{' '}
              <span className="font-mono text-red-400">{march19Days}</span>{' '}
              day{march19Days !== 1 ? 's' : ''} remaining
            </p>
            <p className="text-xs text-red-300/70 mt-0.5">
              Must close before last day at JPMC — employment income required for lender approval
            </p>
          </div>
        </div>
      )}

      {/* ── Section 2: KPI Strip ── */}
      <KPIStrip
        accounts={accounts}
        modules={modules}
        subscriptions={subscriptions}
      />

      {/* ── Section 3: Budget Breakdown ── */}
      <BudgetBreakdown categories={budgets} />

      {/* ── Section 4: Module Tracker ── */}
      <ModuleTracker modules={modules} />

      {/* ── Section 4: Debt Overview ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          🏦 Debt Overview
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DebtTable accounts={accounts} />
          </div>
          <div>
            <DebtDonut accounts={accounts} />
          </div>
        </div>
      </section>

      {/* ── Section 5: Deadline Timeline ── */}
      <DeadlineTimeline deadlines={deadlines} />

      {/* ── Section 6: Subscriptions Burn ── */}
      <SubscriptionBurn subscriptions={subscriptions} />

      {/* ── Section 7: Tax Snapshot ── */}
      <TaxSnapshot />

      {/* ── Document Upload ── */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          📎 Documents
        </h2>
        <DocumentUpload section="financial" />
      </section>

    </div>
  )
}
