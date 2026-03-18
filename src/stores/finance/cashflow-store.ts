import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ExpenseLineItem, AllocationBucket, CashFlowResult } from '@/types/finance'
import { calculateMonthlyFlow, DEFAULT_EXPENSES, DEFAULT_ALLOCATIONS } from '@/lib/finance/cashflow'

interface CashFlowStore {
  expenses: ExpenseLineItem[]
  allocations: AllocationBucket[]
  hydrated: boolean

  // These are pulled from other stores (paycheck + heloc)
  // Set via cross-store subscription in the provider
  netPayPerPeriod: number
  payFrequency: number
  helocMonthlyInterest: number
  promoMinimums: number
  deferredPayments: number

  // Computed
  result: CashFlowResult | null

  // Actions
  setExpenses: (expenses: ExpenseLineItem[]) => void
  updateExpense: (id: string, amount: number) => void
  addExpense: (expense: ExpenseLineItem) => void
  removeExpense: (id: string) => void
  setAllocations: (allocations: AllocationBucket[]) => void
  updateAllocation: (id: string, percent: number) => void
  setCrossModuleInputs: (inputs: {
    netPayPerPeriod?: number
    payFrequency?: number
    helocMonthlyInterest?: number
    promoMinimums?: number
    deferredPayments?: number
  }) => void
  hydrate: (data: { expenses?: ExpenseLineItem[]; allocations?: AllocationBucket[] }) => void
  recalculate: () => void
}

export const useCashFlowStore = create<CashFlowStore>()(
  subscribeWithSelector((set, get) => ({
    expenses: [...DEFAULT_EXPENSES],
    allocations: [...DEFAULT_ALLOCATIONS],
    hydrated: false,
    netPayPerPeriod: 0,
    payFrequency: 26,
    helocMonthlyInterest: 0,
    promoMinimums: 0,
    deferredPayments: 0,
    result: null,

    setExpenses: (expenses) => {
      set({ expenses })
      get().recalculate()
    },

    updateExpense: (id, amount) => {
      set(state => ({
        expenses: state.expenses.map(e => (e.id === id ? { ...e, amount } : e)),
      }))
      get().recalculate()
    },

    addExpense: (expense) => {
      set(state => ({ expenses: [...state.expenses, expense] }))
      get().recalculate()
    },

    removeExpense: (id) => {
      set(state => ({ expenses: state.expenses.filter(e => e.id !== id) }))
      get().recalculate()
    },

    setAllocations: (allocations) => {
      set({ allocations })
      get().recalculate()
    },

    updateAllocation: (id, percent) => {
      set(state => ({
        allocations: state.allocations.map(a => (a.id === id ? { ...a, percent } : a)),
      }))
      get().recalculate()
    },

    setCrossModuleInputs: (inputs) => {
      set(inputs)
      get().recalculate()
    },

    hydrate: (data) => {
      set({
        ...(data.expenses ? { expenses: data.expenses } : {}),
        ...(data.allocations ? { allocations: data.allocations } : {}),
        hydrated: true,
      })
      get().recalculate()
    },

    recalculate: () => {
      const state = get()
      const result = calculateMonthlyFlow({
        netPayPerPeriod: state.netPayPerPeriod,
        payFrequency: state.payFrequency,
        helocMonthlyInterest: state.helocMonthlyInterest,
        promoMinimums: state.promoMinimums,
        deferredPayments: state.deferredPayments,
        expenses: state.expenses,
        allocations: state.allocations,
      })
      set({ result })
    },
  })),
)
