import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Scenario } from '@/types/finance'

const MAX_SCENARIOS = 5

interface ScenarioStore {
  scenarios: Scenario[]
  activeComparisonIds: string[]
  hydrated: boolean

  // Actions
  addScenario: (scenario: Scenario) => boolean
  updateScenario: (id: string, updates: Partial<Scenario>) => void
  removeScenario: (id: string) => void
  duplicateScenario: (id: string, newName: string) => boolean
  setBaseline: (id: string) => void
  setComparisonIds: (ids: string[]) => void
  hydrate: (scenarios: Scenario[]) => void

  // Getters
  getBaseline: () => Scenario | undefined
  getById: (id: string) => Scenario | undefined
}

export const useScenarioStore = create<ScenarioStore>()(
  subscribeWithSelector((set, get) => ({
    scenarios: [],
    activeComparisonIds: [],
    hydrated: false,

    addScenario: (scenario) => {
      const { scenarios } = get()
      if (scenarios.length >= MAX_SCENARIOS) return false
      set({ scenarios: [...scenarios, scenario] })
      return true
    },

    updateScenario: (id, updates) => {
      set(state => ({
        scenarios: state.scenarios.map(s =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s,
        ),
      }))
    },

    removeScenario: (id) => {
      set(state => ({
        scenarios: state.scenarios.filter(s => s.id !== id),
        activeComparisonIds: state.activeComparisonIds.filter(cid => cid !== id),
      }))
    },

    duplicateScenario: (id, newName) => {
      const { scenarios } = get()
      if (scenarios.length >= MAX_SCENARIOS) return false
      const source = scenarios.find(s => s.id === id)
      if (!source) return false
      const duplicate: Scenario = {
        ...source,
        id: crypto.randomUUID(),
        name: newName,
        isBaseline: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set({ scenarios: [...scenarios, duplicate] })
      return true
    },

    setBaseline: (id) => {
      set(state => ({
        scenarios: state.scenarios.map(s => ({
          ...s,
          isBaseline: s.id === id,
        })),
      }))
    },

    setComparisonIds: (ids) => {
      set({ activeComparisonIds: ids.slice(0, 3) }) // max 3 for comparison
    },

    hydrate: (scenarios) => {
      set({ scenarios, hydrated: true })
    },

    getBaseline: () => get().scenarios.find(s => s.isBaseline),
    getById: (id) => get().scenarios.find(s => s.id === id),
  })),
)
