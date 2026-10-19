// Where a debt balance comes from: the bank (Plaid, daily) or the manual
// debt_accounts table — and, when they disagree, what the manual row says.

import type { DebtAccount } from '@/lib/financial-data'
import { fmt } from '@/lib/financial-data'

function age(asOf?: string): string {
  if (!asOf) return ''
  const days = Math.floor((Date.now() - new Date(asOf).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1d'
  return `${days}d`
}

export default function DebtSourceTag({ debt }: { debt: DebtAccount }) {
  if (!debt.source) return null
  const live = debt.source === 'live'
  const color = live ? '#22c55e' : debt.stale ? '#f59e0b' : 'var(--text-muted)'
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap text-[9.5px] font-semibold uppercase tracking-wider"
      title={live ? `Balance from ${debt.liveName ?? 'the bank'} via Plaid` : 'Hand-entered in debt_accounts'}>
      <span className="px-1.5 py-0.5 rounded" style={{ background: `${live ? '#22c55e' : debt.stale ? '#f59e0b' : '#ffffff'}1a`, color }}>
        {live ? 'Live' : debt.stale ? 'Stale' : 'Manual'} · {age(debt.asOf)}
      </span>
      {debt.manualBalance != null && (
        <span className="normal-case tracking-normal font-normal" style={{ color: 'var(--text-muted)' }}>
          manual {fmt(debt.manualBalance)}
        </span>
      )}
    </span>
  )
}

/** "9 live · 3 manual (3 stale)" */
export function debtSourceSummary(debts: DebtAccount[]): string | null {
  if (!debts.some(d => d.source)) return null
  const live = debts.filter(d => d.source === 'live').length
  const manual = debts.length - live
  const stale = debts.filter(d => d.stale).length
  return `${live} live from banks · ${manual} manual${stale ? ` (${stale} not updated in 14+ days)` : ''}`
}
