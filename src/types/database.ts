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

// ── House Command Center ───────────────────────────────────────────

export interface DbHouseProject {
  id: string
  user_id: string
  title: string
  description: string | null
  room: string
  status: 'idea' | 'planned' | 'in_progress' | 'on_hold' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_budget: number
  actual_cost: number
  contingency_percent: number
  start_date: string | null
  target_date: string | null
  completed_date: string | null
  primary_contractor_id: string | null
  tags: string[]
  notes: string | null
  sort_order: number
  linked_vision_item_id: string | null
  created_at: string
  updated_at: string
}

export interface DbHouseProjectMilestone {
  id: string
  project_id: string
  user_id: string
  title: string
  description: string | null
  target_date: string | null
  completed_date: string | null
  status: 'pending' | 'in_progress' | 'complete' | 'skipped'
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DbHouseMaterial {
  id: string
  project_id: string
  user_id: string
  name: string
  description: string | null
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  tax_amount: number
  vendor: string | null
  product_url: string | null
  order_status: 'need_to_buy' | 'ordered' | 'shipped' | 'delivered' | 'installed' | 'returned'
  order_date: string | null
  delivery_date: string | null
  receipt_url: string | null
  category: string | null
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbHouseContractor {
  id: string
  user_id: string
  name: string
  company: string | null
  trade: string | null
  phone: string | null
  email: string | null
  website: string | null
  rating: number | null
  source: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbHouseContractorBid {
  id: string
  project_id: string
  contractor_id: string
  user_id: string
  bid_amount: number
  scope_of_work: string | null
  bid_date: string
  valid_until: string | null
  status: 'requested' | 'received' | 'accepted' | 'rejected' | 'expired'
  document_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbHousePayment {
  id: string
  project_id: string
  user_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  payee: string | null
  payment_type: 'materials' | 'labor' | 'permit' | 'delivery' | 'tax' | 'deposit' | 'final_payment' | 'other'
  receipt_url: string | null
  is_tax_deductible: boolean
  tax_category: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbHousePhoto {
  id: string
  project_id: string | null
  user_id: string
  image_url: string
  thumbnail_url: string | null
  caption: string | null
  room: string | null
  photo_type: 'before' | 'progress' | 'after' | 'inspiration' | 'receipt' | 'measurement' | 'other'
  taken_date: string
  tags: string[]
  sort_order: number
  created_at: string
}

// ── Daily Tracker ─────────────────────────────────────────────────

export interface DbRoutine {
  id: string
  user_id: string
  title: string
  description: string | null
  category: 'morning' | 'evening' | 'health_protocol' | 'supplement' | 'skincare' | 'fitness' | 'spiritual' | 'personal' | 'work' | 'custom'
  time_of_day: 'morning' | 'midday' | 'evening' | 'anytime'
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'
  days_of_week: string[] | null
  sort_order: number
  source_type: 'manual' | 'health_protocol' | 'supplement' | 'skincare' | 'task' | null
  source_id: string | null
  is_active: boolean
  streak_current: number
  streak_best: number
  created_at: string
  updated_at: string
}

export interface DbRoutineCompletion {
  id: string
  user_id: string
  routine_id: string
  completed_date: string
  completed_at: string
  notes: string | null
  skipped: boolean
  skip_reason: string | null
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
