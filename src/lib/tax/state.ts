// ═══════════════════════════════════════════════════════════════════
// State Income Tax Rates (simplified flat-rate approximations)
// For states with progressive brackets, we use a reasonable effective rate.
// TX, FL, WA, NV, etc. = 0%
// ═══════════════════════════════════════════════════════════════════

const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.050, AK: 0, AZ: 0.025, AR: 0.044, CA: 0.093,
  CO: 0.044, CT: 0.050, DE: 0.066, FL: 0, GA: 0.055,
  HI: 0.072, ID: 0.058, IL: 0.0495, IN: 0.0305, IA: 0.044,
  KS: 0.057, KY: 0.040, LA: 0.0185, ME: 0.071, MD: 0.0575,
  MA: 0.050, MI: 0.0425, MN: 0.0785, MS: 0.050, MO: 0.048,
  MT: 0.059, NE: 0.0564, NV: 0, NH: 0, NJ: 0.0637,
  NM: 0.049, NY: 0.0685, NC: 0.0450, ND: 0.0195, OH: 0.035,
  OK: 0.0475, OR: 0.090, PA: 0.0307, RI: 0.0599, SC: 0.064,
  SD: 0, TN: 0, TX: 0, UT: 0.0465, VT: 0.066,
  VA: 0.0575, WA: 0, WV: 0.052, WI: 0.053, WY: 0,
  DC: 0.085,
}

/**
 * Get effective state income tax rate.
 * @param stateCode - Two-letter state code (e.g., 'TX')
 * @returns Effective flat tax rate (0 for no-income-tax states)
 */
export function getStateTaxRate(stateCode: string): number {
  return STATE_TAX_RATES[stateCode.toUpperCase()] ?? 0
}

/** All state codes for dropdown population */
export const STATE_CODES = Object.keys(STATE_TAX_RATES).sort()

/** States with no income tax */
export const NO_INCOME_TAX_STATES = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY']
