import { createServiceClient } from '@/lib/supabase/service'
import PlannerApp from '@/components/planner/PlannerApp'
import { ScheduleBlock } from '@/lib/supabase/types'
import { requireOwnerPage } from '@/lib/supabase/require-user'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Planner — Micci OS' }

export default async function PlannerPage() {
  await requireOwnerPage()
  const supabase = createServiceClient()
  const completions: string[] = []
  const customBlocks: ScheduleBlock[] = []

  if (supabase) {
    try {
      const [completionsRes, blocksRes] = await Promise.all([
        supabase.from('schedule_completions').select('key'),
        supabase.from('schedule_blocks').select('*').order('sort_order', { ascending: true }),
      ])
      completionsRes.data?.forEach(r => completions.push(r.key as string))
      blocksRes.data?.forEach(r => customBlocks.push(r as ScheduleBlock))
    } catch {
      // Tables may not exist yet — app still works with empty data
    }
  }

  return <PlannerApp initialCompletions={completions} initialCustomBlocks={customBlocks} />
}
