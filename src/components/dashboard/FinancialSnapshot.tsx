import Link from 'next/link'

interface DebtAccount { balance: number | null }
interface Subscription { amount: number | null; billing_cycle: string | null; action: string | null }
interface FinancialModule { status: string | null }
interface BudgetCategory { monthly_actual: number | null; survival_budget: number | null }

interface Props {
  accounts: DebtAccount[] | null
  subscriptions: Subscription[] | null
  modules: FinancialModule[] | null
  budgets: BudgetCategory[] | null
}

function toMonthly(s: Subscription) {
  const a = s.amount ?? 0
  if (s.billing_cycle === 'annual') return a / 12
  if (s.billing_cycle === 'weekly') return a * 4.33
  return a
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export default function FinancialSnapshot({ accounts, subscriptions, modules, budgets }: Props) {
  const accts = accounts ?? []
  const subs = subscriptions ?? []
  const mods = modules ?? []
  const bkts = budgets ?? []

  const totalDebt = accts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const monthlyBurn = subs.filter(s => s.action !== 'cancel').reduce((s, sub) => s + toMonthly(sub), 0)
  const completed = mods.filter(m => m.status === 'complete').length
  const totalSurvival = bkts.reduce((s, b) => s + (b.survival_budget ?? 0), 0)
  const totalActual = bkts.reduce((s, b) => s + (b.monthly_actual ?? 0), 0)
  const budgetGap = totalActual - totalSurvival

  const kpis = [
    { label: 'Total Debt', value: fmt(totalDebt), valueClass: 'text-red-400', sub: 'across all accounts' },
    { label: 'Sub Burn / mo', value: fmt(monthlyBurn), valueClass: 'gradient-text', sub: 'active subscriptions' },
    { label: 'Budget Gap', value: (budgetGap > 0 ? '+' : '') + fmt(budgetGap), valueClass: budgetGap > 0 ? 'text-red-400' : 'text-green-400', sub: 'actual vs survival' },
    { label: 'Modules Done', value: `${completed} / ${mods.length}`, valueClass: 'gradient-text', sub: 'financial tasks' },
  ]

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          💰 Financial Snapshot
        </h2>
        <Link href="/financial" className="text-xs text-[var(--accent-cyan)] hover:underline">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-0.5">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{k.label}</p>
            <p className={`text-xl font-bold font-mono ${k.valueClass}`}>{k.value}</p>
            <p className="text-[11px] text-[var(--text-secondary)]">{k.sub}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
