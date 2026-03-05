import { createClient } from '@/lib/supabase/server'
import LifePlanClient from '@/components/life-plan/LifePlanClient'

export const metadata = { title: 'Life Plan — Micci OS' }

export default async function GoalsPage() {
  const supabase = await createClient()

  const [{ data: goalStates }, { data: customGoals }] = await Promise.all([
    supabase.from('life_plan_goal_states').select('*'),
    supabase.from('life_plan_custom_goals').select('*').order('created_at'),
  ])

  return (
    <div className="px-6 md:px-10 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text mb-1">🗺️ Life Plan</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Master goals · Foundation · Age 40 → 60 · Vision Board
        </p>
      </div>

      <LifePlanClient
        initialGoalStates={goalStates ?? []}
        initialCustomGoals={customGoals ?? []}
      />
    </div>
  )
}
