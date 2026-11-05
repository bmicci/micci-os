import ScenarioEngine from '@/components/financial/simulators/ScenarioEngine'
import { getFinancialData } from '@/lib/financial-data-service'
import { debtPaymentLines, livingLines } from '@/lib/finance/cashflowPlan'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Scenario Engine — Micci OS' }

export default async function ScenariosPage() {
  const data = await getFinancialData()
  // Fallback totals for a save made without visiting Cash Flow first
  const live = {
    monthlyDebtPayments: debtPaymentLines(data.debts).reduce((s, l) => s + l.amount, 0),
    totalLivingExpenses: livingLines(data.burnAnalysis.byCategory).reduce((s, l) => s + l.amount, 0),
  }
  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 px-4 md:px-6 py-4" style={{ borderBottom: '1px solid var(--glass-line)' }}>
        <h1 className="text-lg font-bold gradient-text">Scenario Comparison</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Save the current Paycheck + Cash Flow setup as a scenario · compare up to 3 side by side
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <ScenarioEngine live={live} />
      </div>
    </div>
  )
}
