import { createClient } from '@/lib/supabase/server'
import DocumentUpload from '@/components/DocumentUpload'

export const metadata = { title: 'Financial — Micci OS' }

// ── Types ──────────────────────────────────────────────────────────────────

interface BudgetCategory {
  id: string
  name: string
  monthly_actual: number | null
  annual_actual: number | null
  survival_budget: number | null
  pct_of_total: number | null
  color: string | null
}

interface Subscription {
  id: string
  name: string
  amount: number | null
  billing_cycle: string | null
  category: string | null
  action: string | null
  is_active: boolean
}

interface DebtAccount {
  id: string
  name: string
  account_type: string | null
  balance: number | null
  interest_rate: number | null
  minimum_payment: number | null
  due_day: number | null
  status: string | null
}

interface FinancialModule {
  id: string
  name: string
  category: string | null
  status: string | null
  progress: number | null
  description: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const fmtDec = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const toMonthly = (sub: Subscription) => {
  const amt = sub.amount ?? 0
  if (sub.billing_cycle === 'annual') return amt / 12
  if (sub.billing_cycle === 'weekly') return amt * 4.33
  return amt
}

const ACTION_ORDER = ['essential', 'keep', 'review', 'cancel'] as const

const ACTION_STYLES: Record<string, string> = {
  essential: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  keep:      'bg-green-500/20 text-green-300 border border-green-500/30',
  review:    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  cancel:    'bg-red-500/20 text-red-300 border border-red-500/30',
}

const STATUS_STYLES: Record<string, string> = {
  active:       'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  paid_off:     'bg-green-500/20 text-green-300 border border-green-500/30',
  closed:       'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  negotiating:  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
}

const MODULE_STATUS_STYLES: Record<string, string> = {
  active:     'bg-cyan-500/20 text-cyan-300',
  completed:  'bg-green-500/20 text-green-300',
  pending:    'bg-yellow-500/20 text-yellow-300',
  paused:     'bg-gray-500/20 text-gray-400',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
      {children}
    </h2>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function SummaryPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-4 py-3 min-w-[140px]">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-[var(--text-primary)] mt-0.5">{value}</p>
      {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Sections ───────────────────────────────────────────────────────────────

function BudgetSection({ rows }: { rows: BudgetCategory[] }) {
  const totalMonthly  = rows.reduce((s, r) => s + (r.monthly_actual ?? 0), 0)
  const totalAnnual   = rows.reduce((s, r) => s + (r.annual_actual ?? 0), 0)
  const totalSurvival = rows.reduce((s, r) => s + (r.survival_budget ?? 0), 0)

  return (
    <section>
      <SectionHeading>📊 Budget Categories</SectionHeading>
      <div className="flex flex-wrap gap-3 mb-4">
        <SummaryPill label="Monthly Actual" value={fmt(totalMonthly)} />
        <SummaryPill label="Annual Actual"  value={fmt(totalAnnual)} />
        <SummaryPill label="Survival Budget" value={fmt(totalSurvival)} sub="per month" />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 w-6"></th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Monthly</th>
                <th className="text-right px-4 py-3">Annual</th>
                <th className="text-right px-4 py-3">Survival</th>
                <th className="text-right px-4 py-3 min-w-[120px]">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ background: row.color ?? '#555' }}
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{fmt(row.monthly_actual)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{fmt(row.annual_actual)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{fmt(row.survival_budget)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--accent-cyan)]"
                          style={{ width: `${Math.min(row.pct_of_total ?? 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-[var(--text-secondary)] w-10 text-right">
                        {row.pct_of_total != null ? `${row.pct_of_total.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-[var(--text-primary)] font-semibold bg-white/5">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-[var(--text-muted)] uppercase text-xs tracking-wide">Total</td>
                <td className="px-4 py-3 text-right">{fmt(totalMonthly)}</td>
                <td className="px-4 py-3 text-right">{fmt(totalAnnual)}</td>
                <td className="px-4 py-3 text-right">{fmt(totalSurvival)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </section>
  )
}

function SubscriptionsSection({ rows }: { rows: Subscription[] }) {
  const totalMonthly = rows.reduce((s, r) => s + toMonthly(r), 0)

  const grouped = ACTION_ORDER.reduce<Record<string, Subscription[]>>((acc, action) => {
    acc[action] = rows.filter((r) => r.action === action)
    return acc
  }, {})

  return (
    <section>
      <SectionHeading>💳 Subscriptions</SectionHeading>
      <div className="flex flex-wrap gap-3 mb-4">
        <SummaryPill label="Monthly Equivalent" value={fmtDec(totalMonthly)} sub={`${rows.length} active`} />
      </div>
      <div className="space-y-4">
        {ACTION_ORDER.map((action) => {
          const group = grouped[action]
          if (!group || group.length === 0) return null
          const groupTotal = group.reduce((s, r) => s + toMonthly(r), 0)
          return (
            <Card key={action}>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge label={action} className={ACTION_STYLES[action] ?? ''} />
                  <span className="text-[var(--text-muted)] text-xs">{group.length} items</span>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{fmtDec(groupTotal)}/mo</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {group.map((sub) => (
                    <tr key={sub.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5 text-[var(--text-primary)]">{sub.name}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs capitalize hidden sm:table-cell">{sub.category}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{fmtDec(sub.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--text-muted)] text-xs capitalize">{sub.billing_cycle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

function DebtSection({ rows }: { rows: DebtAccount[] }) {
  const sorted = [...rows].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
  const totalBalance = rows.reduce((s, r) => s + (r.balance ?? 0), 0)
  const totalMinPay  = rows.reduce((s, r) => s + (r.minimum_payment ?? 0), 0)

  return (
    <section>
      <SectionHeading>🏦 Debt Accounts</SectionHeading>
      <div className="flex flex-wrap gap-3 mb-4">
        <SummaryPill label="Total Balance" value={fmt(totalBalance)} />
        <SummaryPill label="Min Payments" value={fmtDec(totalMinPay)} sub="per month" />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Account</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-right px-4 py-3">Balance</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">APR</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Min Pay</th>
                <th className="text-right px-4 py-3 hidden lg:table-cell">Due</th>
                <th className="text-right px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((acct) => (
                <tr key={acct.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{acct.name}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] capitalize text-xs hidden sm:table-cell">
                    {acct.account_type?.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{fmtDec(acct.balance)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)] hidden md:table-cell">
                    {acct.interest_rate != null ? `${acct.interest_rate}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)] hidden md:table-cell">
                    {fmtDec(acct.minimum_payment)}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-muted)] hidden lg:table-cell">
                    {acct.due_day ? `Day ${acct.due_day}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      label={acct.status ?? 'unknown'}
                      className={STATUS_STYLES[acct.status ?? ''] ?? 'bg-gray-500/20 text-gray-400'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-[var(--text-primary)] font-semibold bg-white/5">
                <td className="px-4 py-3 text-[var(--text-muted)] uppercase text-xs tracking-wide" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right">{fmtDec(totalBalance)}</td>
                <td className="px-4 py-3 hidden md:table-cell" />
                <td className="px-4 py-3 text-right hidden md:table-cell">{fmtDec(totalMinPay)}</td>
                <td className="px-4 py-3 hidden lg:table-cell" />
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </section>
  )
}

function ModulesSection({ rows }: { rows: FinancialModule[] }) {
  return (
    <section>
      <SectionHeading>🗂 Financial Modules</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((mod) => (
          <Card key={mod.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{mod.name}</h3>
              <div className="flex items-center gap-2 shrink-0">
                {mod.category && (
                  <span className="text-xs text-[var(--text-muted)] bg-white/5 rounded px-2 py-0.5">
                    {mod.category}
                  </span>
                )}
                {mod.status && (
                  <Badge
                    label={mod.status}
                    className={`${MODULE_STATUS_STYLES[mod.status] ?? 'bg-gray-500/20 text-gray-400'} text-xs`}
                  />
                )}
              </div>
            </div>
            {mod.description && (
              <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">{mod.description}</p>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-blue)]"
                  style={{ width: `${mod.progress ?? 0}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] w-10 text-right">{mod.progress ?? 0}%</span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function FinancialPage() {
  const supabase = await createClient()

  const [
    { data: budgetCategories },
    { data: subscriptions },
    { data: debtAccounts },
    { data: financialModules },
  ] = await Promise.all([
    supabase.from('budget_categories').select('*').order('monthly_actual', { ascending: false }),
    supabase.from('subscriptions').select('*').eq('is_active', true).order('amount', { ascending: false }),
    supabase.from('debt_accounts').select('*').order('balance', { ascending: false }),
    supabase.from('financial_modules').select('*').order('progress', { ascending: false }),
  ])

  return (
    <div className="px-6 md:px-10 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-1">💰 Financial</h1>
        <p className="text-[var(--text-secondary)] text-sm">Net worth · Budgets · Debt · Subscriptions</p>
      </div>

      {/* Sections */}
      {budgetCategories && budgetCategories.length > 0 && (
        <BudgetSection rows={budgetCategories as BudgetCategory[]} />
      )}

      {subscriptions && subscriptions.length > 0 && (
        <SubscriptionsSection rows={subscriptions as Subscription[]} />
      )}

      {debtAccounts && debtAccounts.length > 0 && (
        <DebtSection rows={debtAccounts as DebtAccount[]} />
      )}

      {financialModules && financialModules.length > 0 && (
        <ModulesSection rows={financialModules as FinancialModule[]} />
      )}

      {/* Document Upload */}
      <section>
        <SectionHeading>📎 Documents</SectionHeading>
        <DocumentUpload section="financial" />
      </section>
    </div>
  )
}
