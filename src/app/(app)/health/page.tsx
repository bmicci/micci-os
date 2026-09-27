import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import HealthTabContainer from '@/components/health/HealthTabContainer'
import type { HealthData } from '@/components/health/types'
import type { ScheduleBlock } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Health — Micci OS' }

export default async function HealthPage() {
  const supabase = await createClient()

  const [
    { data: supplements },
    { data: protocols },
    { data: labMarkers },
    { data: workouts },
    { data: bodyMetrics },
    { data: compliance },
    { data: skincare },
  ] = await Promise.all([
    supabase.from('supplements').select('*').order('category').order('name'),
    supabase.from('hormone_protocols').select('*').order('name'),
    supabase.from('lab_markers').select('*').order('test_date', { ascending: false }),
    supabase.from('workouts').select('*').order('workout_date', { ascending: false }).limit(60),
    supabase.from('body_metrics').select('*').order('metric_date', { ascending: false }).limit(30),
    supabase.from('protocol_compliance').select('*').order('completed_date', { ascending: false }).limit(90),
    supabase.from('skincare_routine').select('*').eq('is_active', true).order('time_of_day').order('step_order'),
  ])

  const data: HealthData = {
    supplements:  (supplements  ?? []) as HealthData['supplements'],
    protocols:    (protocols    ?? []) as HealthData['protocols'],
    labMarkers:   (labMarkers   ?? []) as HealthData['labMarkers'],
    workouts:     (workouts     ?? []) as HealthData['workouts'],
    bodyMetrics:  (bodyMetrics  ?? []) as HealthData['bodyMetrics'],
    compliance:   (compliance   ?? []) as HealthData['compliance'],
    skincare:     (skincare     ?? []) as HealthData['skincare'],
  }

  // Schedule data for the Today tab — same tables and completion keys the
  // Planner uses, so check-offs are shared between the two pages.
  const service = createServiceClient()
  const scheduleCompletions: string[] = []
  const scheduleBlocks: ScheduleBlock[] = []
  if (service) {
    try {
      const [completionsRes, blocksRes] = await Promise.all([
        service.from('schedule_completions').select('key'),
        service.from('schedule_blocks').select('*').order('sort_order', { ascending: true }),
      ])
      completionsRes.data?.forEach(r => scheduleCompletions.push(r.key as string))
      blocksRes.data?.forEach(r => scheduleBlocks.push(r as ScheduleBlock))
    } catch {
      // Today tab degrades to the template-only schedule
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-10 pt-8 pb-4 shrink-0">
        <h1 className="text-3xl font-bold gradient-text mb-1">Health & Wellness</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Today · Protocols · Lab Results · Fitness · Skincare
        </p>
      </div>

      {/* Tab container */}
      <HealthTabContainer
        data={data}
        scheduleBlocks={scheduleBlocks}
        scheduleCompletions={scheduleCompletions}
      />
    </div>
  )
}
