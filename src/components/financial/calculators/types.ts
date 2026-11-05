import type { PayoffDebt } from '@/lib/finance/calculators/payoff'

export interface PlanSubscription { name: string; monthly: number; action: string; note?: string; replacement?: number }
export interface PlanBill { name: string; monthly: number; lever: string; save_low: number; save_high: number }
export interface PlanElection { id: string; label: string; base_pct: number; bonus_pct: number }
export interface PlanLine { name: string; today: number; A: number; B: number }
export interface PlanCarTier { price: number; insurance_increase: number }

export interface PlanData {
  assumptions: Record<string, number | string | Record<string, number>>
  spending_lines: PlanLine[]
  car_tiers: PlanCarTier[]
  subscriptions: PlanSubscription[]
  bills: PlanBill[]
  k401_elections: PlanElection[]
}

export interface CalculatorProps {
  /** Non-mortgage debts with a balance, live where linked. payInFull cards are flagged, not hidden. */
  debts: (PayoffDebt & { payInFull?: boolean; note?: string })[]
  plan: PlanData
  startYm: string          // YYYY-MM of "month 1" for date labels
}

export const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
