// ═══════════════════════════════════════════════════════════════════
// TanStack Query hooks for financial data
// These wrap the /api/finance/* routes with caching + loading states.
// All hooks are client-side only ('use client' required in consuming components).
// ═══════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import type { DbDebtAccount, DbFinancialModule, DbSubscription, DbDeadline } from '@/types/database'
import type { PaycheckInputs } from '@/types/finance'

// ── Fetch helpers ─────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`)
  return res.json() as Promise<T>
}

async function putJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT failed: ${url} (${res.status})`)
  return res.json() as Promise<T>
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH failed: ${url} (${res.status})`)
  return res.json() as Promise<T>
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST failed: ${url} (${res.status})`)
  return res.json() as Promise<T>
}

// ── Debt Accounts ─────────────────────────────────────────────────

export function useDebtAccounts() {
  return useQuery<DbDebtAccount[]>({
    queryKey: queryKeys.finance.accounts(),
    queryFn: () => fetchJson('/api/finance/accounts'),
  })
}

// ── Financial Modules ─────────────────────────────────────────────

export function useFinancialModules() {
  return useQuery<DbFinancialModule[]>({
    queryKey: queryKeys.finance.modules(),
    queryFn: () => fetchJson('/api/finance/modules'),
  })
}

export function useUpdateModule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (update: { id: string; progress?: number; status?: string }) =>
      patchJson('/api/finance/modules', update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.modules() })
    },
  })
}

// ── Subscriptions ─────────────────────────────────────────────────

export function useSubscriptions() {
  return useQuery<DbSubscription[]>({
    queryKey: queryKeys.finance.subscriptions(),
    queryFn: () => fetchJson('/api/finance/subscriptions'),
  })
}

// ── Deadlines ─────────────────────────────────────────────────────

export function useDeadlines() {
  return useQuery<DbDeadline[]>({
    queryKey: queryKeys.finance.deadlines(),
    queryFn: () => fetchJson('/api/finance/deadlines'),
    // Retry on 500 but not on 503 (table doesn't exist)
    retry: (failureCount, error) =>
      failureCount < 2 && error.message.includes('500'),
  })
}

export function useMarkDeadlineComplete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      patchJson('/api/finance/deadlines', { id, status: 'completed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.deadlines() })
    },
  })
}

// ── Paycheck Settings ─────────────────────────────────────────────

export function usePaycheckSettings() {
  return useQuery<PaycheckInputs | null>({
    queryKey: queryKeys.finance.paycheckSettings(),
    queryFn: () => fetchJson('/api/finance/paycheck-settings'),
    retry: false,
  })
}

export function useSavePaycheckSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: PaycheckInputs) =>
      putJson('/api/finance/paycheck-settings', settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.paycheckSettings() })
    },
  })
}

// ── Scenarios ─────────────────────────────────────────────────────

export function useScenarios() {
  return useQuery({
    queryKey: queryKeys.finance.scenarios(),
    queryFn: () => fetchJson('/api/finance/scenarios'),
    retry: false,
  })
}

export function useCreateScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scenario: unknown) =>
      postJson('/api/finance/scenarios', scenario),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.scenarios() })
    },
  })
}

export function useUpdateScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Record<string, unknown>) =>
      putJson(`/api/finance/scenarios/${id}`, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.scenarios() })
    },
  })
}

export function useDeleteScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/finance/scenarios/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.scenarios() })
    },
  })
}
