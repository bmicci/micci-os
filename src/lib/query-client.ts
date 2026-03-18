import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes — financial data doesn't change often
        gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}

// Query key factory — all keys follow [domain, entity, ...params]
export const queryKeys = {
  finance: {
    accounts: () => ['finance', 'accounts'] as const,
    subscriptions: () => ['finance', 'subscriptions'] as const,
    modules: () => ['finance', 'modules'] as const,
    budgetCategories: () => ['finance', 'budgetCategories'] as const,
    deadlines: () => ['finance', 'deadlines'] as const,
    scenarios: (id?: string) => id
      ? ['finance', 'scenarios', id] as const
      : ['finance', 'scenarios'] as const,
    paycheckSettings: () => ['finance', 'paycheckSettings'] as const,
    cashflowSettings: () => ['finance', 'cashflowSettings'] as const,
  },
  health: {
    protocols: () => ['health', 'protocols'] as const,
    labs: () => ['health', 'labs'] as const,
  },
  goals: {
    all: () => ['goals', 'all'] as const,
  },
  planner: {
    blocks: (weekId?: string) => weekId
      ? ['planner', 'blocks', weekId] as const
      : ['planner', 'blocks'] as const,
  },
}
