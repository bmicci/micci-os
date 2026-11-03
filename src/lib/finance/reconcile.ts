// Data reconciliation: cross-checks the debt list against tracked 0% promos
// and flags numbers the owner should not plan on. Pure — no I/O. Surfaced by
// the MCP micci_debts tool (and usable by the UI) so planning tools are told
// which figures to distrust instead of silently using them.
import type { DebtAccount, PromoDeadline } from '@/lib/financial-data'
import { last4 } from './liveDebts'

export type ReconcileSeverity = 'error' | 'warn'

export interface ReconcileIssue {
  severity: ReconcileSeverity
  kind: 'promo_exceeds_balance' | 'stale_balance' | 'promo_unmatched' | 'zero_active'
  subject: string
  message: string
}

const TOLERANCE = 5 // dollars: statement rounding, small payments since close
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * @param debts   merged debt list (live bank balance where linked)
 * @param promos  active tracked promos
 */
export function reconcileDebts(debts: DebtAccount[], promos: PromoDeadline[]): ReconcileIssue[] {
  const issues: ReconcileIssue[] = []
  const cards = debts.filter(d => d.category === 'Credit Card')
  const cardFor = (digits: string) =>
    cards.find(c => last4(c.name) === digits || (c.liveName != null && last4(c.liveName) === digits))

  // 1. Promo balances on one card can't total more than the card owes.
  const byDigits = new Map<string, PromoDeadline[]>()
  const unmatched: PromoDeadline[] = []
  for (const p of promos) {
    const digits = last4(p.acct)
    if (!digits || !cardFor(digits)) { unmatched.push(p); continue }
    byDigits.set(digits, [...(byDigits.get(digits) ?? []), p])
  }
  for (const [digits, ps] of byDigits) {
    const card = cardFor(digits)!
    const total = ps.reduce((n, p) => n + p.balance, 0)
    if (total > card.balance + TOLERANCE) {
      issues.push({
        severity: 'error', kind: 'promo_exceeds_balance', subject: card.name,
        message: `${card.name}: ${ps.length} tracked promo(s) total ${usd(total)} but the card owes only ${usd(card.balance)} (${card.source === 'live' ? 'live bank balance' : 'manual'}). `
          + 'At least one promo is overstated or already paid — do not plan on these promo balances; ask Brandon for per-promo balances.',
      })
    }
  }
  // Promos we can't tie to any card can't be cross-checked.
  for (const p of unmatched) {
    issues.push({
      severity: 'warn', kind: 'promo_unmatched', subject: p.name,
      message: `${p.name} (${usd(p.balance)}, expires ${p.expires}) isn't linked to a card in the debt list, so its balance can't be cross-checked.`,
    })
  }

  // 2. Hand-entered balances that have gone stale.
  for (const d of debts) {
    if (d.source !== 'live' && d.stale && d.balance > 0) {
      issues.push({
        severity: d.category === 'HELOC' || d.balance >= 10000 ? 'error' : 'warn',
        kind: 'stale_balance', subject: d.name,
        message: `${d.name}: ${usd(d.balance)} was last entered ${d.asOf ?? 'long ago'} (manual) — likely out of date; ask Brandon for the current balance.`,
      })
    }
  }

  // 3. Accounts still active at $0 (clutter that hides real problems).
  const dead = debts.filter(d => d.balance === 0 && d.source !== 'live')
  if (dead.length) {
    issues.push({
      severity: 'warn', kind: 'zero_active', subject: 'zero-balance accounts',
      message: `${dead.length} account(s) are active at $0: ${dead.map(d => d.name).join(', ')} — mark closed if no longer used.`,
    })
  }

  return issues
}

export function formatReconcile(issues: ReconcileIssue[]): string[] {
  if (issues.length === 0) return ['## Data checks', '- No inconsistencies found.']
  const errs = issues.filter(i => i.severity === 'error')
  const warns = issues.filter(i => i.severity === 'warn')
  return [
    '## Data checks — numbers to distrust until Brandon confirms',
    ...errs.map(i => `- ⛔ ${i.message}`),
    ...warns.map(i => `- ⚠ ${i.message}`),
  ]
}
