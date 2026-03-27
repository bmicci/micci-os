// ═══════════════════════════════════════════════════════════════════
// Database Types — Raw Supabase row shapes
// Match schema.sql column names exactly (snake_case)
// ═══════════════════════════════════════════════════════════════════

// ── Financial ─────────────────────────────────────────────────────

export interface DbDebtAccount {
  id: string
  user_id?: string
  name: string
  account_type: 'credit_card' | 'heloc' | 'loan' | 'mortgage' | 'line_of_credit' | 'other'
  balance: number
  interest_rate: number
  minimum_payment: number | null
  due_day: number | null
  status: 'active' | 'paid_off' | 'closed' | 'negotiating' | null
  recommendation?: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbFinancialModule {
  id: string
  user_id?: string
  module_number?: number
  name: string
  category: string | null
  status: string
  progress: number
  description: string | null
  details: {
    docsHave?: string[]
    docsMissing?: string[]
    actions?: string[]
  } | null
  created_at: string
  updated_at: string
}

export interface DbSubscription {
  id: string
  user_id?: string
  name: string
  amount: number
  billing_cycle: string
  category: string | null
  action: 'cancel' | 'review' | 'keep' | 'essential' | null
  notes: string | null
  is_active: boolean
  next_billing_date: string | null
  created_at: string
}

export interface DbBudgetCategory {
  id: string
  user_id?: string
  name: string
  monthly_actual: number | null
  annual_actual: number | null
  survival_budget: number | null
  pct_of_total: number | null
  color: string | null
  created_at: string
}

export interface DbDeadline {
  id: string
  user_id: string
  title: string
  description: string | null
  deadline_date: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  module: string | null
  impact_if_missed: string | null
  status: 'upcoming' | 'completed' | 'missed'
  created_at: string
  updated_at: string
}

// ── Simulator (Phase 1) ──────────────────────────────────────────

export interface DbPaycheckSettings {
  id: string
  user_id: string
  salary: number
  bonus_percent: number
  pay_frequency: number
  filing_status: string
  state: string
  tax_method: string
  manual_effective_rate: number
  contribution_401k: number
  employer_match_pct: number
  employer_match_cap: number
  hsa_contribution: number
  health_premium: number
  other_pre_tax: number
  updated_at: string
}

export interface DbCashflowSettings {
  id: string
  user_id: string
  expense_categories: unknown[]
  allocation_buckets: unknown[]
  custom_line_items: unknown[]
  updated_at: string
}

export interface DbScenario {
  id: string
  user_id: string
  name: string
  is_baseline: boolean
  paycheck_inputs: Record<string, unknown>
  heloc_inputs: Record<string, unknown>
  cashflow_inputs: Record<string, unknown>
  notes: string
  created_at: string
  updated_at: string
}

// ── Job Search ───────────────────────────────────────────────────

export interface DbJobPipeline {
  id: string
  user_id?: string
  company: string
  role: string
  status: 'active' | 'waiting' | 'rejected' | 'offer' | 'closed'
  stage: string
  contact: string | null
  last_action: string | null
  next_step: string | null
  priority: 'high' | 'medium' | 'low'
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DbJobOutreach {
  id: string
  user_id?: string
  date: string
  target: string
  outreach_type: 'cold' | 'warm' | 'referral'
  method: string
  status: 'planned' | 'sent' | 'responded' | 'no_response'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbJobContent {
  id: string
  user_id?: string
  week: number
  day_label: string
  content_type: 'post' | 'engage' | 'article'
  topic: string
  status: 'idea' | 'draft' | 'published' | 'ongoing'
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DbJobRecruiter {
  id: string
  user_id?: string
  name: string
  practice: string | null
  status: 'to_contact' | 'cold' | 'warm' | 'engaged'
  last_contact: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbJobWeeklyKpi {
  id: string
  user_id?: string
  week_label: string
  week_number: number
  apps: number
  outreach: number
  posts: number
  comments: number
  interviews: number
  target_apps: number
  target_outreach: number
  target_posts: number
  target_comments: number
  target_interviews: number
  created_at: string
  updated_at: string
}

// ── Planner ───────────────────────────────────────────────────────

export interface DbScheduleBlock {
  id: string
  user_id?: string
  day_date: string
  week: number
  time_label: string
  cat: string
  task: string
  sort_order: number
  static_key: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}
