import TaxCenterTab from '@/components/financial/TaxCenterTab'
import type { TaxPlan2026 } from '@/lib/tax/estimate'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata = { title: 'Tax Center — Micci OS' }
export const dynamic = 'force-dynamic'

async function loadTaxPlan(): Promise<TaxPlan2026 | null> {
  try {
    const { data } = await createServiceClient()!.from('financial_settings').select('value').eq('key', 'tax_plan_2026').maybeSingle()
    const v = data?.value as TaxPlan2026 | undefined
    return v && Array.isArray(v.income) ? v : null
  } catch {
    return null
  }
}

export default async function TaxPage() {
  const plan2026 = await loadTaxPlan()
  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid var(--glass-line)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold gradient-text">🧾 Tax Center</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              2026 return estimate · property-tax timing · withholding check · filing history
            </p>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e',
            }}
          >
            ✓ 2025 FILED
          </span>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <TaxCenterTab plan2026={plan2026} />
      </div>
    </div>
  )
}
