// ═══════════════════════════════════════════════════
// Financial Data — Types & Constants
// Source of truth until Supabase is wired up
// ═══════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────

export interface DebtAccount {
  name: string
  balance: number
  rate: number
  min: number | null
  decision: 'roll' | 'keep' | 'promo'
  category: 'Personal Loan' | 'Credit Card' | 'Mortgage'
}

export interface FinancialModule {
  id: number
  name: string
  status: 'done' | 'progress' | 'pending' | 'urgent'
  pct: number
  desc: string
  docsHave: string[]
  docsMissing: string[]
  actions: string[]
}

export interface Deadline {
  date: string
  event: string
  amount: number | null
  risk: string
}

export interface ActionItem {
  priority: 'red' | 'amber' | 'blue'
  title: string
  detail: string
}

export interface PromoDeadline {
  name: string
  balance: number
  expires: string
  risk: number | null
  acct: string
  note: string
}

export interface Bill {
  date: string
  payee: string
  amount: number
  type: string
  status: 'autopay' | 'paid' | 'confirm' | 'manual' | 'recurring'
  note: string
}

export interface SpendingCategory {
  cat: string
  annual: number
  monthly: number
  survival: number
  pct: number
  color: string
}

export interface BurnRateItem {
  label: string
  current: number
  survival: number
  note: string
}

export interface Subscription {
  name: string
  mo: number
  reason: string
}

export interface EssentialBill {
  name: string
  mo: number
  yr: number
  note: string
}

export interface HELOCAccount {
  name: string
  balance: number
  rate: number
  moNow: number
  decision: 'roll' | 'keep' | 'promo'
}

export interface WealthScenario {
  name: string
  pmt: number
  r: number
  color: string
  label: string
}

export interface TopAction {
  icon: string
  text: string
  save: string
}

export interface TaxSnapshot {
  w2Income: number
  federalWithheld: number
  scenarioA: { label: string; owed: number; note: string }
  scenarioB: { label: string; owed: number; note: string }
  keyItems: string[]
  filingDeadline: string
  caveat: string
}

export interface FinancialData {
  debts: DebtAccount[]
  modules: FinancialModule[]
  deadlines: Deadline[]
  actionItems: ActionItem[]
  promos: PromoDeadline[]
  bills: Bill[]
  spendingCategories: SpendingCategory[]
  burnRate: BurnRateItem[]
  cancelSubs: Subscription[]
  reviewSubs: Subscription[]
  essentialBills: EssentialBill[]
  helocAccounts: HELOCAccount[]
  wealthScenarios: WealthScenario[]
  topActions: TopAction[]
  taxSnapshot: TaxSnapshot
}

// ── Data ───────────────────────────────────────────

// Updated with real balances from CSV export (March 8, 2026)
export const DEBTS: DebtAccount[] = [
  { name: 'SoFi Personal Loan', balance: 56075.21, rate: 12.41, min: 1464.07, decision: 'roll', category: 'Personal Loan' },
  { name: 'LightStream Loan', balance: 44018.42, rate: 5.87, min: 577.47, decision: 'keep', category: 'Personal Loan' },
  { name: 'Chase Freedom Unlimited (7117)', balance: 22306, rate: 0, min: 225, decision: 'promo', category: 'Credit Card' },
  { name: 'Chase Freedom (4628)', balance: 13269, rate: 0, min: 132, decision: 'promo', category: 'Credit Card' },
  { name: 'Citi Diamond Preferred (4205)', balance: 12366, rate: 0, min: 124, decision: 'promo', category: 'Credit Card' },
  { name: 'Wells Fargo Loan (via Dad)', balance: 21420, rate: 12.49, min: 1100, decision: 'roll', category: 'Personal Loan' },
  { name: 'Virginia FCU Loan (via Dad)', balance: 18600, rate: 9.25, min: 350, decision: 'roll', category: 'Personal Loan' },
  { name: 'AmEx Platinum (3002)', balance: 6452.55, rate: 21.49, min: 501.09, decision: 'roll', category: 'Credit Card' },
  { name: 'AmEx Gold (4000)', balance: 6262.62, rate: 27.49, min: 182.18, decision: 'roll', category: 'Credit Card' },
  { name: 'AmEx Personal Loan (1001)', balance: 3535.56, rate: 7.33, min: 407.01, decision: 'keep', category: 'Personal Loan' },
  { name: 'Citi Best Buy (4802)', balance: 2375.24, rate: 0, min: 50, decision: 'promo', category: 'Credit Card' },
  { name: 'Nordstrom (Synchrony)', balance: 653.43, rate: 29.4, min: 40, decision: 'roll', category: 'Credit Card' },
  { name: 'Chase Prime Visa (9313)', balance: 688.66, rate: 0, min: 95.77, decision: 'promo', category: 'Credit Card' },
  { name: 'PayPal Credit', balance: 124.35, rate: 0, min: 30, decision: 'promo', category: 'Credit Card' },
  { name: 'BofA Mortgage (1624)', balance: 498903.37, rate: 3.375, min: 2486.79, decision: 'keep', category: 'Mortgage' },
]

