// Raw Supabase row types — match schema.sql column names exactly

export interface DbDebtAccount {
  id: string
  name: string
  account_type: 'credit_card' | 'loan' | 'mortgage' | 'heloc' | 'other'
  balance: number
  interest_rate: number
  minimum_payment: number | null
  due_day: number | null
  status: string | null
  recommendation: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbFinancialModule {
  id: string
  module_number: number
  name: string
  category: string | null
  status: 'not_started' | 'in_progress' | 'complete'
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
  name: string
  amount: number
  billing_cycle: string
  category: string | null
  action: 'cancel' | 'review' | 'keep' | 'essential' | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbBudgetCategory {
  id: string
  name: string
  monthly_actual: number | null
  annual_actual: number | null
  survival_budget: number | null
  pct_of_total: number | null
  color: string | null
  created_at: string
  updated_at: string
}
