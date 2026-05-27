'use client'

import { useState, useRef, useEffect } from 'react'
import type { HealthData } from './types'
import ProtocolsTab from './ProtocolsTab'
import LabsTab from './LabsTab'
import FitnessTab from './FitnessTab'
import SkincareTab from './SkincareTab'

const TABS = [
  { id: 'protocols', label: 'Protocols',  icon: '⚗️' },
  { id: 'labs',      label: 'Lab Results', icon: '🔬' },
  { id: 'fitness',   label: 'Fitness',     icon: '💪' },
  { id: 'skincare',  label: 'Skincare',    icon: '✨' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function HealthTabContainer({ data }: { data: HealthData }) {
  const [activeTab, setActiveTab] = useState<TabId>('protocols')
  const navRef = useRef<HTMLElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const check = () => setShowScrollHint(el.scrollWidth > el.clientWidth + 4)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab nav */}
      <div className="relative shrink-0">
        <nav
          ref={navRef}
          className="flex overflow-x-auto px-3 sm:px-6 gap-0"
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
              className="px-3 sm:px-5 py-3 text-[11px] sm:text-[13px] font-medium whitespace-nowrap transition-all duration-200 border-b-[3px] shrink-0"
              style={{
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottomColor: activeTab === tab.id ? 'var(--accent-cyan)' : 'transparent',
                background: activeTab === tab.id ? 'rgba(0,212,255,0.04)' : 'transparent',
              }}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        {showScrollHint && (
          <div
            className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none sm:hidden"
            style={{ background: 'linear-gradient(to right, transparent, var(--bg-elevated))' }}
          />
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'protocols' && (
          <ProtocolsTab
            protocols={data.protocols}
            supplements={data.supplements}
            compliance={data.compliance}
          />
        )}
        {activeTab === 'labs' && (
          <LabsTab labMarkers={data.labMarkers} />
        )}
        {activeTab === 'fitness' && (
          <FitnessTab workouts={data.workouts} bodyMetrics={data.bodyMetrics} />
        )}
        {activeTab === 'skincare' && (
          <SkincareTab skincare={data.skincare} />
        )}
      </div>
    </div>
  )
}
