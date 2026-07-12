// ═══════════════════════════════════════════════════════════════════
// Job Search — Data service (Supabase with hardcoded fallback)
// ═══════════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/service'
import { getDefaultJobSearchData, type JobSearchData } from './job-search-data'
import type {
  DbJobPipeline,
  DbJobOutreach,
  DbJobContent,
  DbJobRecruiter,
  DbJobWeeklyKpi,
} from '@/types/database'

// ISO-ish week id: year*100 + week-of-year — unique per calendar week
function currentWeekNumber(d = new Date()): number {
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return d.getFullYear() * 100 + week
}

function currentWeekLabel(d = new Date()): string {
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  const f = (x: Date) => x.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  return `${f(mon)}–${f(fri)}`
}

export async function getJobSearchData(): Promise<JobSearchData> {
  const defaults = getDefaultJobSearchData()
  const supabase = createServiceClient()

  if (!supabase) return defaults

  try {
    // Time never freezes: make sure this week's KPI row exists so tracking
    // always has a live target row (carries forward the standard targets).
    const weekNum = currentWeekNumber()
    await supabase.from('job_weekly_kpis').upsert(
      { week_number: weekNum, week_label: currentWeekLabel() },
      { onConflict: 'week_number', ignoreDuplicates: true },
    )

    const [pipelineRes, outreachRes, contentRes, recruitersRes, kpisRes] =
      await Promise.all([
        supabase
          .from('job_pipeline')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('job_outreach')
          .select('*')
          .order('date', { ascending: false }),
        supabase
          .from('job_content')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('job_recruiters')
          .select('*')
          .order('name', { ascending: true }),
        supabase
          .from('job_weekly_kpis')
          .select('*')
          .order('week_number', { ascending: false }),
      ])

    // Tables are the source of truth: when a query SUCCEEDS, its rows win —
    // even when empty. Falling back on empty re-animated seeded fiction.
    // Defaults only cover a hard error (table missing / outage).
    return {
      pipeline: pipelineRes.error ? defaults.pipeline : ((pipelineRes.data ?? []) as DbJobPipeline[]),
      outreach: outreachRes.error ? defaults.outreach : ((outreachRes.data ?? []) as DbJobOutreach[]),
      content: contentRes.error ? defaults.content : ((contentRes.data ?? []) as DbJobContent[]),
      recruiters: recruitersRes.error ? defaults.recruiters : ((recruitersRes.data ?? []) as DbJobRecruiter[]),
      weeklyKpis: kpisRes.error ? defaults.weeklyKpis : ((kpisRes.data ?? []) as DbJobWeeklyKpi[]),
    }
  } catch {
    return defaults
  }
}