export const MODULES: FinancialModule[] = [
  {
    id: 1, name: 'Spending Analysis', status: 'done', pct: 90,
    desc: 'Full 2025 spending breakdown — 1,615 transactions across AmEx Gold, AmEx Platinum, Chase 9313.',
    docsHave: ['AmEx Gold 2025 full-year transactions', 'AmEx Platinum 2025 full-year transactions', 'Chase Prime Visa 9313 full-year', 'Property tax statement 2025', 'Pay stubs (Feb 2026, Jan 2026)', 'JPMC W-2 2024 & 2025'],
    docsMissing: ['Apple Card full year', 'Chase checking full year'],
    actions: ['✅ 1,615 transactions loaded and categorized', '✅ Survival budget sheet built', '✅ 20-year wealth projections added', 'Confirm JPMC severance amount with HR'],
  },
  {
    id: 2, name: 'Subscription Audit', status: 'done', pct: 90,
    desc: 'Scanned 1,615 transactions — identified 102 recurring merchants, 6 immediate cancels ($87/mo).',
    docsHave: ['AmEx Gold 2025 full-year transactions', 'AmEx Platinum 2025 full-year', 'Chase Prime Visa 2025 full-year', 'Module_2_Subscription_Audit.xlsx'],
    docsMissing: ['Confirm Paddle.net identity', 'Apple Card full year'],
    actions: ['✅ 102 recurring merchants identified', '✅ 6 services flagged for cancel — $87.03/mo', 'Cancel Credit Sesame, Paramount+, Cloaked, GoPro, Pressed Juicery, Zips this week', 'Evaluate LifeTime Fitness downgrade — $228/mo to $25/mo'],
  },
  {
    id: 3, name: 'Tax Prep', status: 'progress', pct: 30,
    desc: '2025 tax filing + planning for unusual income year (bonus, severance, partial year employment)',
    docsHave: ['JPMC W-2 2024', 'JPMC W-2 2025', 'Pay stubs 2024–2026', 'Mortgage statement'],
    docsMissing: ['Form 1098', '1099s', 'Property tax payment receipts 2025', 'Severance agreement', '2024 prior-year tax return'],
    actions: ['Pull Form 1098 from BofA', 'Flag severance tax withholding', 'Consult CPA before filing'],
  },
  {
    id: 4, name: 'Debt Inventory & HELOC', status: 'progress', pct: 70,
    desc: 'Full debt consolidation via $190K HELOC at 6.85% — must close before March 19',
    docsHave: ['All credit card statements (Feb 2026)', 'SoFi loan details', 'LightStream amortization', 'HELOC offer — Texas CU $190K at 6.85%'],
    docsMissing: ['Chase Freedom card statements (promo confirmation)', 'Virginia FCU loan statement', 'Wells Fargo loan statement'],
    actions: ['Confirm HELOC closing date with Texas Credit Union', 'Verify Chase Freedom cards are 100% at 0%', 'Get Virginia FCU + Wells Fargo current balance statements'],
  },
  {
    id: 5, name: '401(k) Review', status: 'pending', pct: 0,
    desc: 'Review JPMC 401k balance, vesting, fund allocations, and rollover strategy post-exit',
    docsHave: [], docsMissing: ['JPMC 401(k) statement', 'Prior employer 401(k) or IRA statements'],
    actions: ['Pull JPMC Retirement Jan 31 2026 statement', 'Confirm 100% vesting', 'Decide: rollover to IRA vs. leave vs. roll to new employer'],
  },
  {
    id: 6, name: 'Property Tax Protest (DCAD)', status: 'pending', pct: 0,
    desc: 'Protest Dallas County Appraisal District valuation to reduce property tax bill',
    docsHave: [], docsMissing: ['Current DCAD notice of appraised value', 'Original purchase price documents', 'Property condition documentation'],
    actions: ['Pull current appraisal from dallascad.org', 'File protest online — deadline May 15', 'Gather comparable sales data'],
  },
  {
    id: 7, name: 'IRS Balance Resolution', status: 'pending', pct: 0,
    desc: 'Resolve outstanding IRS balance — understand total owed, penalties, and payment options',
    docsHave: [], docsMissing: ['IRS account transcript', 'All IRS CP notices', 'Prior year returns 2021–2024'],
    actions: ['Pull IRS account transcript from IRS.gov', 'Calculate total balance including penalties', 'Consult tax professional'],
  },
  {
    id: 8, name: 'Savings & Wealth Plan', status: 'pending', pct: 0,
    desc: 'Build emergency fund, set savings targets, and create wealth-building roadmap',
    docsHave: [], docsMissing: ['Current savings/checking balances', 'Brokerage account statement', '401(k) statement'],
    actions: ['Establish 3–6 month emergency fund target ($25K–$50K)', 'Open high-yield savings', 'Define investment allocation strategy'],
  },
  {
    id: 9, name: 'Estate Planning', status: 'pending', pct: 0,
    desc: 'Review and update beneficiaries, will, and key legal documents',
    docsHave: [], docsMissing: ['Beneficiary designations', 'Property deed(s)', 'Existing will or trust', 'Life insurance policy documents'],
    actions: ['Review and update all beneficiary designations', 'Confirm life insurance coverage post-JPMC', 'Draft or update will'],
  },
]

