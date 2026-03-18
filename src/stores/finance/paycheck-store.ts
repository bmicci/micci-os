import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { PaycheckInputs, PaycheckResult } from '@/types/finance'
import { calculateNetPay, DEFAULT_PAYCHECK_INPUTS } from '@/lib/finance/paycheck'

interface PaycheckStore {
  // Inputs
  inputs: PaycheckInputs
  // Computed (cached, recalculated on input change)
  result: PaycheckResult | null
  // Hydration flag
  hydrated: boolean

  // Actions
  setInput: <K extends keyof PaycheckInputs>(key: K, value: PaycheckInputs[K]) => void
  setInputs: (partial: Partial<PaycheckInputs>) => void
  recalculate: () => void
  hydrate: (data: Partial<PaycheckInputs>) => void
  reset: () => void
}

export const usePaycheckStore = create<PaycheckStore>()(
  subscribeWithSelector((set, get) => ({
    inputs: { ...DEFAULT_PAYCHECK_INPUTS },
    result: null,
    hydrated: false,

    setInput: (key, value) => {
      set(state => ({
        inputs: { ...state.inputs, [key]: value },
      }))
      get().recalculate()
    },

    setInputs: (partial) => {
      set(state => ({
        inputs: { ...state.inputs, ...partial },
      }))
      get().recalculate()
    },

    recalculate: () => {
      const { inputs } = get()
      const result = calculateNetPay(inputs)
      set({ result })
    },

    hydrate: (data) => {
      set(state => ({
        inputs: { ...state.inputs, ...data },
        hydrated: true,
      }))
      get().recalculate()
    },

    reset: () => {
      set({ inputs: { ...DEFAULT_PAYCHECK_INPUTS }, result: null, hydrated: false })
    },
  })),
)
