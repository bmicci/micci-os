import { create } from 'zustand'

interface SettingsStore {
  theme: 'dark' // Only dark for now, but extensible
  defaultPayFrequency: 26 | 24 | 12 | 52
  defaultState: string
  hydrated: boolean

  setTheme: (theme: 'dark') => void
  hydrate: (data: Partial<SettingsStore>) => void
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  theme: 'dark',
  defaultPayFrequency: 26,
  defaultState: 'TX',
  hydrated: false,

  setTheme: (theme) => set({ theme }),
  hydrate: (data) => set({ ...data, hydrated: true }),
}))