export const DEADLINES: Deadline[] = [
  { date: 'Mar 2, 2026', event: 'Citizens Pay — FINAL payment', amount: 769.78, risk: '✅ Done' },
  { date: 'Mar 15, 2026', event: 'March 15 Paycheck', amount: 4652, risk: '➕ Income' },
  { date: 'Mar 19, 2026', event: '⚠️ Last day at JPMC / HELOC must close', amount: null, risk: '🚨 Critical' },
  { date: 'Mar 31, 2026', event: 'Partial paycheck (Mar 16–19) + healthcare ends', amount: 1598, risk: '➕ + ⚠️' },
  { date: 'Apr 19, 2026', event: 'Life insurance convert/port DEADLINE', amount: null, risk: '🚨 Hard deadline' },
  { date: 'May 30, 2026', event: 'COBRA election window closes', amount: null, risk: '⚠️ Deadline' },
  { date: 'Jun 27, 2026', event: 'Best Buy Promo 1 expires — $1,312 at risk', amount: 1312, risk: '⚠️ $339 def. int.' },
  { date: 'Jul 9, 2026', event: 'Chase Freedom Unlim BT1 expires — $8,500', amount: 8500, risk: '⚠️ Largest promo' },
  { date: 'Aug 12, 2026', event: 'Chase Freedom BT1 expires — $7,500', amount: 7500, risk: '⚠️ Pay from HELOC' },
  { date: 'Jun 18, 2027', event: 'Citi Diamond BT promo expires', amount: 12366, risk: '✅ Low urgency' },
]

export const ACTION_ITEMS: ActionItem[] = [
  { priority: 'red', title: 'HELOC closing — confirm Texas Credit Union timeline', detail: 'Must close before March 19. VVOE required. Do NOT resign before closing.' },
  { priority: 'red', title: 'Sign Release Agreement — do NOT rush', detail: '45-day window from notice. Get employment attorney first.' },
  { priority: 'amber', title: 'Life insurance — convert/port by April 19', detail: '31-day hard deadline from exit date. Call HR immediately after March 19.' },
  { priority: 'amber', title: 'COBRA — elect within 60 days of March 31', detail: 'Healthcare ends March 31. Compare COBRA vs marketplace before electing.' },
  { priority: 'amber', title: 'Confirm personal days payout with HR', detail: '24 hrs personal days — Texas has no law requiring payout. Confirm JPMC policy.' },
  { priority: 'blue', title: 'Chase Freedom cards — verify all balances are 0% promo', detail: 'Statement balances ($22,531 + $13,269) need promo confirmation. Pull statements.' },
  { priority: 'blue', title: 'Minimize AmEx Gold new charges until HELOC closes', detail: 'Revolving cleared by March payment. New charges accrue at 27.49% until HELOC rolls.' },
]

