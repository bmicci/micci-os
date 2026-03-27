// ═══════════════════════════════════════════════════════════════════
// Job Search — Default seed data (fallback when Supabase tables empty)
// ═══════════════════════════════════════════════════════════════════

import type {
  DbJobPipeline,
  DbJobOutreach,
  DbJobContent,
  DbJobRecruiter,
  DbJobWeeklyKpi,
} from '@/types/database'

export const SPRINT_START = '2026-03-24'
export const SPRINT_END = '2026-04-30'

export const defaultPipeline: DbJobPipeline[] = [
  { id: 'seed-1', company: 'McKesson', role: 'Data & AI Team (CDAO org)', status: 'waiting', stage: 'Round 2 Complete', contact: 'Shiv Misra / Girish Modgil', last_action: 'LinkedIn follow-up to Shiv 3/23', next_step: 'Wait 2-3 days, then recruiter follow-up', priority: 'high', notes: 'Shiv read message, no reply yet', sort_order: 0, created_at: '', updated_at: '' },
  { id: 'seed-2', company: 'Celestica', role: 'Global Director AI (CIO org)', status: 'active', stage: 'Follow-up Needed', contact: 'Roberto (CIO)', last_action: 'Interview completed', next_step: 'Send follow-up this week', priority: 'high', notes: 'Need to follow up ASAP', sort_order: 1, created_at: '', updated_at: '' },
  { id: 'seed-3', company: 'AT&T', role: 'AVP / VP (unpublished)', status: 'active', stage: 'Recruiter Intro', contact: 'Recruiter TBD', last_action: 'Recruiter conversation — HM wants to speak', next_step: 'Wait for HM scheduling', priority: 'high', notes: 'Role not published yet, strong recruiter signal', sort_order: 2, created_at: '', updated_at: '' },
  { id: 'seed-4', company: 'RealPage', role: 'AI Ambassador', status: 'active', stage: 'In Process', contact: 'TBD', last_action: 'Application submitted', next_step: 'Follow up', priority: 'medium', notes: '', sort_order: 3, created_at: '', updated_at: '' },
  { id: 'seed-5', company: 'Northwestern Mutual', role: 'AI Leader, Enterprise Enablement', status: 'active', stage: 'In Process', contact: 'TBD', last_action: 'Applied', next_step: 'Follow up', priority: 'medium', notes: '', sort_order: 4, created_at: '', updated_at: '' },
]

export const defaultOutreach: DbJobOutreach[] = [
  { id: 'seed-o1', date: '2026-03-24', target: 'Goldman Sachs', outreach_type: 'cold', method: 'LinkedIn', status: 'planned', notes: 'Target MD-level AI roles', created_at: '', updated_at: '' },
  { id: 'seed-o2', date: '2026-03-24', target: 'BlackRock', outreach_type: 'cold', method: 'LinkedIn', status: 'planned', notes: 'Chris Jones — Aladdin/AI team', created_at: '', updated_at: '' },
  { id: 'seed-o3', date: '2026-03-24', target: 'Wells Fargo', outreach_type: 'cold', method: 'LinkedIn', status: 'planned', notes: 'Michelle Mattison — recruiter', created_at: '', updated_at: '' },
  { id: 'seed-o4', date: '2026-03-25', target: 'Citi', outreach_type: 'warm', method: 'LinkedIn', status: 'planned', notes: 'Former employer — leverage network', created_at: '', updated_at: '' },
]

export const defaultContent: DbJobContent[] = [
  { id: 'seed-c1', week: 1, day_label: 'Tue 3/25', content_type: 'post', topic: "Enterprise AI Ownership — why 'shared accountability' kills AI programs", status: 'draft', notes: "Hook: Your AI program doesn't have a single owner? You don't have a program.", sort_order: 0, created_at: '', updated_at: '' },
  { id: 'seed-c2', week: 1, day_label: 'Thu 3/27', content_type: 'post', topic: 'Scaling LLM platforms from pilot to 27K users — lessons from the trenches', status: 'idea', notes: 'Draw from JPMC experience, keep it tactical', sort_order: 1, created_at: '', updated_at: '' },
  { id: 'seed-c3', week: 1, day_label: 'Daily', content_type: 'engage', topic: '3-5 thoughtful comments on CDAO/AI leader posts', status: 'ongoing', notes: 'Target: Girish Modgil, enterprise AI leaders, CDAO community', sort_order: 2, created_at: '', updated_at: '' },
  { id: 'seed-c4', week: 2, day_label: 'Tue 4/1', content_type: 'post', topic: 'Agentic AI governance — the missing playbook', status: 'idea', notes: 'Trending topic, strong positioning for CDAO roles', sort_order: 3, created_at: '', updated_at: '' },
  { id: 'seed-c5', week: 2, day_label: 'Thu 4/3', content_type: 'post', topic: 'Data mesh vs. data products — what actually works at Fortune 500 scale', status: 'idea', notes: '', sort_order: 4, created_at: '', updated_at: '' },
  { id: 'seed-c6', week: 3, day_label: 'Tue 4/8', content_type: 'post', topic: 'The CDAO role is eating consulting — $600B market shift', status: 'idea', notes: 'Expansion of viral comment from March', sort_order: 5, created_at: '', updated_at: '' },
  { id: 'seed-c7', week: 3, day_label: 'Thu 4/10', content_type: 'post', topic: 'AI ROI frameworks — moving beyond pilot metrics', status: 'idea', notes: '$400M impact framing', sort_order: 6, created_at: '', updated_at: '' },
  { id: 'seed-c8', week: 4, day_label: 'Tue 4/15', content_type: 'post', topic: 'Building AI trust at the board level', status: 'idea', notes: '', sort_order: 7, created_at: '', updated_at: '' },
  { id: 'seed-c9', week: 4, day_label: 'Thu 4/17', content_type: 'post', topic: 'Why your AI Center of Excellence is failing', status: 'idea', notes: '', sort_order: 8, created_at: '', updated_at: '' },
  { id: 'seed-c10', week: 5, day_label: 'Tue 4/22', content_type: 'post', topic: 'Enterprise LLM platforms — build vs. buy in 2026', status: 'idea', notes: '', sort_order: 9, created_at: '', updated_at: '' },
  { id: 'seed-c11', week: 5, day_label: 'Thu 4/24', content_type: 'post', topic: "The AI executive's first 90 days — a playbook", status: 'idea', notes: 'Strong for positioning as a hire', sort_order: 10, created_at: '', updated_at: '' },
]

