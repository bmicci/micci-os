// Pure diff: a parsed card statement vs the promo_deadlines rows for that
// card → proposed changes ("findings") the user confirms in /import.
// No I/O here; lib/statements.ts persists the drafts.

export interface StatementSegment {
  type: 'purchase' | 'balance_transfer' | 'cash_advance' | 'promo_purchase' | 'other'
  description: string
  balance: number
  apr: number | null
  promo_end_date: string | null
  deferred_interest: number | null
  transfer_date: string | null
}

export interface StatementExtraction {
  is_card_statement: boolean
  issuer: string | null
  account_name: string | null
  account_last4: string | null
  closing_date: string | null
  new_balance: number | null
  minimum_payment: number | null
  payment_due_date: string | null
  credit_limit: number | null
  interest_charged: number | null
  fees_charged: number | null
  segments: StatementSegment[]
  notes: string | null
}

export interface PromoRow {
  id: string
  name: string
  account_name: string
  balance: number | string
  expires: string
  deferred_interest: number | string | null
  status: string
  note: string | null
}

export interface PromoProposal {
  name?: string
  account_name?: string
  balance?: number
  expires?: string
  deferred_interest?: number | null
  apr?: number | null
  status?: 'paid'
}

export interface FindingDraft {
  kind: 'update_promo' | 'new_promo' | 'promo_paid' | 'info'
  promo_id: string | null
  account_name: string | null
  title: string
  current: Record<string, unknown> | null
  proposed: PromoProposal | null
}

const BALANCE_TOLERANCE = 1      // dollars
const DATE_MATCH_DAYS = 20       // promo expiry vs statement promo end date

function days(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Promo rows that belong to this card (matched on the last 4 digits). */
export function promosForAccount(promos: PromoRow[], mask: string | null): PromoRow[] {
  if (!mask || mask.length < 4) return []
  const last4 = mask.slice(-4)
  return promos.filter(p => p.account_name.includes(last4) || p.name.includes(last4))
}

/** A segment carries promotional terms worth tracking. */
function isPromoSegment(s: StatementSegment): boolean {
  if (s.promo_end_date) return true
  return s.type !== 'purchase' && s.type !== 'cash_advance' && s.apr === 0
}

export function diffStatementAgainstPromos(
  st: StatementExtraction,
  promos: PromoRow[],
  ctx: { accountMask: string | null; accountName: string | null },
): FindingDraft[] {
  if (!st.is_card_statement) return []
  const accountName = ctx.accountName ?? [st.issuer, st.account_name, st.account_last4 && `(${st.account_last4})`].filter(Boolean).join(' ')
  const active = promosForAccount(promos, ctx.accountMask ?? st.account_last4).filter(p => p.status === 'active')
  const unmatched = new Set(active.map(p => p.id))
  const out: FindingDraft[] = []
  const current = (p: PromoRow) => ({
    name: p.name, balance: Number(p.balance), expires: p.expires,
    deferred_interest: p.deferred_interest != null ? Number(p.deferred_interest) : null,
  })

  const take = (seg: StatementSegment): PromoRow | null => {
    const candidates = active.filter(p => unmatched.has(p.id))
    let best: PromoRow | null = null
    if (seg.promo_end_date) {
      let bestGap = DATE_MATCH_DAYS + 1
      for (const p of candidates) {
        const gap = days(p.expires, seg.promo_end_date)
        if (gap < bestGap) { best = p; bestGap = gap }
      }
    } else {
      let bestGap = Infinity
      for (const p of candidates) {
        const gap = Math.abs(Number(p.balance) - seg.balance)
        if (gap < bestGap && gap <= Math.max(50, Number(p.balance) * 0.25)) { best = p; bestGap = gap }
      }
    }
    if (best) unmatched.delete(best.id)
    return best
  }

  for (const seg of st.segments.filter(isPromoSegment)) {
    const promo = take(seg)
    const paidOff = seg.balance <= BALANCE_TOLERANCE

    if (promo) {
      if (paidOff) {
        out.push({
          kind: 'promo_paid', promo_id: promo.id, account_name: promo.account_name,
          title: `${promo.name}: statement shows $0 remaining — mark paid`,
          current: current(promo), proposed: { status: 'paid' },
        })
        continue
      }
      const proposed: PromoProposal = { apr: seg.apr }
      const changes: string[] = []
      if (Math.abs(Number(promo.balance) - seg.balance) > BALANCE_TOLERANCE) {
        proposed.balance = seg.balance
        changes.push(`balance ${money(Number(promo.balance))} → ${money(seg.balance)}`)
      }
      if (seg.promo_end_date && seg.promo_end_date !== promo.expires) {
        proposed.expires = seg.promo_end_date
        changes.push(`expires ${promo.expires} → ${seg.promo_end_date}`)
      }
      const di = seg.deferred_interest
      if (di != null && Math.abs(di - Number(promo.deferred_interest ?? 0)) > BALANCE_TOLERANCE) {
        proposed.deferred_interest = di
        changes.push(`deferred interest → ${money(di)}`)
      }
      if (seg.apr != null && seg.apr > 0) changes.push(`now at ${seg.apr}% APR`)
      if (changes.length) {
        out.push({
          kind: 'update_promo', promo_id: promo.id, account_name: promo.account_name,
          title: `${promo.name}: ${changes.join(', ')}`, current: current(promo), proposed,
        })
      }
      continue
    }

    if (paidOff) continue
    if (!seg.promo_end_date) {
      out.push({
        kind: 'info', promo_id: null, account_name: accountName,
        title: `${accountName}: ${seg.description} ${money(seg.balance)} at ${seg.apr ?? '?'}% — no promo end date printed`,
        current: null, proposed: null,
      })
      continue
    }
    out.push({
      kind: 'new_promo', promo_id: null, account_name: accountName,
      title: `${accountName}: new promo ${seg.description} ${money(seg.balance)} until ${seg.promo_end_date}`,
      current: null,
      proposed: {
        name: `${accountName} — ${seg.description}`, account_name: accountName,
        balance: seg.balance, expires: seg.promo_end_date,
        deferred_interest: seg.deferred_interest, apr: seg.apr,
      },
    })
  }

  // Tracked promos the statement no longer lists. Only trust that when the
  // segment table was actually read.
  if (st.segments.length > 0) {
    for (const p of active.filter(x => unmatched.has(x.id))) {
      const expired = st.closing_date ? p.expires <= st.closing_date : false
      out.push({
        kind: 'promo_paid', promo_id: p.id, account_name: p.account_name,
        title: `${p.name}: not on the ${st.closing_date ?? 'latest'} statement${expired ? ' (past its expiry)' : ''} — mark paid?`,
        current: current(p), proposed: { status: 'paid' },
      })
    }
  }

  if ((st.interest_charged ?? 0) > 0) {
    out.push({
      kind: 'info', promo_id: null, account_name: accountName,
      title: `${accountName}: ${money(st.interest_charged!)} interest charged this cycle`,
      current: null, proposed: null,
    })
  }
  return out
}