export const PROMOS: PromoDeadline[] = [
  { name: 'Citizens Pay 6607', balance: 0, expires: '2026-03-02', risk: 0, acct: 'Citizens Pay', note: '✅ Final payment made Mar 2. Account closing.' },
  { name: 'Citi Best Buy — Promo 1', balance: 1312.44, expires: '2026-06-27', risk: 338.99, acct: 'Citi Best Buy 4802', note: 'Pay from HELOC or cash before Jun 27' },
  { name: 'Chase Freedom Unlim — BT1', balance: 8500, expires: '2026-07-09', risk: null, acct: 'Chase Freedom Unlim (7117)', note: '⚠️ Largest single promo — plan HELOC draw now' },
  { name: 'PayPal Credit promo', balance: 124.35, expires: '2026-08-04', risk: null, acct: 'PayPal', note: 'Small — pay from cash. Deferred int applies retroactively.' },
  { name: 'Chase Freedom — BT1', balance: 7500, expires: '2026-08-12', risk: null, acct: 'Chase Freedom (9313)', note: 'Pay from HELOC before Aug 12' },
  { name: 'Chase Freedom Unlim — BT2', balance: 2600, expires: '2026-09-09', risk: null, acct: 'Chase Freedom Unlim (7117)', note: 'Pay from HELOC' },
  { name: 'Chase Freedom — BT2', balance: 2600, expires: '2026-09-12', risk: null, acct: 'Chase Freedom (9313)', note: 'Pay from HELOC' },
  { name: 'Chase Freedom Unlim — BT3', balance: 7000, expires: '2026-10-09', risk: null, acct: 'Chase Freedom Unlim (7117)', note: 'Pay from HELOC' },
  { name: 'Chase Freedom Unlim — BT4', balance: 1032.25, expires: '2026-12-09', risk: null, acct: 'Chase Freedom Unlim (7117)', note: 'Pay from HELOC' },
  { name: 'Chase Freedom — BT3', balance: 1064.51, expires: '2026-12-12', risk: null, acct: 'Chase Freedom (9313)', note: 'Pay from HELOC' },
  { name: 'Citi Best Buy — Promo 2', balance: 917.96, expires: '2026-12-27', risk: 196.33, acct: 'Citi Best Buy 4802', note: 'Pay $918 from HELOC or cash before Dec 27' },
  { name: 'Citi Diamond Preferred BT', balance: 12366, expires: '2027-06-18', risk: null, acct: 'Citi Diamond', note: '✅ Confirmed — lowest urgency. Pay from HELOC by Jun 2027.' },
]

export const BILLS: Bill[] = [
  { date: 'Feb 28', payee: 'AmEx Platinum — CONFIRM PAID', amount: 501.09, type: 'Credit Card', status: 'confirm', note: 'Both Plan It plans: $230.97 + $270.12' },
  { date: 'Feb 28', payee: 'Citi Best Buy 4802', amount: 50, type: 'Credit Card', status: 'paid', note: '✅ Autopay paid $50' },
  { date: 'Mar 1', payee: 'BofA Mortgage', amount: 2486.79, type: 'Mortgage', status: 'autopay', note: '3.375% fixed · auto-debit confirmed' },
  { date: 'Mar 1', payee: 'Transfer to Dad (Wells Fargo)', amount: 1100, type: 'Family', status: 'recurring', note: 'Monthly Zelle transfer' },
  { date: 'Mar 1', payee: 'AmEx Personal Loan', amount: 407.01, type: 'Personal Loan', status: 'autopay', note: '7.33% · KEEP' },
  { date: 'Mar 2', payee: 'Citizens Pay 6607 — FINAL', amount: 769.78, type: 'Installment', status: 'autopay', note: '✅ FINAL PAYMENT — account closes' },
  { date: 'Mar 5', payee: 'SoFi Personal Loan', amount: 1464.07, type: 'Personal Loan', status: 'autopay', note: '12.41% · ROLL TO HELOC' },
  { date: 'Mar 5', payee: 'PayPal Credit', amount: 30, type: 'Credit Card', status: 'manual', note: '$124.35 balance · promo exp Aug 4' },
  { date: 'Mar 6–22', payee: 'Chase Cards (3 accounts)', amount: 452.77, type: 'Credit Card', status: 'autopay', note: 'CFU $225 + Freedom $132 + Prime $95.77' },
  { date: 'Mar 8', payee: 'Nordstrom (Synchrony)', amount: 40, type: 'Credit Card', status: 'manual', note: 'Min only — rolling $653.43 to HELOC' },
  { date: 'Mar 9', payee: 'NFM (Synchrony)', amount: 15, type: 'Installment', status: 'autopay', note: '$191.10 balance remaining' },
  { date: 'Mar 10', payee: 'AmEx Gold — Adjusted Balance', amount: 2112.43, type: 'Credit Card', status: 'confirm', note: 'Clears revolving · minimize new Gold charges' },
  { date: 'Mar 10', payee: 'Apple Card (GS Bank)', amount: 104.54, type: 'Credit Card', status: 'autopay', note: 'Feb autopay confirmed' },
  { date: 'Mar 14', payee: 'Citi Diamond Preferred', amount: 124, type: 'Credit Card', status: 'autopay', note: '0% BT promo thru Jun 18 2027' },
  { date: 'Mar 20', payee: 'LightStream Loan', amount: 577.47, type: 'Personal Loan', status: 'autopay', note: '5.87% · KEEP' },
  { date: 'Mar 21', payee: 'Virginia FCU Loan (via Dad)', amount: 350, type: 'Loan', status: 'recurring', note: '9.25% · ROLL TO HELOC' },
]

