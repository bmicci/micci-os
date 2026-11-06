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

// Year-end target (financial_settings.investment_targets) and the year's
// starting value (first portfolio_history snapshot on/after Jan 1).
async function fetchGoal(): Promise<{ yearEndTarget?: number; yearStartValue?: number }> {
  const supabase = createServiceClient()
  if (!supabase) return {}
  const jan1 = `${new Date().getFullYear()}-01-01`
  const jan15 = `${new Date().getFullYear()}-01-15` // only a snapshot from early January counts as the year's start
  const [setting, firstSnap] = await Promise.all([
    supabase.from('financial_settings').select('value').eq('key', 'investment_targets').maybeSingle(),
    supabase.from('portfolio_history').select('total_value').gte('snapshot_date', jan1).lte('snapshot_date', jan15)
      .order('snapshot_date', { ascending: true }).limit(1).maybeSingle(),
  ])
  const v = (setting.data?.value ?? {}) as Record<string, unknown>
  const target = Number(v.year_end_target)
  const start = Number(firstSnap.data?.total_value ?? v.year_start_value)
  return {
    yearEndTarget: target > 0 ? target : undefined,
    yearStartValue: start > 0 ? start : undefined,
  }
}

export default async function InvestmentsPage() {
  const [positions, targets, goal] = await Promise.all([fetchPositions(), fetchTargets(), fetchGoal()])

  const totalValue = positions.reduce((s, p) => s + Number(p.current_value ?? 0), 0)
  const totalCost  = positions.reduce((s, p) => s + Number(p.cost_basis    ?? 0), 0)
  const totalGL    = totalValue - totalCost
  const totalGLPct = totalCost > 0 ? (totalGL / totalCost) * 100 : 0

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 px-6 py-4" style={{ borderBottom: '1px solid var(--glass-line)' }}>
        <h1 className="text-lg font-bold gradient-text">📈 Investment Portfolio</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          IRA-3509 · {positions.filter(p => Number(p.shares) > 0).length} active positions · {goal.yearEndTarget ? `Year-end target: $${Math.round(goal.yearEndTarget).toLocaleString('en-US')}` : 'No year-end target set'}
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
          yearEndTarget={goal.yearEndTarget}
          yearStartValue={goal.yearStartValue}
        />
      </div>
    </div>
  )
}
