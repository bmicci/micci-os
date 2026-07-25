import Link from 'next/link'
import { getFinancialData } from '@/lib/financial-data-service'
import type { RunwayProjection } from '@/lib/financial-data'
import TabContainer from '@/components/financial/TabContainer'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Financial — Micci OS' }

const HELOC_CLOSE = new Date('2026-03-19')
const LIFE_INS_DEADLINE = new Date('2026-04-19')

function getBannerState(runway: RunwayProjection) {
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

  // Stabilization mode: the number that matters from every tab is the cash
  // runway, so it lives in the header (not buried in the Cash Flow tab).
  if (runway.cashOutDate) {
    const days = Math.ceil((new Date(runway.cashOutDate + 'T00:00:00').getTime() - now.getTime()) / 86400000)
    const cashOutLabel = new Date(runway.cashOutDate + 'T00:00:00')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return {
      badge: 'POST-JPMC · STABILIZATION MODE',
      badgeColor: 'rgba(59,130,246,0.2)',
      badgeText: '#3b82f6',
      days: Math.max(days, 0),
      daysLabel: `days of cash runway · cash-out ≈ ${cashOutLabel}`,
      daysColor: days < 60 ? '#ef4444' : days < 120 ? '#f59e0b' : '#3b82f6',
    }
  }

  return {
    badge: 'POST-JPMC · STABILIZATION MODE',
    badgeColor: 'rgba(59,130,246,0.2)',
    badgeText: '#3b82f6',
    days: null,
    daysLabel: 'Cash-flow positive — no cash-out date in projection',
    daysColor: 'var(--text-secondary)',
  }
}

// Burn, runway, and subscriptions all derive from imported transactions —
// they silently drift as the data ages, so surface it instead of letting a
// stale month masquerade as current.
const STALE_AFTER_DAYS = 21

export default async function FinancialPage() {
  const data = await getFinancialData()
  const banner = getBannerState(data.runwayProjection)
  const newestTxn = data.burnAnalysis.hasData ? data.burnAnalysis.windowEnd : null
  const staleDays = newestTxn
    ? Math.floor((Date.now() - new Date(newestTxn + 'T00:00:00').getTime()) / 86400000)
    : null
  const isStale = staleDays != null && staleDays > STALE_AFTER_DAYS

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
          {isStale && (
            <Link
              href="/import"
              className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1.5 ml-2 hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', textDecoration: 'none' }}
            >
              ⚠ DATA {staleDays}D OLD — RE-IMPORT CSVs →
            </Link>
          )}
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