export const SPENDING_CATEGORIES: SpendingCategory[] = [
  { cat: 'Food & Dining', annual: 27441, monthly: 2287, survival: 1100, pct: 36.1, color: '#ef4444' },
  { cat: 'Shopping/Retail', annual: 13182, monthly: 1099, survival: 200, pct: 17.3, color: '#f59e0b' },
  { cat: 'Housing', annual: 8676, monthly: 723, survival: 723, pct: 11.4, color: '#3b82f6' },
  { cat: 'Health', annual: 6884, monthly: 574, survival: 100, pct: 9.1, color: '#22c55e' },
  { cat: 'Insurance', annual: 6249, monthly: 521, survival: 467, pct: 8.2, color: '#8b5cf6' },
  { cat: 'Transportation', annual: 5095, monthly: 425, survival: 200, pct: 6.7, color: '#06b6d4' },
  { cat: 'Other', annual: 3413, monthly: 284, survival: 100, pct: 4.5, color: '#64748b' },
  { cat: 'Travel', annual: 1885, monthly: 157, survival: 0, pct: 2.5, color: '#ec4899' },
  { cat: 'Subscriptions', annual: 1558, monthly: 130, survival: 80, pct: 2.0, color: '#eab308' },
  { cat: 'Debt Service', annual: 1537, monthly: 128, survival: 0, pct: 2.0, color: '#be123c' },
  { cat: 'Entertainment', annual: 131, monthly: 11, survival: 50, pct: 0.2, color: '#6366f1' },
]

export const BURN_RATE: BurnRateItem[] = [
  { label: 'BofA Mortgage (fixed)', current: 2486.79, survival: 2486.79, note: '3.375% — do not touch' },
  { label: 'HELOC Interest (6.85%)', current: 0, survival: 631.51, note: 'Interest-only on ~$110.6K draw' },
  { label: 'LightStream Auto', current: 577.47, survival: 577.47, note: '5.87% — keep' },
  { label: 'AmEx Personal Loan', current: 407.01, survival: 407.01, note: '7.33% — KEEP (close to HELOC rate)' },
  { label: 'Property Tax (escrowed)', current: 1216.25, survival: 1216.25, note: '$14,595/yr actual' },
  { label: 'Other fixed + promos', current: 756.31, survival: 756.31, note: 'Apple, Chase, Citi, PayPal, NFM' },
  { label: 'Rolled debt (SoFi/WF/VFCU/AmEx)', current: 4077.34, survival: 0, note: '✅ Eliminated by HELOC' },
  { label: 'CC variable spend', current: 5756.00, survival: 2197.00, note: 'Cuts: dining/shop/fitness/travel' },
]

