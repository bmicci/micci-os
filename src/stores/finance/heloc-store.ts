import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { HELOCDebtAccount } from '@/types/finance'
import { calculateMonthlyInterest, HELOC_RATE, HELOC_LIMIT } from '@/lib/finance/heloc'

interface HELOCStore {
  accounts: HELOCDebtAccount[]
  helocRate: number
  helocLimit: number
  hydrated: boolean

  // Computed
  totalDrawn: number
  remainingAvailability: number
  monthlyInterest: number
  monthlyPromoMinimums: number
  monthlyDeferredPayments: number

  // Actions
  setAccounts: (accounts: HELOCDebtAccount[]) => void
  updateAccountBalance: (id: string, newBalance: number) => void
  updateAccountStatus: (id: string, status: HELOCDebtAccount['status']) => void
  setHelocRate: (rate: number) => void
  hydrate: (accounts: HELOCDebtAccount[]) => void
  recalculate: () => void
}

function computeDerived(accounts: HELOCDebtAccount[], rate: number, limit: number) {
  const rolledAccounts = accounts.filter(a => a.status === 'rolled')
  const promoAccounts = accounts.filter(a => a.status === 'promo_hold')
  const deferredAccounts = accounts.filter(a => a.status === 'deferred')

  // Total draw = HELOC line balance (the vehicle), not sum of rolled items
  const helocLine = accounts.find(a => a.accountType === 'heloc')
  const totalDrawn = helocLine ? helocLine.currentBalance : rolledAccounts.reduce((s, a) => s + a.currentBalance, 0)
  const monthlyInterest = calculateMonthlyInterest(totalDrawn, rate)
  const monthlyPromoMinimums = promoAccounts.reduce((s, a) => s + a.monthlyPayment, 0)
  const monthlyDeferredPayments = deferredAccounts.reduce((s, a) => s + a.monthlyPayment, 0)

  return {
    totalDrawn: Math.round(totalDrawn * 100) / 100,
    remainingAvailability: Math.round((limit - totalDrawn) * 100) / 100,
    monthlyInterest,
    monthlyPromoMinimums: Math.round(monthlyPromoMinimums * 100) / 100,
    monthlyDeferredPayments: Math.round(monthlyDeferredPayments * 100) / 100,
  }
}

export const useHELOCStore = create<HELOCStore>()(
  subscribeWithSelector((set, get) => ({
    accounts: [],
    helocRate: HELOC_RATE,
    helocLimit: HELOC_LIMIT,
    hydrated: false,
    totalDrawn: 0,
    remainingAvailability: HELOC_LIMIT,
    monthlyInterest: 0,
    monthlyPromoMinimums: 0,
    monthlyDeferredPayments: 0,

    setAccounts: (accounts) => {
      set({ accounts })
      get().recalculate()
    },

    updateAccountBalance: (id, newBalance) => {
      set(state => ({
        accounts: state.accounts.map(a =>
          a.id === id ? { ...a, currentBalance: newBalance } : a,
        ),
      }))
      get().recalculate()
    },

    updateAccountStatus: (id, status) => {
      set(state => ({
        accounts: state.accounts.map(a =>
          a.id === id ? { ...a, status } : a,
        ),
      }))
      get().recalculate()
    },

    setHelocRate: (rate) => {
      set({ helocRate: rate })
      get().recalculate()
    },

    hydrate: (accounts) => {
      set({ accounts, hydrated: true })
      get().recalculate()
    },

    recalculate: () => {
      const { accounts, helocRate, helocLimit } = get()
      const derived = computeDerived(accounts, helocRate, helocLimit)
      set(derived)
    },
  })),
)
