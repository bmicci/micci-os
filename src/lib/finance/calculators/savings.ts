// Bill + subscription savings for the Calculators section. Pure — no I/O.

export interface SavingItem { id: string; name: string; monthly: number; savings: number; on: boolean }

export function totalMonthlySavings(items: SavingItem[]): number {
  return items.reduce((s, i) => s + (i.on ? i.savings : 0), 0)
}

/** Plan-v5 subscription → default saving if acted on. */
export function subscriptionSaving(monthly: number, action: string, replacement?: number): number {
  if (action === 'cancel' || action === 'canceled') return monthly
  if (action === 'switch') return Math.max(0, monthly - (replacement ?? 0))
  return 0
}
