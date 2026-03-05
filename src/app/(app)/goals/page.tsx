import { createClient } from '@/lib/supabase/server'
import LifePlanClient from '@/components/life-plan/LifePlanClient'

export const metadata = { title: 'Life Plan — Micci OS' }

export default async function GoalsPage() {
  const supabase = await createClient()

  const [{ data: sections }, { data: goals }] = await Promise.all([
    supabase.from('life_plan_sections').select('*').order('sort_order'),
    supabase.from('life_plan_goals').select('*').order('sort_order'),
  ])

  return (
    <div className="px-6 md:px-10 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text mb-1">🗺️ Life Plan</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Master goals · Foundation · Age 40 → 60 · Vision Board
        </p>
      </div>

      <LifePlanClient
        initialSections={sections ?? []}
        initialGoals={goals ?? []}
      />
    </div>
  )
}
