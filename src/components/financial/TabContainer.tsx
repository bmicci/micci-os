'use client'

import { useState } from 'react'
import type { FinancialData } from '@/lib/financial-data'
import OverviewTab from './OverviewTab'
import DebtTrackerTab from './DebtTrackerTab'
import MarchRunwayTab from './MarchRunwayTab'
import HELOCPlanTab from './HELOCPlanTab'
import PromoDeadlinesTab from './PromoDeadlinesTab'
import ModulePlaybookTab from './ModulePlaybookTab'
import SpendingBudgetTab from './SpendingBudgetTab'
import SubscriptionsTab from './SubscriptionsTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: '⬡' },
  { id: 'runway', label: 'March Runway', icon: '📅' },
  { id: 'heloc', label: 'HELOC Plan', icon: '🏦' },
  { id: 'debt', label: 'Debt Tracker', icon: '💳' },
  { id: 'promos', label: 'Promo Deadlines', icon: '⏰' },
  { id: 'playbook', label: 'Module Playbook', icon: '📋' },
  { id: 'spending', label: 'Spending & Budget', icon: '📊' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '📦' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function TabContainer({ data }: { data: FinancialData }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="flex flex-col min-h-full">
      {/* Tab navigation */}
      <nav
        className="flex overflow-x-auto shrink-0 px-4 sm:px-6 gap-0"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 sm:px-4 py-3 text-xs sm:text-[13px] font-medium whitespace-nowrap transition-all duration-200 border-b-[3px] shrink-0"
            style={{
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottomColor: activeTab === tab.id ? 'var(--accent-cyan)' : 'transparent',
              background: 'transparent',
            }}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="flex-1 p-4 sm:p-6 max-w-[1400px] mx-auto w-full">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'runway' && <MarchRunwayTab bills={data.bills} />}
        {activeTab === 'heloc' && <HELOCPlanTab helocAccounts={data.helocAccounts} debts={data.debts} />}
        {activeTab === 'debt' && <DebtTrackerTab debts={data.debts} />}
        {activeTab === 'promos' && <PromoDeadlinesTab promos={data.promos} />}
        {activeTab === 'playbook' && <ModulePlaybookTab modules={data.modules} />}
        {activeTab === 'spending' && (
          <SpendingBudgetTab
            spendingCategories={data.spendingCategories}
            burnRate={data.burnRate}
            wealthScenarios={data.wealthScenarios}
            taxSnapshot={data.taxSnapshot}
            transactionSummary={data.transactionSummary}
          />
        )}
        {activeTab === 'subscriptions' && (
          <SubscriptionsTab
            cancelSubs={data.cancelSubs}
            reviewSubs={data.reviewSubs}
            keepSubs={data.keepSubs}
            essentialBills={data.essentialBills}
            topActions={data.topActions}
          />
        )}
      </div>
    </div>
  )
}
