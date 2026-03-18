export { calculateNetPay, DEFAULT_PAYCHECK_INPUTS } from './paycheck'
export {
  calculateMonthlyInterest,
  projectBalance,
  calculateConsolidationSavings,
  getNextDeadline,
  shouldRollToHeloc,
  HELOC_RATE,
  HELOC_LIMIT,
} from './heloc'
export type { BalanceProjection, SavingsAnalysis, DeadlineInfo } from './heloc'
export {
  calculateMonthlyFlow,
  calculateFreeCash,
  suggestAllocations,
  project12Months,
  DEFAULT_ALLOCATIONS,
  DEFAULT_EXPENSES,
} from './cashflow'
export type { CashFlowInputs } from './cashflow'
export {
  calculatePayoffTimeline,
  calculateDebtSummary,
  getAllPayoffTimelines,
} from './debt'
export type { PayoffTimeline, DebtSummary } from './debt'
export {
  compareScenarios,
  calculateDelta,
  rankByMetric,
  calculateScenarioMetrics,
} from './scenarios'
export type { MetricKey } from './scenarios'
export {
  futureValue,
  wealthProjection,
  calculateRunway,
} from './projections'
