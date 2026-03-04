import { createClient } from '@/lib/supabase/server'
import FinancialSnapshot from '@/components/dashboard/FinancialSnapshot'
import GoalsSummary from '@/components/dashboard/GoalsSummary'
import SchedulePreview from '@/components/dashboard/SchedulePreview'
import HealthQuickView from '@/components/dashboard/HealthQuickView'

export const metadata = { title: 'Command Center — Micci OS' }

function daysUntil(isoDate: string): number | null {
  const diff = Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : null
}

function getTodayType(): 'weekday' | 'weekend' {
  const d = new Date().getDay()
  return d === 0 || d === 6 ? 'weekend' : 'weekday'
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: accounts },
    { data: subscriptions },
    { data: modules },
    { data: budgets },
    { data: goals },
    { data: schedule },
    { data: supplements },
    { data: protocols },
  ] = await Promise.all([
    supabase.from('debt_accounts').select('balance, minimum_payment'),
    supabase.from('subscriptions').select('amount, billing_cycle, action').eq('is_active', true),
    supabase.from('financial_modules').select('status'),
    supabase.from('budget_categories').select('monthly_actual, survival_budget'),
    supabase.from('goals').select('id, title, status, priority, target_date').eq('status', 'active').order('priority'),
    supabase.from('daily_schedule').select('id, day_type, time_slot, activity, category, duration_minutes'),
    supabase.from('supplements').select('id, name, is_active, timing').eq('is_active', true),
    supabase.from('hormone_protocols').select('id, name, substance, dosage, day_of_week, time_of_day, is_active').eq('is_active', true),
  ])

  const march19Days = daysUntil('2026-03-19')
  const dayType = getTodayType()

  return (
    <div className="px-6 md:px-10 py-8 space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-1">🏠 Command Center</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          March 2026 · Survival Budget Mode · JPMC Exit: March 19
        </p>
      </div>

      {/* ── HELOC Urgency Banner ── */}
      {march19Days != null && (
        <div className="rounded-xl p-4 bg-red-500/15 border border-red-500/30 flex items-start gap-3">
          <span className="text-xl mt-0.5 shrink-0">⚡</span>
          <div>
            <p className="font-semibold text-red-300">
              HELOC closing window:{' '}
              <span className="font-mono text-red-400">{march19Days}</span>{' '}
              day{march19Days !== 1 ? 's' : ''} remaining
            </p>
            <p className="text-xs text-red-300/70 mt-0.5">
              Must close before last day at JPMC — employment income required for lender approval
            </p>
          </div>
        </div>
      )}

      {/* ── Financial Snapshot ── */}
      <FinancialSnapshot
        accounts={accounts}
        subscriptions={subscriptions}
        modules={modules}
        budgets={budgets}
      />

      {/* ── 2-col grid: Goals + Schedule ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalsSummary goals={goals} />
        <SchedulePreview blocks={schedule} dayType={dayType} />
      </div>

      {/* ── Health Quick View ── */}
      <HealthQuickView supplements={supplements} protocols={protocols} />

    </div>
  )
}
