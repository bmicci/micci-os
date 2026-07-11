import { createClient } from '@/lib/supabase/server'
import HealthTabContainer from '@/components/health/HealthTabContainer'
import type { HealthData } from '@/components/health/types'

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-10 pt-8 pb-4 shrink-0">
        <h1 className="text-3xl font-bold gradient-text mb-1">Health & Wellness</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Protocols · Lab Results · Fitness · Skincare
        </p>
      </div>

      {/* Tab container */}
      <HealthTabContainer data={data} />
    </div>
  )
}
