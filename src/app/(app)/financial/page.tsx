import { getFinancialData } from '@/lib/financial-data-service'
import TabContainer from '@/components/financial/TabContainer'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Financial — Micci OS' }

const HELOC_CLOSE = new Date('2026-03-19')
const LIFE_INS_DEADLINE = new Date('2026-04-19')

function getBannerState() {
  const now = new Date()
  const helocClosed = now >= HELOC_CLOSE

  if (!helocClosed) {
    return {
      badge: 'EXIT DATE: MARCH 19, 2026',
      badgeColor: 'rgba(239,68,68,0.2)',
      badgeText: '#ef4444',
      days: Math.ceil((HELOC_CLOSE.getTime() - now.getTime()) / 86400000),
      daysLabel: 'days until HELOC must close',
      daysColor: '#ef4444',
    }
  }

  const daysToLifeIns = Math.ceil((LIFE_INS_DEADLINE.getTime() - now.getTime()) / 86400000)
  if (daysToLifeIns > 0) {
    return {
      badge: 'POST-JPMC · HELOC CLOSED',
      badgeColor: 'rgba(34,197,94,0.2)',
      badgeText: '#22c55e',
      days: daysToLifeIns,
      daysLabel: 'days until life insurance port deadline',
      daysColor: '#f59e0b',
    }
  }

  return {
    badge: 'POST-JPMC · STABILIZATION MODE',
    badgeColor: 'rgba(59,130,246,0.2)',
    badgeText: '#3b82f6',
    days: null,
    daysLabel: 'Focus: debt payoff · savings · DCAD protest',
    daysColor: 'var(--text-secondary)',
  }
}

export default async function FinancialPage() {
  const data = await getFinancialData()
  const banner = getBannerState()

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
            style={{ background: banner.badgeColor, color: banner.badgeText }}>
            {banner.badge}
          </div>
          <h1 className="text-lg font-bold gradient-text">Financial Master Plan 2026</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Brandon Micci · 9-Module Strategy
          </p>
        </div>
        <div className="text-right">
          {banner.days !== null ? (
            <div className="text-xl font-extrabold" style={{ color: banner.daysColor }}>
              {banner.days}
            </div>
          ) : null}
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {banner.daysLabel}
          </div>
        </div>
      </header>

      {/* Tabbed Dashboard */}
      <TabContainer data={data} />
    </div>
  )
}
