'use client'

import { useState, useRef, useEffect } from 'react'
import type { FinancialData } from '@/lib/financial-data'
import OverviewTab from './OverviewTab'
import CashFlowTab from './CashFlowTab'
import HELOCPlanTab from './HELOCPlanTab'
import BudgetActualTab from './BudgetActualTab'
import NetWorthTab from './NetWorthTab'
import DebtPayoffTab from './DebtPayoffTab'
import PromoDeadlinesTab from './PromoDeadlinesTab'
import SubscriptionsTab from './SubscriptionsTab'
import InvestmentsTab from './InvestmentsTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: '⬡' },
  { id: 'cashflow', label: 'Cash Flow', icon: '📈' },
  { id: 'budget', label: 'Budget vs Actual', icon: '📊' },
  { id: 'networth', label: 'Net Worth', icon: '💰' },
  { id: 'investments', label: 'Investments', icon: '📈' },
  { id: 'heloc', label: 'HELOC Plan', icon: '🏦' },
  { id: 'debtpayoff', label: 'Debt Payoff', icon: '💳' },
  { id: 'promos', label: 'Promo Deadlines', icon: '⏰' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '📦' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function TabContainer({ data }: { data: FinancialData }) {
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
              <span className="mr-1 sm:mr-1.5">{tab.icon}</span>
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
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'cashflow' && (
          <CashFlowTab
            bills={data.bills}
            promos={data.promos}
            debts={data.debts}
            helocKPIs={data.helocKPIs}
            incomeBridge={data.incomeBridge}
          />
        )}
        {activeTab === 'investments' && (
          <InvestmentsTab investments={data.investments} />
        )}
        {activeTab === 'heloc' && (
          <HELOCPlanTab
            helocAccounts={data.helocAccounts}
            helocKPIs={data.helocKPIs}
            waterfallData={data.waterfallData}
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
        {activeTab === 'promos' && <PromoDeadlinesTab promos={data.promos} helocKPIs={data.helocKPIs} />}
        {activeTab === 'subscriptions' && (
          <SubscriptionsTab
            cancelSubs={data.cancelSubs}
            reviewSubs={data.reviewSubs}
            essentialBills={data.essentialBills}
            topActions={data.topActions}
            subscriptionSummary={data.subscriptionSummary}
          />
        )}
      </div>
    </div>
  )
}
