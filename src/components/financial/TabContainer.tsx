'use client'

import { useState, useRef, useEffect } from 'react'
import { Hexagon, Waves, BarChart3, PiggyBank, TrendingUp, Landmark, CreditCard, Package } from 'lucide-react'
import type { FinancialData } from '@/lib/financial-data'
import { fmt } from '@/lib/financial-data'
import OverviewTab from './OverviewTab'
import CashFlowTab from './CashFlowTab'
import HELOCPlanTab from './HELOCPlanTab'
import BudgetActualTab from './BudgetActualTab'
import NetWorthTab from './NetWorthTab'
import DebtPayoffTab from './DebtPayoffTab'
import SubscriptionsTab from './SubscriptionsTab'
import InvestmentsTab from './InvestmentsTab'
import InvestmentsPortfolioTab from './InvestmentsPortfolioTab'
import type { DbPortfolioPosition, DbPortfolioTarget } from '@/types/database'

// Ordered to match how the money actually flows: status → cash movement →
// where it goes → the debt plan → assets. Promo deadlines live inside
// Debt Payoff (their natural home) rather than as a separate tab.
const TABS = [
  { id: 'overview', label: 'Overview', icon: Hexagon },
  { id: 'cashflow', label: 'Cash Flow', icon: Waves },
  { id: 'budget', label: 'Spending', icon: BarChart3 },
  { id: 'heloc', label: 'HELOC Plan', icon: Landmark },
  { id: 'debtpayoff', label: 'Debt Payoff', icon: CreditCard },
  { id: 'subscriptions', label: 'Subscriptions', icon: Package },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'networth', label: 'Net Worth', icon: PiggyBank },
] as const

type TabId = (typeof TABS)[number]['id']

export default function TabContainer({ data, positions = [], targets = [] }: {
  data: FinancialData
  positions?: DbPortfolioPosition[]
  targets?: DbPortfolioTarget[]
}) {
  const pTotalValue = positions.reduce((s, p) => s + Number(p.current_value ?? 0), 0)
  const pTotalCost = positions.reduce((s, p) => s + Number(p.cost_basis ?? 0), 0)
  const pTotalGL = pTotalValue - pTotalCost
  const pTotalGLPct = pTotalCost > 0 ? (pTotalGL / pTotalCost) * 100 : 0
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const navRef = useRef<HTMLElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)

  // Check if tabs overflow and show scroll hint on mobile
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const check = () => setShowScrollHint(el.scrollWidth > el.clientWidth + 4)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div className="flex flex-col min-h-full">
      {/* Tab navigation — improved mobile scroll */}
      <div className="relative">
        <nav
          ref={navRef}
          className="flex overflow-x-auto shrink-0 px-3 sm:px-6 gap-0"
          style={{
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid rgba(0,212,255,0.1)',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-2.5 sm:px-4 py-3 text-[11px] sm:text-[13px] font-medium whitespace-nowrap transition-all duration-200 border-b-[3px] shrink-0"
              style={{
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottomColor: activeTab === tab.id ? 'var(--accent-cyan)' : 'transparent',
                background: activeTab === tab.id ? 'rgba(0,212,255,0.04)' : 'transparent',
              }}
            >
              <tab.icon size={13} strokeWidth={2} className="inline mr-1 sm:mr-1.5 -mt-0.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
        {/* Scroll fade hint for mobile */}
        {showScrollHint && (
          <div
            className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none sm:hidden"
            style={{
              background: 'linear-gradient(to right, transparent, var(--bg-elevated))',
            }}
          />
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-3 sm:p-6 max-w-[1400px] mx-auto w-full">
        {activeTab === 'overview' && <OverviewTab data={data} onNavigate={(t) => setActiveTab(t as TabId)} />}
        {activeTab === 'cashflow' && (
          <CashFlowTab
            bills={data.bills}
            promos={data.promos}
            debts={data.debts}
            helocKPIs={data.helocKPIs}
            burnAnalysis={data.burnAnalysis}
            incomeBridge={data.incomeBridge}
            runwayProjection={data.runwayProjection}
          />
        )}
        {activeTab === 'investments' && (
          <div className="space-y-4">
            {/* Employer plan is real money in the net-worth number but has no
                positions imported — say so explicitly rather than leaving it
                as an unexplained delta. */}
            {data.portfolio && data.portfolio.employerSupplement > 0 && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>
                <div>
                  <p className="text-[12.5px] font-bold" style={{ color: '#a78bfa' }}>
                    Empower 401(k) — rollover planned
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Counted in net worth &amp; retirement total, but positions aren&apos;t imported —
                    balance is a manual figure until the rollover into the IRA completes.
                  </p>
                </div>
                <span className="font-mono font-bold text-[15px] shrink-0" style={{ color: '#a78bfa' }}>
                  {fmt(data.portfolio.employerSupplement)}
                </span>
              </div>
            )}
            <InvestmentsPortfolioTab
              positions={positions}
              targets={targets}
              totalValue={pTotalValue}
              totalCost={pTotalCost}
              totalGL={pTotalGL}
              totalGLPct={pTotalGLPct}
            />
            <InvestmentsTab investments={data.investments} />
          </div>
        )}
        {activeTab === 'heloc' && (
          <HELOCPlanTab
            helocAccounts={data.helocAccounts}
            helocKPIs={data.helocKPIs}
            waterfallData={data.waterfallData}
            promos={data.promos}
            debts={data.debts}
          />
        )}
        {activeTab === 'budget' && (
          <BudgetActualTab
            spendingCategories={data.spendingCategories}
            burnRate={data.burnRate}
            wealthScenarios={data.wealthScenarios}
            taxSnapshot={data.taxSnapshot}
            incomeBridge={data.incomeBridge}
          />
        )}
        {activeTab === 'networth' && (
          <NetWorthTab
            debts={data.debts}
            helocKPIs={data.helocKPIs}
            assets={data.assets}
          />
        )}
        {activeTab === 'debtpayoff' && (
          <DebtPayoffTab
            debts={data.debts}
            helocKPIs={data.helocKPIs}
            promos={data.promos}
          />
        )}
        {activeTab === 'subscriptions' && <SubscriptionsTab recurring={data.recurring} />}
      </div>
    </div>
  )
}
