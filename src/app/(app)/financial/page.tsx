import { getFinancialData } from '@/lib/financial-data-service'
import TabContainer from '@/components/financial/TabContainer'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Financial — Micci OS' }

export default async function FinancialPage() {
  const data = await getFinancialData()

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="shrink-0 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
        }}
      >
        <div>
          <div className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1.5"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
            EXIT DATE: MARCH 19, 2026
          </div>
          <h1 className="text-lg font-bold gradient-text">Financial Master Plan 2026</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Brandon Micci · 9-Module Strategy
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            {Math.ceil((new Date('2026-03-19').getTime() - Date.now()) / 86400000)}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            days until HELOC must close
          </div>
        </div>
      </header>

      {/* Tabbed Dashboard */}
      <TabContainer data={data} />
    </div>
  )
}
