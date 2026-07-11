import SimulatorProvider from '@/components/financial/SimulatorProvider'
import FinancialHydrator from '@/components/financial/FinancialHydrator'
import Link from 'next/link'
import { Banknote, Landmark, Waves, Scale, TrendingUp, Receipt } from 'lucide-react'

const SIMULATOR_NAV = [
  { href: '/finance/paycheck',     label: 'Paycheck',    icon: Banknote },
  { href: '/finance/heloc',        label: 'HELOC',       icon: Landmark },
  { href: '/finance/cashflow',     label: 'Cash Flow',   icon: Waves },
  { href: '/finance/scenarios',    label: 'Scenarios',   icon: Scale },
  { href: '/finance/investments',  label: 'Investments', icon: TrendingUp },
  { href: '/finance/tax',          label: 'Tax Center',  icon: Receipt },
]

export const metadata = { title: 'Financial Simulator — Micci OS' }

export default function FinanceSimulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimulatorProvider />
      <FinancialHydrator />
      <div className="flex flex-col min-h-full">
        {/* Sub-nav bar */}
        <nav
          className="shrink-0 flex items-center gap-1 px-6 py-2 overflow-x-auto"
          style={{
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid rgba(0,212,255,0.1)',
          }}
        >
          <Link
            href="/financial"
            className="text-xs px-2.5 py-1 rounded-md whitespace-nowrap transition-colors"
            style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            ← Overview
          </Link>
          <span style={{ color: 'rgba(0,212,255,0.2)', margin: '0 4px' }}>|</span>
          {SIMULATOR_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              <item.icon size={13} strokeWidth={1.9} />
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </>
  )
}
