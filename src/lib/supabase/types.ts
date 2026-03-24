// Re-export from central types — single source of truth
// All imports of this module continue to work unchanged.

export type {
  DbDebtAccount,
  DbFinancialModule,
  DbSubscription,
  DbBudgetCategory,
  DbDeadline,
  DbPromoDeadline,
  DbTransaction,
  DbBalanceSnapshot,
  DbPaycheckSettings,
  DbCashflowSettings,
  DbScenario,
} from '@/types/database'

// ScheduleBlock alias for backward compatibility with planner components
export type { DbScheduleBlock as ScheduleBlock } from '@/types/database'
