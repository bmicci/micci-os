'use client'

/**
 * FinancialHydrator — invisible client component
 * Fetches financial data via TanStack Query and hydrates Zustand stores.
 * Mount once inside the financial section layout.
 * Re-runs automatically when window refocuses (via React Query's staleTime).
 */

import { useEffect } from 'react'
import { useDebtAccounts, useFinancialModules, useSubscriptions } from '@/lib/finance/hooks'
import { useDebtStore } from '@/stores/finance/debt-store'
import { useSubscriptionStore } from '@/stores/finance/subscription-store'
import type { DbDebtAccount, DbSubscription } from '@/types/database'
import type { DebtAccount, Subscription, EssentialBill } from '@/types/finance'

// ── Mappers (client-side, same logic as financial-data-service.ts) ──

function mapDecision(notes: string | null, rate: number): DebtAccount['decision'] {
  if (notes) {
    const lower = notes.toLowerCase()
    if (lower.includes('roll') || lower.includes('heloc')) return 'roll'
    if (lower.includes('promo') || lower.includes('0%') || lower.includes('hold')) return 'promo'
  }
  if (rate === 0) return 'promo'
  if (rate > 6.85) return 'roll'
  return 'keep'
}

function mapAccountType(dbType: string): DebtAccount['category'] {
  const map: Record<string, DebtAccount['category']> = {
    credit_card: 'Credit Card',
    loan: 'Personal Loan',
    mortgage: 'Mortgage',
    heloc: 'Personal Loan',
    line_of_credit: 'Personal Loan',
    other: 'Personal Loan',
  }
  return map[dbType] ?? 'Personal Loan'
}

function mapDbAccountToDebt(row: DbDebtAccount): DebtAccount {
  const rate = Number(row.interest_rate ?? 0)
  return {
    name: row.name,
    balance: Number(row.balance),
    rate,
    min: row.minimum_payment != null ? Number(row.minimum_payment) : null,
    decision: mapDecision(row.notes, rate),
    category: mapAccountType(row.account_type),
  }
}

function mapDbSubToSub(row: DbSubscription): Subscription {
  return { name: row.name, mo: Number(row.amount), reason: row.notes ?? '' }
}

function mapDbSubToEssential(row: DbSubscription): EssentialBill {
  const mo = Number(row.amount)
  return { name: row.name, mo, yr: Math.round(mo * 12 * 100) / 100, note: row.notes ?? '' }
}

// ── Hydrator component ────────────────────────────────────────────

export default function FinancialHydrator() {
  const { data: accounts } = useDebtAccounts()
  const { data: subs } = useSubscriptions()

  const hydrateDebt = useDebtStore(s => s.hydrate)
  const debtHydrated = useDebtStore(s => s.hydrated)

  const hydrateSubs = useSubscriptionStore(s => s.hydrate)
  const subsHydrated = useSubscriptionStore(s => s.hydrated)

  useEffect(() => {
    if (accounts && accounts.length > 0 && !debtHydrated) {
      hydrateDebt(accounts.map(mapDbAccountToDebt))
    }
  }, [accounts, debtHydrated, hydrateDebt])

  useEffect(() => {
    if (subs && subs.length > 0 && !subsHydrated) {
      hydrateSubs({
        cancelSubs: subs.filter(s => s.action === 'cancel').map(mapDbSubToSub),
        reviewSubs: subs.filter(s => s.action === 'review').map(mapDbSubToSub),
        essentialBills: subs.filter(s => s.action === 'essential').map(mapDbSubToEssential),
      })
    }
  }, [subs, subsHydrated, hydrateSubs])

  // No render output — this is a side-effect-only component
  return null
}
