import CalculatorsClient from '@/components/financial/calculators/CalculatorsClient'
import type { PlanData } from '@/components/financial/calculators/types'
import { getFinancialData } from '@/lib/financial-data-service'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata = { title: 'Calculators — Micci OS' }
export const dynamic = 'force-dynamic'

const EMPTY_PLAN: PlanData = {
  assumptions: {}, spending_lines: [], subscriptions: [], bills: [],
  car_tiers: [{ price: 50000, insurance_increase: 125 }, { price: 75000, insurance_increase: 200 }, { price: 100000, insurance_increase: 275 }],
  k401_elections: [
    { id: '5pct', label: '5% (baseline)', base_pct: 5, bonus_pct: 5 },
    { id: '10pct', label: '10% of base and bonus', base_pct: 10, bonus_pct: 10 },
  ],
}

async function loadPlan(): Promise<PlanData> {
  try {
    const { data } = await createServiceClient()!.from('financial_settings').select('value').eq('key', 'strategic_plan').maybeSingle()
    const v = data?.value as Partial<PlanData> | undefined
    if (!v || typeof v !== 'object') return EMPTY_PLAN
    return { ...EMPTY_PLAN, ...v } as PlanData
  } catch {
    return EMPTY_PLAN
  }
}

export default async function CalculatorsPage() {
  const [data, plan] = await Promise.all([getFinancialData(), loadPlan()])
  const debts = data.debts
    .filter(d => d.category !== 'Mortgage' && d.balance > 0)
    .map(d => ({
      id: d.name, name: d.name, balance: Math.round(d.balance * 100) / 100, apr: d.rate, minPayment: d.min ?? 0,
      payInFull: d.payInFull === true,
      note: d.payInFull ? 'Paid in full each month' : d.source === 'live' ? 'Live from your bank' : d.stale ? 'Manual entry, may be out of date' : 'Manual entry',
    }))
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit' }).format(new Date())
  return (
    <div className="px-4 py-6 md:px-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <CalculatorsClient debts={debts} plan={plan} startYm={parts.slice(0, 7)} />
    </div>
  )
}
