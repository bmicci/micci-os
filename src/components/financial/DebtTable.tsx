// DebtTable — debt accounts color-coded by recommendation strategy
// Pure server component — no state needed

interface DebtAccount {
  id: string
  name: string
  account_type: string | null
  balance: number | null
  interest_rate: number | null
  minimum_payment: number | null
  recommendation: string | null
  status: string | null
}

interface DebtTableProps {
  accounts: DebtAccount[] | null
}

function fmt(n: number | null): string {
  if (n == null) return '—'
  return '$' + Math.round(n).toLocaleString('en-US')
}

function getRowClass(rec: string | null, type: string | null): string {
  if (type === 'mortgage') return 'border-l-2 border-l-blue-500/70'
  if (rec === 'ROLL TO HELOC') return 'border-l-2 border-l-red-500/70 bg-red-500/5'
  if (rec === 'FAMILY') return 'border-l-2 border-l-purple-500/70 bg-purple-500/5'
  if (rec?.startsWith('HOLD')) return 'border-l-2 border-l-yellow-500/70 bg-yellow-500/5'
  if (rec?.startsWith('KEEP')) return 'border-l-2 border-l-green-500/70'
  return ''
}

function ActionBadge({ rec }: { rec: string | null }) {
  if (!rec) return null

  let cls: string
  let label: string

  if (rec === 'ROLL TO HELOC') {
    cls = 'bg-red-500/20 text-red-300 border border-red-500/30'
    label = '🔴 ROLL TO HELOC'
  } else if (rec === 'KEEP - NEVER PAY EARLY') {
    cls = 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    label = '🏠 NEVER PAY EARLY'
  } else if (rec === 'KEEP') {
    cls = 'bg-green-500/20 text-green-300 border border-green-500/30'
    label = '✅ KEEP'
  } else if (rec.startsWith('HOLD')) {
    cls = 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
    label = '⚠️ HOLD - 0% PROMO'
  } else if (rec === 'FAMILY') {
    cls = 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
    label = '❤️ FAMILY'
  } else {
    cls = 'bg-white/10 text-[var(--text-secondary)]'
    label = rec
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

function RateCell({ rate }: { rate: number | null }) {
  if (rate == null) return <span>—</span>
  if (rate === 0) return <span className="text-green-400 font-medium">0%</span>
  if (rate >= 10) return <span className="text-red-400">{rate}%</span>
  return <span className="text-[var(--text-secondary)]">{rate}%</span>
}

export default function DebtTable({ accounts }: DebtTableProps) {
  const sorted = [...(accounts ?? [])].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))

  const totalBalance = sorted.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalMinPay = sorted.reduce((s, a) => s + (a.minimum_payment ?? 0), 0)

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[var(--text-muted)] text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Account</th>
              <th className="text-right px-4 py-3">Balance</th>
              <th className="text-right px-4 py-3 hidden sm:table-cell">Rate</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">Min Pay</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((acct) => (
              <tr
                key={acct.id}
                className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${getRowClass(acct.recommendation, acct.account_type)}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--text-primary)]">{acct.name}</div>
                  <div className="text-xs text-[var(--text-muted)] capitalize hidden sm:block mt-0.5">
                    {acct.account_type?.replace(/_/g, ' ')}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-[var(--text-secondary)]">
                  {fmt(acct.balance)}
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  <RateCell rate={acct.interest_rate} />
                </td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)] font-mono hidden md:table-cell">
                  {fmt(acct.minimum_payment)}
                </td>
                <td className="px-4 py-3 text-right">
                  <ActionBadge rec={acct.recommendation} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-white/5 text-[var(--text-primary)] font-semibold">
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs uppercase tracking-wide">
                Total
              </td>
              <td className="px-4 py-3 text-right font-mono">{fmt(totalBalance)}</td>
              <td className="px-4 py-3 hidden sm:table-cell" />
              <td className="px-4 py-3 text-right font-mono hidden md:table-cell">
                {fmt(totalMinPay)}/mo
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
