'use client'

import { useState } from 'react'
import type { JobSearchData } from '@/lib/job-search-data'
import DashboardTab from './DashboardTab'
import PipelineTab from './PipelineTab'
import ContentTab from './ContentTab'
import RecruitersTab from './RecruitersTab'
import KPITab from './KPITab'
import ScheduleTab from './ScheduleTab'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'content', label: 'LinkedIn' },
  { id: 'recruiters', label: 'Recruiters' },
  { id: 'kpis', label: 'KPIs' },
  { id: 'schedule', label: 'Daily Plan' },
] as const

type TabId = (typeof TABS)[number]['id']

interface Props {
  initialData: JobSearchData
}

export default function JobSearchApp({ initialData }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [data, setData] = useState<JobSearchData>(initialData)

  return (
    <div className="flex flex-col flex-1">
      {/* Tab bar */}
      <div
        className="flex overflow-x-auto shrink-0"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-3 text-[11px] font-semibold tracking-widest uppercase whitespace-nowrap transition-all duration-150"
            style={{
              background: 'none',
              border: 'none',
              borderBottom:
                activeTab === tab.id
                  ? '2px solid var(--accent-cyan)'
                  : '2px solid transparent',
              color:
                activeTab === tab.id
                  ? 'var(--accent-cyan)'
                  : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ maxWidth: 1200 }}>
        {activeTab === 'dashboard' && <DashboardTab data={data} />}
        {activeTab === 'pipeline' && <PipelineTab data={data} setData={setData} />}
        {activeTab === 'content' && <ContentTab data={data} setData={setData} />}
        {activeTab === 'recruiters' && <RecruitersTab data={data} setData={setData} />}
        {activeTab === 'kpis' && <KPITab data={data} setData={setData} />}
        {activeTab === 'schedule' && <ScheduleTab />}
      </div>
    </div>
  )
}
