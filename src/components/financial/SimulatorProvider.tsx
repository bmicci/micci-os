'use client'

/**
 * SimulatorProvider — client component that:
 * 1. Subscribes paycheck + HELOC stores → feeds cashflow store
 * 2. Loads persisted paycheck settings from API on mount
 * 3. Loads saved scenarios from API on mount
 *
 * Mount once in the /finance layout. No render output.
 */

import { useEffect, useRef } from 'react'
import { usePaycheckStore } from '@/stores/finance/paycheck-store'
import { useHELOCStore } from '@/stores/finance/heloc-store'
import { useCashFlowStore } from '@/stores/finance/cashflow-store'
import { useScenarioStore } from '@/stores/finance/scenario-store'
import type { Scenario } from '@/types/finance'

function mapDbScenario(row: Record<string, unknown>): Scenario {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    name: String(row.name ?? 'Untitled'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    isBaseline: Boolean(row.is_baseline ?? false),
    paycheckInputs: (row.paycheck_inputs as Scenario['paycheckInputs']) ?? {} as Scenario['paycheckInputs'],
    helocInputs: (row.heloc_inputs as Record<string, unknown>) ?? {},
    cashflowInputs: (row.cashflow_inputs as Record<string, unknown>) ?? {},
    notes: String(row.notes ?? ''),
  }
}

export default function SimulatorProvider() {
  const paycheckHydrated = usePaycheckStore(s => s.hydrated)
  const helocHydrated = useHELOCStore(s => s.hydrated)
  const scenariosHydrated = useScenarioStore(s => s.hydrate)
  const hydratePaycheck = usePaycheckStore(s => s.hydrate)
  const setCrossModule = useCashFlowStore(s => s.setCrossModuleInputs)
  const initialized = useRef(false)

  // Load persisted paycheck settings from API once
  useEffect(() => {
    if (paycheckHydrated) return
    fetch('/api/finance/paycheck-settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data === 'object') {
          hydratePaycheck({
            salary: data.salary ?? undefined,
            bonusPercent: data.bonus_percent ?? undefined,
            payFrequency: data.pay_frequency ?? undefined,
            filingStatus: data.filing_status ?? undefined,
            state: data.state ?? undefined,
            taxMethod: data.tax_method ?? undefined,
            manualEffectiveRate: data.manual_effective_rate ?? undefined,
            contribution401k: data.contribution_401k ?? undefined,
            employerMatchPct: data.employer_match_pct ?? undefined,
            employerMatchCap: data.employer_match_cap ?? undefined,
            hsaContribution: data.hsa_contribution ?? undefined,
            healthPremium: data.health_premium ?? undefined,
            otherPreTax: data.other_pre_tax ?? undefined,
          })
        } else {
          // Trigger initial calculation with defaults
          hydratePaycheck({})
        }
      })
      .catch(() => hydratePaycheck({}))
  }, [paycheckHydrated, hydratePaycheck])

  // Load saved scenarios
  useEffect(() => {
    fetch('/api/finance/scenarios')
      .then(r => r.ok ? r.json() : [])
      .then((rows: Record<string, unknown>[]) => {
        if (Array.isArray(rows) && rows.length > 0) {
          scenariosHydrated(rows.map(mapDbScenario))
        }
      })
      .catch(() => {})
  }, [scenariosHydrated])

  // Wire paycheck → cashflow (subscribe to result changes)
  useEffect(() => {
    const unsubPaycheck = usePaycheckStore.subscribe(
      s => s.result,
      result => {
        if (!result) return
        const freq = usePaycheckStore.getState().inputs.payFrequency
        setCrossModule({
          netPayPerPeriod: result.netPay,
          payFrequency: freq,
        })
      },
    )

    const unsubHELOC = useHELOCStore.subscribe(
      s => ({ monthlyInterest: s.monthlyInterest, promoMins: s.monthlyPromoMinimums, deferredPmts: s.monthlyDeferredPayments }),
      ({ monthlyInterest, promoMins, deferredPmts }) => {
        setCrossModule({
          helocMonthlyInterest: monthlyInterest,
          promoMinimums: promoMins,
          deferredPayments: deferredPmts,
        })
      },
    )

    // Fire once if stores already have data
    if (!initialized.current) {
      initialized.current = true
      const pr = usePaycheckStore.getState().result
      if (pr) {
        const freq = usePaycheckStore.getState().inputs.payFrequency
        setCrossModule({ netPayPerPeriod: pr.netPay, payFrequency: freq })
      }
      const hs = useHELOCStore.getState()
      setCrossModule({
        helocMonthlyInterest: hs.monthlyInterest,
        promoMinimums: hs.monthlyPromoMinimums,
        deferredPayments: hs.monthlyDeferredPayments,
      })
    }

    return () => {
      unsubPaycheck()
      unsubHELOC()
    }
  }, [setCrossModule])

  return null
}
