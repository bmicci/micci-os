import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { DebtAccount } from '@/types/finance'
import { calculateDebtSummary, type DebtSummary } from '@/lib/finance/debt'

interface DebtStore {
  accounts: DebtAccount[]
  hydrated: boolean
  summary: DebtSummary | null

  // Actions
  setAccounts: (accounts: DebtAccount[]) => void
  updateBalance: (name: string, newBalance: number) => void
  hydrate: (accounts: DebtAccount[]) => void
  recalculate: () => void
}

export const useDebtStore = create<DebtStore>()(
  subscribeWithSelector((set, get) => ({
    accounts: [],
    hydrated: false,
    summary: null,

    setAccounts: (accounts) => {
      set({ accounts })
      get().recalculate()
    },

    updateBalance: (name, newBalance) => {
      set(state => ({
        accounts: state.accounts.map(a =>
          a.name === name ? { ...a, balance: newBalance } : a,
        ),
      }))
      get().recalculate()
    },

    hydrate: (accounts) => {
      set({ accounts, hydrated: true })
      get().recalculate()
    },

    recalculate: () => {
      const { accounts } = get()
      const summary = accounts.length > 0 ? calculateDebtSummary(accounts) : null
      set({ summary })
    },
  })),
)
