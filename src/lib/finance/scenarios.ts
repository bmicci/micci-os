// ═══════════════════════════════════════════════════════════════════
// Scenario Comparison Engine — Pure functions
// Compare snapshots, calculate deltas, rank by metrics
// ═══════════════════════════════════════════════════════════════════

import type { Scenario, ComparisonMetric, PaycheckInputs } from '@/types/finance'
import { calculateNetPay } from './paycheck'

export type MetricKey =
  | 'monthlyNetPay'
  | 'monthlyDebtService'
  | 'monthlyFreeCash'
  | 'annualSavingsCapacity'
  | 'totalComp'
  | 'effectiveTaxRate'

interface ScenarioMetrics {
  scenarioId: string
  scenarioName: string
  monthlyNetPay: number
  monthlyDebtService: number
  monthlyFreeCash: number
  annualSavingsCapacity: number
  totalComp: number
  effectiveTaxRate: number
}

/**
 * Calculate key metrics for a single scenario.
 */
export function calculateScenarioMetrics(scenario: Scenario): ScenarioMetrics {
  const paycheck = calculateNetPay(scenario.paycheckInputs)

  // Extract debt service and living expenses from cashflow inputs
  const cashflowInputs = scenario.cashflowInputs as {
    helocMonthlyInterest?: number
    promoMinimums?: number
    deferredPayments?: number
    totalLivingExpenses?: number
  }
  const monthlyDebtService = (cashflowInputs.helocMonthlyInterest ?? 0) +
    (cashflowInputs.promoMinimums ?? 0) +
    (cashflowInputs.deferredPayments ?? 0)

  const monthlyNetPay = paycheck.netPayAnnual / 12
  const totalLivingExpenses = cashflowInputs.totalLivingExpenses ?? 0
  const monthlyFreeCash = monthlyNetPay - monthlyDebtService - totalLivingExpenses

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    monthlyNetPay: Math.round(monthlyNetPay * 100) / 100,
    monthlyDebtService: Math.round(monthlyDebtService * 100) / 100,
    monthlyFreeCash: Math.round(monthlyFreeCash * 100) / 100,
    annualSavingsCapacity: Math.round(monthlyFreeCash * 12 * 100) / 100,
    totalComp: paycheck.grossAnnual + paycheck.employerMatchAnnual,
    effectiveTaxRate: paycheck.effectiveTotalTaxRate,
  }
}

/**
 * Compare multiple scenarios, calculating deltas from the baseline.
 */
export function compareScenarios(scenarios: Scenario[]): ComparisonMetric[] {
  if (scenarios.length === 0) return []

  const baseline = scenarios.find(s => s.isBaseline) ?? scenarios[0]
  const allMetrics = scenarios.map(calculateScenarioMetrics)
  const baselineMetrics = allMetrics.find(m => m.scenarioId === baseline.id)!

  const metricKeys: { key: MetricKey; label: string }[] = [
    { key: 'monthlyNetPay', label: 'Monthly Net Take-Home' },
    { key: 'monthlyDebtService', label: 'Monthly Debt Service' },
    { key: 'monthlyFreeCash', label: 'Monthly Free Cash' },
    { key: 'annualSavingsCapacity', label: 'Annual Savings Capacity' },
    { key: 'totalComp', label: 'Total Comp (Annual)' },
    { key: 'effectiveTaxRate', label: 'Effective Tax Rate' },
  ]

  return metricKeys.map(({ key, label }) => ({
    label,
    key,
    values: allMetrics.map(m => ({
      scenarioId: m.scenarioId,
      value: m[key],
    })),
    deltaFromBaseline: allMetrics
      .filter(m => m.scenarioId !== baseline.id)
      .map(m => {
        const baseVal = baselineMetrics[key]
        const val = m[key]
        return {
          scenarioId: m.scenarioId,
          delta: Math.round((val - baseVal) * 100) / 100,
          pctChange: baseVal !== 0 ? Math.round(((val - baseVal) / Math.abs(baseVal)) * 10000) / 100 : 0,
        }
      }),
  }))
}

/**
 * Calculate delta between two specific scenarios.
 */
export function calculateDelta(
  baseline: Scenario,
  variant: Scenario,
): Record<MetricKey, { delta: number; pctChange: number }> {
  const bm = calculateScenarioMetrics(baseline)
  const vm = calculateScenarioMetrics(variant)

  const keys: MetricKey[] = [
    'monthlyNetPay', 'monthlyDebtService', 'monthlyFreeCash',
    'annualSavingsCapacity', 'totalComp', 'effectiveTaxRate',
  ]

  const result = {} as Record<MetricKey, { delta: number; pctChange: number }>
  for (const key of keys) {
    const delta = vm[key] - bm[key]
    result[key] = {
      delta: Math.round(delta * 100) / 100,
      pctChange: bm[key] !== 0 ? Math.round((delta / Math.abs(bm[key])) * 10000) / 100 : 0,
    }
  }
  return result
}

/**
 * Rank scenarios by a specific metric (descending for most metrics,
 * ascending for debt service and tax rate where lower is better).
 */
export function rankByMetric(scenarios: Scenario[], metric: MetricKey): { scenarioId: string; name: string; value: number; rank: number }[] {
  const lowerIsBetter = metric === 'monthlyDebtService' || metric === 'effectiveTaxRate'

  return scenarios
    .map(s => {
      const metrics = calculateScenarioMetrics(s)
      return { scenarioId: s.id, name: s.name, value: metrics[metric] }
    })
    .sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value)
    .map((item, i) => ({ ...item, rank: i + 1 }))
}
