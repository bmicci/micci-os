import { createClient } from '@/lib/supabase/server'
import DailyTracker from '@/components/daily/DailyTracker'
import type { DbRoutine, DbRoutineCompletion } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Daily Command — Micci OS' }

export default async function DailyPage() {
  const supabase = await createClient()

  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

  const [{ data: routines }, { data: completions }] = await Promise.all([
    supabase
      .from('routines')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('routine_completions')
      .select('routine_id, completed_date, skipped')
      .eq('completed_date', today),
  ])

  const completedIds = new Set(
    (completions ?? [])
      .filter((c: Pick<DbRoutineCompletion, 'routine_id' | 'completed_date' | 'skipped'>) => !c.skipped)
      .map((c: Pick<DbRoutineCompletion, 'routine_id' | 'completed_date' | 'skipped'>) => c.routine_id)
  )

  return (
    <DailyTracker
      initialRoutines={(routines ?? []) as DbRoutine[]}
      initialCompletedIds={[...completedIds]}
      initialDate={today}
    />
  )
}
