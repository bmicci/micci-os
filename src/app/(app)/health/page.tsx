import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import HealthTabContainer from '@/components/health/HealthTabContainer'
import type { HealthData } from '@/components/health/types'
import type { ScheduleBlock } from '@/lib/supabase/types'
import { computeHealthOverview, type HealthDailyRow, type BodyMetricRow } from '@/lib/health/overview'
import { chicagoToday, shiftDay } from '@/lib/health/dates'

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
    // Placeholder rows from the original seed are tagged source='seed' and hidden
    supabase.from('lab_markers').select('*').or('source.is.null,source.neq.seed').order('test_date', { ascending: false }),
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

  // Overview: health_daily (check-ins + WHOOP), body trend, latest Health brief.
  // These tables are service-role only (deny-all RLS).
  const today = chicagoToday()
  let daily: HealthDailyRow[] = []
  let body: BodyMetricRow[] = []
  let brief: { headline: string | null; brief_date: string } | null = null
  if (service) {
    try {
      const [dailyRes, bodyRes, briefRes] = await Promise.all([
        service.from('health_daily').select('*').order('day', { ascending: true }),
        service.from('body_metrics')
          .select('metric_date, source, weight_lbs, skeletal_muscle_lbs, body_fat_pct, body_fat_percent')
          .gte('metric_date', shiftDay(today, -365)).order('metric_date', { ascending: true }),
        service.from('briefs').select('headline, brief_date').eq('tab', 'health')
          .order('brief_date', { ascending: false }).limit(1).maybeSingle(),
      ])
      daily = (dailyRes.data ?? []) as HealthDailyRow[]
      body = (bodyRes.data ?? []) as BodyMetricRow[]
      brief = briefRes.data
    } catch {
      // Overview renders its empty states
    }
  }
  const overview = computeHealthOverview(daily, body, today)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-10 pt-8 pb-4 shrink-0">
        <h1 className="text-3xl font-bold gradient-text mb-1">Health & Wellness</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Overview · Today · Protocols · Lab Results · Fitness · Skincare
        </p>
      </div>

      {/* Tab container */}
      <HealthTabContainer
        data={data}
        scheduleBlocks={scheduleBlocks}
        scheduleCompletions={scheduleCompletions}
        overview={overview}
        briefHeadline={brief?.headline ?? null}
        briefDate={brief?.brief_date ?? null}
      />
    </div>
  )
}
