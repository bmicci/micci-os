// KPIStrip — 5 top-level financial KPI cards
// Pure server component — receives pre-fetched data as props

interface DebtAccount {
  balance: number | null
  minimum_payment: number | null
}

interface FinancialModule {
  status: string | null
}

interface Subscription {
  amount: number | null
  billing_cycle: string | null
  action: string | null
}

interface KPIStripProps {
  accounts: DebtAccount[] | null
  modules: FinancialModule[] | null
  subscriptions: Subscription[] | null
}

const HOME_VALUE = 850_000

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function toMonthly(s: Subscription): number {
  const amt = s.amount ?? 0
  if (s.billing_cycle === 'annual') return amt / 12
  if (s.billing_cycle === 'weekly') return amt * 4.33
  return amt
}

function KPICard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: string
  sub: string
  valueClass?: string
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1 min-w-0">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest truncate">{label}</p>
      <p className={`text-2xl font-bold truncate ${valueClass ?? 'gradient-text'}`}>{value}</p>
      <p className="text-xs text-[var(--text-secondary)] truncate">{sub}</p>
    </div>
  )
}

export default function KPIStrip({ accounts, modules, subscriptions }: KPIStripProps) {
  const accts = accounts ?? []
  const mods = modules ?? []
  const subs = subscriptions ?? []

  const totalDebt = accts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const monthlyService = accts.reduce((s, a) => s + (a.minimum_payment ?? 0), 0)

  // Active burn = everything except cancel-flagged
  const subsBurn = subs
    .filter((s) => s.action !== 'cancel')
    .reduce((s, sub) => s + toMonthly(sub), 0)

  const modulesComplete = mods.filter((m) => m.status === 'complete').length
  const netWorth = HOME_VALUE - totalDebt

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KPICard
        label="Total Debt"
        value={fmt(totalDebt)}
        sub="across all accounts"
        valueClass="text-red-400 font-bold"
      />
      <KPICard
        label="Monthly Service"
        value={fmt(monthlyService)}
        sub="min payments / mo"
      />
      <KPICard
        label="Subscriptions Burn"
        value={fmt(subsBurn)}
        sub="active monthly"
      />
      <KPICard
        label="Modules Complete"
        value={`${modulesComplete} / 9`}
        sub="financial tasks done"
      />
      <KPICard
        label="Net Worth (est.)"
        value={fmt(netWorth)}
        sub="$850K home − debt"
        valueClass={netWorth >= 0 ? 'gradient-text font-bold' : 'text-red-400 font-bold'}
      />
    </div>
  )
}
