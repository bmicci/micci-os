// ───────────────────────────────────────────────────────────────────────────
// Micci Daily briefs — shared types + tab registry.
//
// Briefs are written into Supabase (`briefs`, `brief_config`, `brief_tweaks`)
// by scheduled Claude routines via `upsert_brief()`; /briefs only reads them.
// Money, AI News and the Markets pre-market brief come from one weekday
// routine (docs/BRIEFS_RUNNER.md). The Grok bots that used to write them were
// retired on Nov 23, 2026; their old editions (doc_key `<date>-grok`) stay in
// the history. Today and Jobs were retired at the same time: the Duet morning
// brief covers Today, and the job search is over. Their rows stay in the
// table (the DB check still allows the tab ids) but no tab shows them.
// Every tab uses the generic block list below (docs/prds/06-DAILY-BRIEFS-PROMPTS.md).
// ───────────────────────────────────────────────────────────────────────────

export const BRIEF_TABS = [
  { id: 'money',   label: 'Money',   schedule: 'Weekdays ~6 AM CT' },
  { id: 'markets', label: 'Markets', schedule: 'Weekdays ~6 AM CT (pre-market)' },
  { id: 'ai',      label: 'AI News', schedule: 'Weekdays ~6 AM CT' },
  { id: 'health',  label: 'Health',  schedule: 'Daily 5:37 AM · Sun 5:47 PM' },
  { id: 'home',    label: 'Home',    schedule: 'Sat 8:57 AM' },
] as const

export type BriefTab = (typeof BRIEF_TABS)[number]['id']

export const isBriefTab = (v: unknown): v is BriefTab =>
  typeof v === 'string' && BRIEF_TABS.some(t => t.id === v)

export const TWEAK_KINDS = ['missing', 'noise', 'wrong', 'idea'] as const
export type TweakKind = (typeof TWEAK_KINDS)[number]

export type Tone = 'good' | 'warn' | 'crit' | 'accent'

export type BriefBlock =
  | { type: 'kpis'; title?: string; wide?: boolean; items: { label: string; value: string; delta?: string; tone?: Tone }[] }
  | { type: 'list'; title: string; wide?: boolean; items: { title: string; detail?: string; link?: string; link_label?: string; tone?: Tone }[] }
  | { type: 'table'; title: string; wide?: boolean; columns: string[]; rows: string[][] }
  | { type: 'drafts'; title: string; wide?: boolean; items: BriefDraft[] }
  | { type: 'decision'; title: string; wide?: boolean; question: string; recommendation: string; context?: string }
  | { type: 'text'; title: string; wide?: boolean; body: string }

export interface BriefDraft {
  action: string
  when?: string
  to?: string
  cc?: string
  to_note?: string
  subject: string
  draft: string
  thread_link?: string
}

export interface BriefRow {
  id: string
  tab: BriefTab
  doc_key: string
  brief_date: string
  generated_at: string | null
  source: string | null
  headline: string | null
  period_label: string | null
  chips: string[]
  blocks: BriefBlock[]
  payload: Record<string, unknown>
}

/** Lightweight row for the history picker. */
export interface BriefEdition {
  doc_key: string
  brief_date: string
  headline: string | null
  period_label: string | null
}

export interface BriefConfig {
  tab: BriefTab
  text: string
  updated_at: string
}

export interface BriefTweak {
  id: string
  tab: BriefTab
  edition: string | null
  section: string | null
  kind: TweakKind
  text: string
  status: 'open' | 'applied' | 'dismissed'
  created_at: string
}