export const CANCEL_SUBS: Subscription[] = [
  { name: 'GoPro Subscription', mo: 5.32, reason: 'Camera collecting dust' },
  { name: 'Paramount+', mo: 14.06, reason: 'Cut streaming — re-subscribe for specific shows' },
  { name: 'Cloaked (Privacy Tool)', mo: 9.99, reason: 'Nice-to-have only. Cut during survival period' },
  { name: 'Credit Sesame Premium', mo: 14.28, reason: 'Redundant — Chase/AmEx monitor credit for free' },
  { name: 'Pressed Juicery', mo: 10.00, reason: 'Small but easy. Juice at home instead' },
  { name: 'Zips Car Wash Membership', mo: 33.38, reason: 'Cut now — use $5 self-serve wash' },
]

export const REVIEW_SUBS: Subscription[] = [
  { name: 'Paddle.net (Unknown SaaS)', mo: 12.88, reason: '⚠️ UNIDENTIFIED — check email for Paddle receipts' },
  { name: 'Canva Pro', mo: 15.00, reason: 'Free tier is very capable — downgrade' },
  { name: 'Adobe Creative Cloud', mo: 20.81, reason: 'Verify plan — downgrade if possible' },
  { name: 'Cursor (AI Code Editor)', mo: 21.32, reason: 'Pause if not actively coding post-JPMC' },
  { name: 'Uber One Membership', mo: 9.99, reason: 'Pays for itself now, but reduce Uber first' },
  { name: 'AT&T Uverse (Internet/TV)', mo: 100.03, reason: 'Shop Spectrum/Google Fiber — save $240–480/yr' },
  { name: 'LifeTime Fitness', mo: 228.23, reason: '⚠️ BIGGEST WIN — Consider LA Fitness at $25/mo' },
  { name: 'PlayStation Network', mo: 84.30, reason: '$1,011/yr — audit game purchases vs PS+ only' },
  { name: 'Hand & Stone Massage', mo: 25.55, reason: 'Pause during survival budget period' },
]

export const ESSENTIAL_BILLS: EssentialBill[] = [
  { name: 'GEICO Auto Insurance', mo: 230.51, yr: 2766.10, note: 'Shop Progressive/USAA annually' },
  { name: 'State Farm Insurance', mo: 65.67, yr: 788.00, note: 'Verify coverage — confirm needed' },
  { name: 'Homeowners Insurance', mo: 385.01, yr: 2695.08, note: 'Required for mortgage' },
  { name: 'TXU Electric', mo: 215.19, yr: 2582.28, note: 'Try Gexa or 4Change — PowerToChoose.org' },
  { name: 'Atmos Energy (Gas)', mo: 80.05, yr: 960.61, note: 'Regulated utility' },
  { name: 'Dallas Water', mo: 122.11, yr: 1465.35, note: 'City utility — normal rate' },
  { name: 'NTTA Toll Autocharge', mo: 40.00, yr: 480.00, note: 'Reduce highway driving post-JPMC' },
]

// Updated with real balances (March 8, 2026)
export const HELOC_ACCOUNTS: HELOCAccount[] = [
  { name: 'SoFi Personal Loan', balance: 56075.21, rate: 12.41, moNow: 579.88, decision: 'roll' },
  { name: 'Wells Fargo/Dad', balance: 21420, rate: 12.49, moNow: 222.95, decision: 'roll' },
  { name: 'Virginia FCU/Dad', balance: 18600, rate: 9.25, moNow: 143.38, decision: 'roll' },
  { name: 'AmEx Platinum (3002)', balance: 6452.55, rate: 21.49, moNow: 115.58, decision: 'roll' },
  { name: 'AmEx Gold (4000)', balance: 6262.62, rate: 27.49, moNow: 143.47, decision: 'roll' },
  { name: 'Nordstrom', balance: 653.43, rate: 29.4, moNow: 16.01, decision: 'roll' },
  { name: 'LightStream', balance: 44018.42, rate: 5.87, moNow: 577.47, decision: 'keep' },
  { name: 'AmEx Personal Loan', balance: 3535.56, rate: 7.33, moNow: 407.01, decision: 'keep' },
  { name: 'Chase BT balances (0% promo)', balance: 36263.66, rate: 0, moNow: 0, decision: 'promo' },
  { name: 'Citi Diamond (0% thru Jun 27)', balance: 12366, rate: 0, moNow: 0, decision: 'promo' },
  { name: 'Citi Best Buy promos', balance: 2375.24, rate: 0, moNow: 0, decision: 'promo' },
  { name: 'PayPal Credit (0% promo)', balance: 124.35, rate: 0, moNow: 0, decision: 'promo' },
]

