// SubscriptionBurn — subscription audit table with savings callout
// Pure server component — no state needed

interface Subscription {
  id: string
  name: string
  amount: number | null
  billing_cycle: string | null
  category: string | null
  action: string | null
  is_active: boolean
}

interface SubscriptionBurnProps {
  subscriptions: Subscription[] | null
}

function toMonthly(s: Subscription): number {
  const amt = s.amount ?? 0
  if (s.billing_cycle === 'annual') return amt / 12
  if (s.billing_cycle === 'weekly') return amt * 4.33
  return amt
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ACTION_SORT_ORDER: Record<string, number> = {
  cancel: 0,
  review: 1,
  keep: 2,
  essential: 3,
}

const BADGE_STYLES: Record<string, string> = {
  essential: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  keep:      'bg-green-500/20 text-green-300 border border-green-500/30',
  review:    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  cancel:    'bg-red-500/20 text-red-300 border border-red-500/30',
}

export default function SubscriptionBurn({ subscriptions }: SubscriptionBurnProps) {
  const subs = subscriptions ?? []

  // Active burn = keep + essential only
  const activeBurn = subs
    .filter((s) => s.action === 'keep' || s.action === 'essential')
    .reduce((sum, s) => sum + toMonthly(s), 0)

  // Cancel candidates savings potential
  const cancelSavings = subs
    .filter((s) => s.action === 'cancel')
    .reduce((sum, s) => sum + toMonthly(s), 0)

  const reviewCount = subs.filter((s) => s.action === 'review').length

  // Sort: cancel → review → keep → essential
  const sorted = [...subs].sort((a, b) => {
    const ao = ACTION_SORT_ORDER[a.action ?? ''] ?? 9
    const bo = ACTION_SORT_ORDER[b.action ?? ''] ?? 9
    if (ao !== bo) return ao - bo
    return (b.amount ?? 0) - (a.amount ?? 0) // within group: high to low
  })

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
        💳 Subscriptions Burn
      </h2>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
            Active Monthly
          </p>
          <p className="text-2xl font-bold gradient-text">{fmt(activeBurn)}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">keep + essential only</p>
        </div>

        <div className="glass-card p-4" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
            Cancel Candidates
          </p>
          <p className="text-2xl font-bold text-red-400">{fmt(cancelSavings)}</p>
          <p className="text-xs text-red-300/60 mt-1">potential monthly savings</p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-1">
            Review Needed
          </p>
          <p className="text-2xl font-bold text-yellow-400">{reviewCount}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">subscriptions to decide</p>
        </div>
      </div>

      {/* Potential savings callout */}
      {cancelSavings > 0 && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <span className="text-2xl mt-0.5">💸</span>
          <div>
            <p className="text-sm font-semibold text-red-300">Potential Monthly Savings</p>
            <p className="text-xl font-bold text-red-400 mt-0.5">{fmt(cancelSavings)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Cancel all flagged subscriptions → save{' '}
              <strong className="text-red-300">
                {fmt(cancelSavings * 12)}
              </strong>{' '}
              per year
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Subscription</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-3">Monthly</th>
                <th className="text-right px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-[var(--text-primary)]">{sub.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs capitalize hidden sm:table-cell">
                    {sub.category?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--text-secondary)]">
                    {fmt(toMonthly(sub))}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        BADGE_STYLES[sub.action ?? ''] ?? 'bg-white/10 text-[var(--text-secondary)]'
                      }`}
                    >
                      {sub.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