export const defaultRecruiters: DbJobRecruiter[] = [
  { id: 'seed-r1', name: 'Korn Ferry', practice: 'Technology & Digital Officers', status: 'to_contact', last_contact: null, notes: 'Submit profile + LinkedIn to practice lead', created_at: '', updated_at: '' },
  { id: 'seed-r2', name: 'Spencer Stuart', practice: 'Technology Practice', status: 'to_contact', last_contact: null, notes: 'Direct LinkedIn outreach to FSI/tech partners', created_at: '', updated_at: '' },
  { id: 'seed-r3', name: 'Heidrick & Struggles', practice: 'Technology & Services', status: 'to_contact', last_contact: null, notes: 'Contact Dallas office directly', created_at: '', updated_at: '' },
  { id: 'seed-r4', name: 'Russell Reynolds', practice: 'Digital & Technology', status: 'to_contact', last_contact: null, notes: 'Submit via website + LinkedIn', created_at: '', updated_at: '' },
  { id: 'seed-r5', name: 'Egon Zehnder', practice: 'Digital Transformation', status: 'to_contact', last_contact: null, notes: 'LinkedIn outreach', created_at: '', updated_at: '' },
  { id: 'seed-r6', name: 'Selby Jennings', practice: 'Fintech / Data Science', status: 'to_contact', last_contact: null, notes: 'Very active at VP+ level in Dallas — high priority', created_at: '', updated_at: '' },
  { id: 'seed-r7', name: 'Tatum (Randstad)', practice: 'Interim/Perm tech executives', status: 'to_contact', last_contact: null, notes: 'Dallas office — good for fast placement', created_at: '', updated_at: '' },
]

export const defaultWeeklyKpis: DbJobWeeklyKpi[] = [
  { id: 'seed-k1', week_label: 'Wk 1 (3/24–3/28)', week_number: 1, apps: 0, outreach: 0, posts: 0, comments: 0, interviews: 0, target_apps: 8, target_outreach: 6, target_posts: 2, target_comments: 15, target_interviews: 2, created_at: '', updated_at: '' },
  { id: 'seed-k2', week_label: 'Wk 2 (3/31–4/4)', week_number: 2, apps: 0, outreach: 0, posts: 0, comments: 0, interviews: 0, target_apps: 8, target_outreach: 6, target_posts: 2, target_comments: 15, target_interviews: 2, created_at: '', updated_at: '' },
  { id: 'seed-k3', week_label: 'Wk 3 (4/7–4/11)', week_number: 3, apps: 0, outreach: 0, posts: 0, comments: 0, interviews: 0, target_apps: 8, target_outreach: 6, target_posts: 2, target_comments: 15, target_interviews: 3, created_at: '', updated_at: '' },
  { id: 'seed-k4', week_label: 'Wk 4 (4/14–4/18)', week_number: 4, apps: 0, outreach: 0, posts: 0, comments: 0, interviews: 0, target_apps: 8, target_outreach: 6, target_posts: 2, target_comments: 15, target_interviews: 3, created_at: '', updated_at: '' },
  { id: 'seed-k5', week_label: 'Wk 5 (4/21–4/25)', week_number: 5, apps: 0, outreach: 0, posts: 0, comments: 0, interviews: 0, target_apps: 6, target_outreach: 4, target_posts: 2, target_comments: 15, target_interviews: 3, created_at: '', updated_at: '' },
  { id: 'seed-k6', week_label: 'Wk 6 (4/28–4/30)', week_number: 6, apps: 0, outreach: 0, posts: 0, comments: 0, interviews: 0, target_apps: 3, target_outreach: 2, target_posts: 1, target_comments: 5, target_interviews: 2, created_at: '', updated_at: '' },
]

export interface JobSearchData {
  pipeline: DbJobPipeline[]
  outreach: DbJobOutreach[]
  content: DbJobContent[]
  recruiters: DbJobRecruiter[]
  weeklyKpis: DbJobWeeklyKpi[]
}

export function getDefaultJobSearchData(): JobSearchData {
  return {
    pipeline: defaultPipeline,
    outreach: defaultOutreach,
    content: defaultContent,
    recruiters: defaultRecruiters,
    weeklyKpis: defaultWeeklyKpis,
  }
}
