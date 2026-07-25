// Executive search pipeline — server-side data service (spec: dfwtargetlist.md).
// All reads go through the service client; tables are RLS-locked with no
// policies (single-tenant, server-only access).

import { createServiceClient } from '@/lib/supabase/service'

export interface PipelineCompany {
  id: string
  name: string
  source: 'active_pipeline' | 'target_list'
  tier: number | null
  dfw_location: string | null
  dfw_headcount: string | null
  title_ladder: string | null
  why_fit: string | null
  network_angle: string | null
  greenfield: boolean
  status: string
  priority: number
  comp_floor_met: boolean | null
  notes: string | null
}

export interface PipelineContact {
  id: string
  company_id: string | null
  name: string
  title: string | null
  contact_type: string | null
  alumni_source: string | null
  linkedin_url: string | null
  email: string | null
  warmth: number | null
  last_touch: string | null
  next_touch: string | null
  notes: string | null
  company_name?: string | null
}

export interface PipelineReq {
  id: string
  company_id: string
  req_id: string | null
  title: string
  level: string | null
  posted_date: string | null
  url: string | null
  base_range: string | null
  location: string | null
  fit_score: number | null
  archived: boolean
}

export interface Touchpoint {
  id: string
  contact_id: string | null
  company_id: string | null
  prong: 'referral' | 'submission' | 'outreach'
  channel: string | null
  direction: string | null
  occurred_at: string
  got_reply: boolean
  summary: string | null
}

export interface UnreferredApp {
  id: string
  title: string
  company: string
  submitted_at: string
  age_days: number
}

export interface WeekProng {
  prong: string
  touches: number
  replies: number
}

export interface PipelineData {
  companies: PipelineCompany[]
  contacts: PipelineContact[]
  reqs: PipelineReq[]
  thisWeek: WeekProng[]
  unreferred: UnreferredApp[]
  followUps: PipelineContact[]
  recentTouches: Touchpoint[]
}

const EMPTY: PipelineData = {
  companies: [], contacts: [], reqs: [], thisWeek: [], unreferred: [], followUps: [], recentTouches: [],
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getPipelineData(): Promise<PipelineData> {
  const supabase = createServiceClient()
  if (!supabase) return EMPTY

  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)) // ISO week start
  const today = new Date().toISOString().slice(0, 10)

  const [companiesRes, contactsRes, reqsRes, weekTouchesRes, unreferredRes, touchesRes] = await Promise.all([
    supabase.from('target_company').select('*')
      .order('source', { ascending: true }) // active_pipeline first
      .order('priority', { ascending: true })
      .order('name', { ascending: true }),
    supabase.from('contact').select('*'),
    supabase.from('requisition').select('*').eq('archived', false).order('fit_score', { ascending: false }),
    supabase.from('touchpoint').select('prong, got_reply').gte('occurred_at', monday.toISOString()),
    supabase.from('unreferred_applications').select('*'),
    supabase.from('touchpoint').select('*').order('occurred_at', { ascending: false }).limit(20),
  ])

  const companies = (companiesRes.data ?? []) as PipelineCompany[]
  const companyName = new Map(companies.map(c => [c.id, c.name]))

  const contacts = ((contactsRes.data ?? []) as PipelineContact[]).map(c => ({
    ...c,
    company_name: c.company_id ? companyName.get(c.company_id) ?? null : null,
  }))

  // Current-week scoreboard, aggregated in code (simpler than the SQL view
  // for a single week and avoids date_trunc timezone questions)
  const weekMap = new Map<string, { touches: number; replies: number }>()
  for (const t of (weekTouchesRes.data ?? []) as { prong: string; got_reply: boolean }[]) {
    const e = weekMap.get(t.prong) ?? { touches: 0, replies: 0 }
    e.touches++
    if (t.got_reply) e.replies++
    weekMap.set(t.prong, e)
  }
  const thisWeek = [...weekMap.entries()].map(([prong, v]) => ({ prong, ...v }))

  const unreferred = ((unreferredRes.data ?? []) as any[]).map(u => ({
    id: u.id,
    title: u.title,
    company: u.company,
    submitted_at: u.submitted_at,
    age_days: Math.floor((Date.now() - new Date(u.submitted_at).getTime()) / 86400000),
  }))

  const followUps = contacts
    .filter(c => c.next_touch && c.next_touch <= today)
    .sort((a, b) => (b.warmth ?? 0) - (a.warmth ?? 0))

  return {
    companies,
    contacts,
    reqs: (reqsRes.data ?? []) as PipelineReq[],
    thisWeek,
    unreferred,
    followUps,
    recentTouches: (touchesRes.data ?? []) as Touchpoint[],
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Weekly targets from the spec (§1): referrals per submitted req, 10–15
// submissions, 3–5 new outreach relationships. Bars use the lower bound.
export const WEEKLY_TARGETS: Record<string, { target: number; label: string }> = {
  referral: { target: 5, label: 'Referrals' },
  submission: { target: 10, label: 'Submissions' },
  outreach: { target: 3, label: 'Outreach' },
}
