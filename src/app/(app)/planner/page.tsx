import { createServiceClient } from '@/lib/supabase/service'
import PlannerApp from '@/components/planner/PlannerApp'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Planner — Micci OS' }

export default async function PlannerPage() {
  const supabase = createServiceClient()
  const completions: string[] = []

  if (supabase) {
    try {
      const { data } = await supabase
        .from('schedule_completions')
        .select('key')
      data?.forEach(r => completions.push(r.key as string))
    } catch {
      // Table may not exist yet — app still works with empty completions
    }
  }

  return <PlannerApp initialCompletions={completions} />
}
