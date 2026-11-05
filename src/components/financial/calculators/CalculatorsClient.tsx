'use client'

import { useState } from 'react'
import { Car, PiggyBank, Receipt, TrendingDown } from 'lucide-react'
import DebtPayoffCalc from './DebtPayoffCalc'
import CarCalc from './CarCalc'
import K401Calc from './K401Calc'
import BillsCalc from './BillsCalc'
import { num, type CalculatorProps } from './types'

const TABS = [
  { id: 'debt', label: 'Debt payoff', icon: TrendingDown },
  { id: 'car', label: 'Car', icon: Car },
  { id: 'k401', label: '401(k)', icon: PiggyBank },
  { id: 'bills', label: 'Bills', icon: Receipt },
] as const
type TabId = (typeof TABS)[number]['id']

export default function CalculatorsClient(props: CalculatorProps) {
  const [tab, setTab] = useState<TabId>('debt')
  const a = props.plan.assumptions
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[28px] md:text-3xl font-bold tracking-tight leading-tight">Calculators</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Play with debt payments, a car, your 401(k) and bills. Starts from your live balances and plan v5; nothing here changes your data.
        </p>
      </header>

      <nav aria-label="Calculators" className="no-scrollbar flex gap-1 p-1 rounded-2xl overflow-x-auto md:w-fit"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className="flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors"
            style={{ background: tab === id ? 'var(--accent-cyan)' : 'transparent', color: tab === id ? '#04131c' : 'var(--text-secondary)', fontWeight: tab === id ? 600 : 500 }}>
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>

      {tab === 'debt' && <DebtPayoffCalc {...props} bonusNet={num(a.bonus_net, 37000)} firstBonus={typeof a.first_bonus === 'string' ? a.first_bonus : '2028-03'} />}
      {tab === 'car' && <CarCalc plan={props.plan} />}
      {tab === 'k401' && <K401Calc plan={props.plan} />}
      {tab === 'bills' && <BillsCalc {...props} />}
    </div>
  )
}
