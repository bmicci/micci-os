// 2026 federal return estimate (single filer, Texas). Pure — no I/O.
// Inputs live in financial_settings.tax_plan_2026 (owner/plan v5 figures).
import { calculateFederalTax, STANDARD_DEDUCTION_2026 } from './brackets'

export interface TaxIncomeSource { label: string; taxable: number; withheld: number; note?: string }

export interface TaxPlan2026 {
  year: number
  filingStatus: 'single'
  asOf: string
  source: string
  income: TaxIncomeSource[]
  mortgageInterest: number
  propertyTaxPaidEarlier: number   // 2025 bill, paid Jan 30, 2026
  propertyTaxBill2026: number      // 2026 bill — deductible in 2026 only if paid by Dec 31
  saltCap: number
  payPropertyTaxBy: 'dec31' | 'jan31'
  notes: string[]
}

export interface TaxEstimate {
  agi: number
  withheld: number
  salt: number
  itemized: number
  deduction: number
  usesItemized: boolean
  taxable: number
  tax: number
  marginal: number
  refund: number                 // positive = refund, negative = owe
  effectiveRate: number          // tax / AGI
}

export function estimateReturn(plan: TaxPlan2026, payBillIn2026 = plan.payPropertyTaxBy === 'dec31'): TaxEstimate {
  const agi = plan.income.reduce((s, i) => s + i.taxable, 0)
  const withheld = plan.income.reduce((s, i) => s + i.withheld, 0)
  const salt = Math.min(plan.saltCap, plan.propertyTaxPaidEarlier + (payBillIn2026 ? plan.propertyTaxBill2026 : 0))
  const itemized = plan.mortgageInterest + salt
  const std = STANDARD_DEDUCTION_2026.single
  const deduction = Math.max(itemized, std)
  const taxable = Math.max(0, agi - deduction)
  const r = calculateFederalTax(taxable, 'single')
  return {
    agi, withheld, salt, itemized, deduction, usesItemized: itemized > std, taxable,
    tax: r.federalTax, marginal: r.marginalBracket, refund: withheld - r.federalTax,
    effectiveRate: agi > 0 ? r.federalTax / agi : 0,
  }
}

/** Plan v5 §13 figures — FALLBACK ONLY when financial_settings.tax_plan_2026 is missing. */
export const TAX_PLAN_2026_FALLBACK: TaxPlan2026 = {
  year: 2026, filingStatus: 'single', asOf: '2026-11-04', source: 'Strategic Financial Plan v5, section 13',
  income: [
    { label: 'JPMorgan W-2', taxable: 95557, withheld: 17821, note: 'Salary through Mar 19, $15,000 incentive, $47,200 severance (withheld at a flat 22%)' },
    { label: 'Unemployment (1099-G)', taxable: 15730, withheld: 1586, note: '26 weeks at $605, $61 withheld a week' },
    { label: 'Charles Schwab W-2', taxable: 27283, withheld: 5144, note: '3 semi-monthly checks (Nov 30, Dec 15, Dec 31) after a 5% 401(k) and $405.70 of benefits each' },
  ],
  mortgageInterest: 16700, propertyTaxPaidEarlier: 14595, propertyTaxBill2026: 15000, saltCap: 40400,
  payPropertyTaxBy: 'dec31',
  notes: [],
}