export const WEALTH_SCENARIOS: WealthScenario[] = [
  { name: 'Conservative', pmt: 62400, r: 0.07, color: '#3b82f6', label: '20% saved · 7% return' },
  { name: 'Moderate', pmt: 93600, r: 0.08, color: '#22c55e', label: '30% saved · 8% return' },
  { name: 'Aggressive', pmt: 124800, r: 0.10, color: '#f59e0b', label: '40% saved · 10% return' },
]

export const TAX_SNAPSHOT: TaxSnapshot = {
  w2Income: 160667,
  federalWithheld: 23127,
  scenarioA: {
    label: 'No SALT Deduction',
    owed: 4164,
    note: 'Standard deduction only · $15,000',
  },
  scenarioB: {
    label: 'With $10K SALT',
    owed: 1764,
    note: 'Itemized: mortgage int $17,152 + SALT $10K',
  },
  keyItems: [
    'W-2 Box 1: $160,667.19 · Federal withheld: $23,126.93',
    'Mortgage interest deduction: $17,152.41 (itemizes > $15K standard)',
    'Property taxes paid 2025: $14,595.02 — confirm HAF deductibility',
    'Severance income — verify withholding rate (29.65% supplemental)',
    'IRS balance resolution pending (Module 7) — consult CPA',
    'Low income year 2026 — Roth conversion opportunity (deadline Dec 31)',
  ],
  filingDeadline: 'Apr 15, 2026',
  caveat: 'Confirm HAF program impact on property tax deductibility with accountant before filing.',
}

export const TOP_ACTIONS: TopAction[] = [
  { icon: '🔴', text: 'Cancel Credit Sesame Premium — use Chase/AmEx free monitoring instead', save: '$14.28/mo' },
  { icon: '🔴', text: 'Cancel Zips Car Wash membership', save: '$33.38/mo' },
  { icon: '🔴', text: 'Cancel Paramount+ — re-subscribe for specific shows only', save: '$14.06/mo' },
  { icon: '🟡', text: 'Investigate Paddle.net charge — check email for receipts', save: '$12.88/mo' },
  { icon: '🟡', text: 'Downgrade Canva to free tier at canva.com', save: '$15.00/mo' },
]

export function calcWealth(pv: number, pmt: number, r: number, n: number): number {
  return pv * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r
}

// ── Computed helpers ───────────────────────────────

export function getDebtTotals(debts: DebtAccount[]) {
  const nonMortgage = debts.filter(d => d.category !== 'Mortgage')
  const total = nonMortgage.reduce((s, d) => s + d.balance, 0)
  const highRate = nonMortgage.filter(d => d.rate > 6.85).reduce((s, d) => s + d.balance, 0)
  const promo = nonMortgage.filter(d => d.rate === 0).reduce((s, d) => s + d.balance, 0)
  const keep = nonMortgage.filter(d => d.rate > 0 && d.rate <= 6.85).reduce((s, d) => s + d.balance, 0)
  return { total, highRate, promo, keep }
}

export function getModuleCounts(modules: FinancialModule[]) {
  const complete = modules.filter(m => m.status === 'done').length
  const inProgress = modules.filter(m => m.status === 'progress').length
  const pending = modules.filter(m => m.status === 'pending').length
  return { complete, inProgress, pending, total: modules.length }
}

export function fmt(n: number | null): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtK(n: number): string {
  return n >= 1000 ? '$' + (n / 1000).toFixed(0) + 'K' : '$' + n.toFixed(0)
}

export function getAllData(): FinancialData {
  return {
    debts: DEBTS,
    modules: MODULES,
    deadlines: DEADLINES,
    actionItems: ACTION_ITEMS,
    promos: PROMOS,
    bills: BILLS,
    spendingCategories: SPENDING_CATEGORIES,
    burnRate: BURN_RATE,
    cancelSubs: CANCEL_SUBS,
    reviewSubs: REVIEW_SUBS,
    essentialBills: ESSENTIAL_BILLS,
    helocAccounts: HELOC_ACCOUNTS,
    wealthScenarios: WEALTH_SCENARIOS,
    topActions: TOP_ACTIONS,
    taxSnapshot: TAX_SNAPSHOT,
  }
}
