import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Subscription, EssentialBill } from '@/types/finance'

interface SubscriptionStore {
  cancelSubs: Subscription[]
  reviewSubs: Subscription[]
  essentialBills: EssentialBill[]
  hydrated: boolean

  // Computed
  cancelTotal: number
  reviewTotal: number
  essentialTotal: number
  totalMonthlyBurn: number

  // Actions
  hydrate: (data: {
    cancelSubs: Subscription[]
    reviewSubs: Subscription[]
    essentialBills: EssentialBill[]
  }) => void
  recalculate: () => void
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  subscribeWithSelector((set, get) => ({
    cancelSubs: [],
    reviewSubs: [],
    essentialBills: [],
    hydrated: false,
    cancelTotal: 0,
    reviewTotal: 0,
    essentialTotal: 0,
    totalMonthlyBurn: 0,

    hydrate: (data) => {
      set({ ...data, hydrated: true })
      get().recalculate()
    },

    recalculate: () => {
      const { cancelSubs, reviewSubs, essentialBills } = get()
      const cancelTotal = cancelSubs.reduce((s, sub) => s + sub.mo, 0)
      const reviewTotal = reviewSubs.reduce((s, sub) => s + sub.mo, 0)
      const essentialTotal = essentialBills.reduce((s, b) => s + b.mo, 0)
      set({
        cancelTotal: Math.round(cancelTotal * 100) / 100,
        reviewTotal: Math.round(reviewTotal * 100) / 100,
        essentialTotal: Math.round(essentialTotal * 100) / 100,
        totalMonthlyBurn: Math.round((cancelTotal + reviewTotal + essentialTotal) * 100) / 100,
      })
    },
  })),
)
