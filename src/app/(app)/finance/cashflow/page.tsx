import CashFlowModel, { type CashFlowLive } from '@/components/financial/simulators/CashFlowModel'
import { getFinancialData } from '@/lib/financial-data-service'
import { createServiceClient } from '@/lib/supabase/service'
import { plannedCashEvents, type PropertyTaxPlan } from '@/lib/finance/cashEvents'
import { debtPaymentLines, livingLines } from '@/lib/finance/cashflowPlan'
import { SS_RATE } from '@/lib/tax/brackets'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cash Flow Model — Micci OS' }

async function loadPropertyTax(): Promise<PropertyTaxPlan | null> {
  const supabase = createServiceClient()
  if (!supabase) return null
  const { data } = await supabase.from('financial_settings').select('value').eq('key', 'property_tax').maybeSingle()
  return data?.value && typeof data.value === 'object' ? (data.value as PropertyTaxPlan) : null
}

export default async function CashFlowPage() {
  const [data, propertyTax] = await Promise.all([getFinancialData(), loadPropertyTax()])
  const todayIso = new Date().toISOString().slice(0, 10)
  const accepted = data.offers.find(o => o.offer.status === 'accepted') ?? null

  const live: CashFlowLive = {
    todayIso,
    startingCash: Math.round((data.assets.cash + data.assets.savings) * 100) / 100,
    debtLines: debtPaymentLines(data.debts),
    livingLines: livingLines(data.burnAnalysis.byCategory),
    // Property tax plus every promo payoff due in the next 12 months
    events: plannedCashEvents(data.promos, data.debts, propertyTax, todayIso, 366),
    spendWindow: data.burnAnalysis.hasData
      ? { start: data.burnAnalysis.windowStart, end: data.burnAnalysis.windowEnd, txns: data.burnAnalysis.txnCount }
      : null,
    job: accepted ? {
      employer: accepted.offer.employer,
      firstPayday: accepted.offer.firstPayday,
      payFrequency: accepted.offer.payFrequency,
      netPerCheckEarly: accepted.netPerCheckEarly,
      grossPerCheck: accepted.result.grossPay,
      ssPerCheck: Math.round(accepted.result.grossPay * SS_RATE * 100) / 100,
    } : null,
  }

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 px-4 md:px-6 py-4" style={{ borderBottom: '1px solid var(--glass-line)' }}>
        <h1 className="text-lg font-bold gradient-text">Monthly Cash Flow</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Real paydays · live debt payments · living costs from your transactions · property tax and promo payoffs on their dates
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <CashFlowModel live={live} />
      </div>
    </div>
  )
}
