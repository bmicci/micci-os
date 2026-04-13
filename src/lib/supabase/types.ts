// Re-export from central types — single source of truth
// All imports of this module continue to work unchanged.

export type {
  DbDebtAccount,
  DbFinancialModule,
  DbSubscription,
  DbBudgetCategory,
  DbDeadline,
  DbPaycheckSettings,
  DbCashflowSettings,
  DbScenario,
  DbBill,
  DbBurnRateItem,
  DbPromoDeadline,
  DbTaxSnapshot,
  DbWealthScenario,
  DbFinancialSetting,
} from '@/types/database'

// ScheduleBlock alias for backward compatibility with planner components
export type { DbScheduleBlock as ScheduleBlock } from '@/types/database'
