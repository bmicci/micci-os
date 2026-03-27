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

export async function getJobSearchData(): Promise<JobSearchData> {
  const defaults = getDefaultJobSearchData()
  const supabase = createServiceClient()

  if (!supabase) return defaults

  try {
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
          .order('week_number', { ascending: true }),
      ])

    return {
      pipeline:
        (pipelineRes.data as DbJobPipeline[] | null)?.length
          ? (pipelineRes.data as DbJobPipeline[])
          : defaults.pipeline,
      outreach:
        (outreachRes.data as DbJobOutreach[] | null)?.length
          ? (outreachRes.data as DbJobOutreach[])
          : defaults.outreach,
      content:
        (contentRes.data as DbJobContent[] | null)?.length
          ? (contentRes.data as DbJobContent[])
          : defaults.content,
      recruiters:
        (recruitersRes.data as DbJobRecruiter[] | null)?.length
          ? (recruitersRes.data as DbJobRecruiter[])
          : defaults.recruiters,
      weeklyKpis:
        (kpisRes.data as DbJobWeeklyKpi[] | null)?.length
          ? (kpisRes.data as DbJobWeeklyKpi[])
          : defaults.weeklyKpis,
    }
  } catch {
    return defaults
  }
}
