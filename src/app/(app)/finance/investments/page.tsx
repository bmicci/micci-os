import { createServiceClient } from '@/lib/supabase/service'
import type { DbPortfolioPosition, DbPortfolioTarget } from '@/types/database'
import InvestmentsPortfolioTab from '@/components/financial/InvestmentsPortfolioTab'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Investment Portfolio — Micci OS' }

async function fetchPositions(): Promise<DbPortfolioPosition[]> {
  const supabase = createServiceClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('portfolio_positions')
    .select('*')
    .order('current_value', { ascending: false })
  if (error) { console.error('[investments/page] positions:', error.message); return [] }
  return (data ?? []) as DbPortfolioPosition[]
}

async function fetchTargets(): Promise<DbPortfolioTarget[]> {
  const supabase = createServiceClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('portfolio_targets')
    .select('*')
    .order('target_pct', { ascending: false })
  if (error) { console.error('[investments/page] targets:', error.message); return [] }
  return (data ?? []) as DbPortfolioTarget[]
}

export default async function InvestmentsPage() {
  const [positions, targets] = await Promise.all([fetchPositions(), fetchTargets()])

  const totalValue = positions.reduce((s, p) => s + Number(p.current_value ?? 0), 0)
  const totalCost  = positions.reduce((s, p) => s + Number(p.cost_basis    ?? 0), 0)
  const totalGL    = totalValue - totalCost
  const totalGLPct = totalCost > 0 ? (totalGL / totalCost) * 100 : 0

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 px-6 py-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <h1 className="text-lg font-bold gradient-text">📈 Investment Portfolio</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          IRA-3509 · {positions.filter(p => Number(p.shares) > 0).length} active positions · Year-end target: $189,053
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <InvestmentsPortfolioTab
          positions={positions}
          targets={targets}
          totalValue={totalValue}
          totalCost={totalCost}
          totalGL={totalGL}
          totalGLPct={totalGLPct}
        />
      </div>
    </div>
  )
}
