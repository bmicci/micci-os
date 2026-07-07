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
  category: 'Personal Loan' | 'Credit Card' | 'Mortgage' | 'HELOC'
}

export interface FinancialModule {
  id: number
  supabaseId?: string   // UUID from DB — needed for writes
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
  propertyTaxDetails: PropertyTaxDetail[]
}

export interface PropertyTaxDetail {
  auth: string
  amount: number
  pct: number
}

export interface IncomeBridge {
  liquidCash: number
  marchPaychecks: number
  severanceEstimate: number
  familyBridge: number
  consultingMonthlyNet: number
  targetSalary: number
  targetTotalComp: number
  monthlyOutflow: number
  newJobMonthlyNet: number
}

export interface SpendingSummary {
  totalAnnualCC: number
  totalMonthlyAvg: number
  totalTransactions: number
  topCategory: string
  topCategoryAmount: number
  topCategoryPct: number
  survivalMonthly: number
  cardsAnalyzed: string
}

export interface SubscriptionSummary {
  totalRecurringMerchants: number
  keepTotalMonthly: number
  keepCount: number
}

export interface PropertyTaxConfig {
  address: string
  assessedValue: number
  protestTarget: number
  annualTotal: number
  monthlyBudget: number
  protestSavingsEstimate: number
  protestDeadline: string
  taxesPaid: boolean
}

export interface Assets {
  home: number
  retirement: number
  brokerage: number
  cash: number        // checking (operating)
  savings: number     // Wealthfront Cash Account (HYSA reserve — drawn down for burn)
  vehicles: number
}

// ── Investment Types ──────────────────────────────

export interface InvestmentAccount {
  id: string
  accountName: string
  accountNumber: string
  accountType: string
  institution: string
  totalValue: number
  totalCost: number
  unrealizedGL: number
  asOfDate: string | null
}

export interface TaxLot {
  id: string
  ticker: string
  cusip: string | null
  description: string | null
  assetClass: string | null
  assetStrategy: string | null
  quantity: number
  price: number | null
  value: number | null
  cost: number | null
  originalCost: number | null
  unitCost: number | null
  unrealizedGL: number | null
  unrealizedGLPct: number | null
  acquisitionDate: string | null
  taxTerm: string | null
  daysHeld: number | null
  daysUntilLong: number | null
  estAnnualIncome: number | null
  asOfDate: string | null
}

export interface InvestmentTransaction {
  id: string
  tradeDate: string
  postDate: string | null
  settlementDate: string | null
  transactionType: string
  description: string | null
  ticker: string | null
  cusip: string | null
  securityType: string | null
  price: number | null
  quantity: number | null
  amount: number | null
  income: number | null
  glShort: number | null
  glLong: number | null
  tranCode: string | null
}

export interface InvestmentData {
  accounts: InvestmentAccount[]
  taxLots: TaxLot[]
  transactions: InvestmentTransaction[]
}

export const EMPTY_INVESTMENT_DATA: InvestmentData = {
  accounts: [],
  taxLots: [],
  transactions: [],
}

export type { BurnAnalysis } from './finance/txnAggregate'
import type { BurnAnalysis } from './finance/txnAggregate'
import { EMPTY_BURN } from './finance/txnAggregate'

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
  helocKPIs: HelocKPIs
  waterfallData: WaterfallItem[]
  wealthScenarios: WealthScenario[]
  topActions: TopAction[]
  taxSnapshot: TaxSnapshot
  incomeBridge: IncomeBridge
  spendingSummary: SpendingSummary
  subscriptionSummary: SubscriptionSummary
  propertyTax: PropertyTaxConfig
  assets: Assets
  investments: InvestmentData
  burnAnalysis: BurnAnalysis
}

// ── Data ───────────────────────────────────────────

// Updated June 4, 2026 — post-HELOC consolidation
export const DEBTS: DebtAccount[] = [
  // ── Mortgage ──────────────────────────────────────────────────────────────
  { name: 'BofA Mortgage (1624)',           balance: 495643.35, rate: 3.375, min: 2486.79, decision: 'keep',  category: 'Mortgage' },
  // ── HELOC (consolidated Mar 19) ───────────────────────────────────────────
  { name: 'Texas CU HELOC',                 balance: 152473.32, rate: 6.85,  min: 870.37,  decision: 'keep',  category: 'HELOC' },
  // ── 0% Promo Cards (pay from HELOC as buckets expire) ─────────────────────
  { name: 'Chase Freedom Unlimited (7117)', balance: 13409.34,  rate: 0,     min: 0,       decision: 'promo', category: 'Credit Card' },
  { name: 'Chase Freedom (4628)',           balance: 12876.00,  rate: 0,     min: 0,       decision: 'promo', category: 'Credit Card' },
  { name: 'Citi Diamond Preferred (4205)',  balance: 11999.00,  rate: 0,     min: 124,     decision: 'promo', category: 'Credit Card' },
  { name: 'Citi Best Buy (4802)',           balance: 917.96,    rate: 0,     min: 50,      decision: 'promo', category: 'Credit Card' },
  { name: 'Chase Prime Visa (9313)',        balance: 1398.00,   rate: 0,     min: 0,       decision: 'promo', category: 'Credit Card' },
  // ── High-Rate Revolving (roll to HELOC ASAP) ──────────────────────────────
  { name: 'AmEx Gold Card (5007)',          balance: 4519.00,   rate: 27.49, min: 115,     decision: 'roll',  category: 'Credit Card' },
  { name: 'AmEx Platinum Card (3002)',      balance: 4514.00,   rate: 27.49, min: 115,     decision: 'roll',  category: 'Credit Card' },
  // ── Family Loan (decision Jun 2026: keep with Dad — preserve HELOC headroom)
  { name: 'Virginia FCU Loan (via Dad)',    balance: 18500.00,  rate: 8.5,   min: 350,     decision: 'keep',  category: 'Personal Loan' },
]

export const MODULES: FinancialModule[] = [
  {
    id: 1, name: 'Spending Analysis', status: 'done', pct: 100,
    desc: 'LIVE — 4,112 transactions (2 years) imported across 6 accounts: Chase checking, AmEx Gold/Platinum, Chase Prime/Freedom/Freedom Unlimited. Spend, burn rate, and runway all compute from real data and refresh on every import.',
    docsHave: [
      '✅ Chase checking 2yr (609 txns) — bills, income, debt service',
      '✅ AmEx Gold 2yr (1,906 txns) — $66K net spend',
      '✅ AmEx Platinum 2yr (1,313 txns) — $65K net spend',
      '✅ Chase Prime/Freedom/Freedom Unlim 2yr (284 txns)',
      '✅ Wealthfront Cash Account (balance — reserve, no spend)',
      'Property tax statement 2025 ($14,595.02)',
      'JPMC W-2 2024 & 2025',
    ],
    docsMissing: [
      'Citi Diamond transactions (mostly BT — low spend impact)',
      'Citi Best Buy transactions (deferred promos — low spend impact)',
      'Apple Card full year (non-critical — low spend)',
    ],
    actions: [
      '✅ 4,112 transactions imported, categorized, deduped',
      '✅ Real burn rate live: ~$9K/mo spend vs $2,176 unemployment',
      '✅ Spend trend + category breakdown live on Budget vs Actual tab',
      'Re-import monthly: drop new CSVs at /import (dedup makes it safe)',
      'Export Citi Diamond + Best Buy to complete the picture',
    ],
  },
  {
    id: 2, name: 'Subscription Audit', status: 'done', pct: 100,
    desc: 'Scanned 1,615 transactions — 102 recurring merchants identified. 6 immediate cancels = $87/mo. LifeTime Fitness downgrade = $203/mo additional savings.',
    docsHave: [
      'AmEx Gold 2025 full-year transactions',
      'AmEx Platinum 2025 full-year',
      'Chase Prime Visa 2025 full-year',
      'Module_2_Subscription_Audit.xlsx',
    ],
    docsMissing: [
      'Paddle.net receipt — check email to identify service ($12.88/mo unknown)',
      'Apple Card full year (to catch any missed subs)',
    ],
    actions: [
      '✅ 102 recurring merchants identified across all cards',
      '✅ 6 services flagged for cancel — $87.03/mo',
      'CANCEL: Credit Sesame ($14.28) — Chase/AmEx free monitoring replaces this',
      'CANCEL: Zips Car Wash ($33.38) — use $5 self-serve wash instead',
      'CANCEL: Paramount+ ($14.06) — re-subscribe only for specific shows',
      'CANCEL: Cloaked ($9.99), GoPro ($5.32), Pressed Juicery ($10.00)',
      'EVALUATE: LifeTime Fitness — downgrade from $228 to LA Fitness $25/mo ($203/mo savings)',
      'INVESTIGATE: Paddle.net $12.88 — check email for merchant name',
    ],
  },
  {
    id: 3, name: 'Tax Prep', status: 'progress', pct: 30,
    desc: '2025 tax filing + planning for unusual income year (bonus, severance, partial-year employment). Scenario A: owe $4,164. Scenario B (with SALT): owe $1,764. Filing deadline: Apr 15, 2026.',
    docsHave: [
      'JPMC W-2 2025 (Box 1: $160,667.19, federal withheld: $23,126.93)',
      'JPMC W-2 2024',
      'Pay stubs 2024–2026',
      'BofA mortgage statement (interest $17,152.41)',
    ],
    docsMissing: [
      'Form 1098 from BofA — confirm exact mortgage interest figure',
      '1099-INT from any savings accounts',
      'Property tax payment receipts 2025 ($14,595.02 — confirm HAF deductibility)',
      'Severance agreement — verify withholding rate (29.65% supplemental)',
      '2024 prior-year return — needed for comparison',
      'IRS transcript to check prior-year credits or balances applied',
    ],
    actions: [
      'Pull Form 1098 from BofA online portal (mortgage interest = $17,152.41)',
      'Confirm property tax payments 2025 with Dallas County records',
      'Get severance pay stub — verify 29.65% supplemental withholding applied',
      'Consult CPA before filing — low income year, Roth conversion decision',
      'Model: Scenario A (standard deduction, owe $4,164) vs B ($10K SALT, owe $1,764)',
      'Confirm HAF program impact on property tax deductibility with accountant',
      'File by Apr 15, 2026 or request extension to Oct 15 — do NOT file until IRS balance is resolved (Module 7)',
    ],
  },
  {
    id: 4, name: 'Debt Inventory & HELOC', status: 'progress', pct: 85,
    desc: '✅ HELOC closed March 19 — Texas CU $190K @ 6.85%. Drew $143,057 to consolidate SoFi, LightStream, AmEx loans, WF/Dad, and others. Now managing 10 promo buckets expiring Jul–Dec 2026. AmEx Gold + Platinum ($9,033 @ 27.49%) + Virginia FCU ($18,500 @ 8.5%) still need to roll.',
    docsHave: [
      '✅ HELOC closed — Texas CU $190K @ 6.85% variable',
      '✅ Full debt inventory — 10 active accounts, $220K non-mortgage',
      '✅ All 10 promo buckets documented with exact balances + expiry dates',
      '✅ Virginia FCU confirmed: $18,500 @ 8.5%',
      '✅ HELOC drawn balance confirmed: $143,057.22',
      'AmEx Gold $4,519 + Platinum $4,514 @ 27.49% — flagged to roll',
    ],
    docsMissing: [
      'Texas CU HELOC closing disclosure / final statement (request from lender)',
      'Virginia FCU payoff process (coordinate with Dad — how to initiate payoff)',
      'Chase Freedom promo confirmation letters — file for records',
    ],
    actions: [
      '🔥 Pay Citi Best Buy $962 from HELOC — Jun 27 deadline ($494 deferred interest at risk)',
      '🔴 Pay Chase Freedom Unlim BT1 $8,454 from HELOC — Jul 9 deadline (35 days)',
      '🔴 Roll AmEx Gold ($4,519) + Platinum ($4,514) to HELOC — paying $170/mo unnecessarily at 27.49%',
      '🟠 Pay Chase Freedom BT1 $7,384 — Aug 12 deadline (draw from HELOC in July)',
      '🟡 Coordinate Virginia FCU $18,500 payoff with Dad — draw from HELOC when ready',
      '✅ All major high-rate debt rolled — SoFi, LightStream, AmEx loans, WF/Dad all gone',
      'Continue paying promo minimums — track all 10 buckets via Promo Deadlines tab',
      'Available HELOC buffer: ~$47K after current draws',
    ],
  },
  {
    id: 5, name: '401(k) Review', status: 'pending', pct: 0,
    desc: 'Review JPMC 401(k) balance, vesting status, and fund allocations. Must decide rollover strategy. Low-income year 2026 = Roth conversion opportunity (deadline Dec 31, 2026).',
    docsHave: [],
    docsMissing: [
      'JPMC 401(k) most recent statement (Jan 31, 2026)',
      'Prior employer 401(k) or IRA statements',
      'Vesting schedule confirmation from HR',
      'Fund performance comparison vs. S&P 500 benchmark',
    ],
    actions: [
      'Log in to JPMC retirement portal — pull Jan 31, 2026 statement',
      'Confirm 100% vesting status (6+ years at JPMC)',
      'Review current fund allocations — rebalancing likely needed post-exit',
      'Decide rollover path: IRA at Fidelity/Schwab vs. leave in JPMC plan vs. new employer',
      'Open rollover IRA account at Fidelity or Schwab (if rolling over)',
      '⭐ Roth conversion opportunity: 2026 is low income year — convert up to $23K at 22% bracket',
      'File conversion by Dec 31, 2026 — saves significantly on future RMDs',
      'Coordinate Roth conversion amount with CPA during tax prep (Module 3)',
    ],
  },
  {
    id: 6, name: 'Property Tax Protest (DCAD)', status: 'progress', pct: 60,
    desc: '✅ Protest filed before May 15, 2026 deadline. Awaiting DCAD hearing or informal settlement offer. Target: reduce from $850K to $790K = ~$1,700/yr savings. Follow up at ifile.dallascad.org.',
    docsHave: [],
    docsMissing: [
      'Current DCAD notice of appraised value (2026)',
      'Original purchase price documentation + HUD-1 settlement statement (2021)',
      'Recent inspection report or contractor bids (property condition evidence)',
      '3–5 comparable sales — M Street corridor, last 12 months',
    ],
    actions: [
      'Check current valuation at dallascad.org (search: 2214 N Carroll Ave, Dallas)',
      'File protest online at ifile.dallascad.org — deadline is May 15, 2026',
      'Gather 3–5 comp sales from Zillow/Redfin — similar M Street houses, sold 2025–2026',
      'Document any property condition issues (deferred maintenance, repair needs)',
      'Consider hiring a property tax protest firm — they charge 20–40% of savings, no win/no fee',
      'Attend informal DCAD hearing — bring comps, original purchase price ($810K), condition notes',
      'Target: reduce assessed value from $850K to $790K = ~$1,700/yr in property tax savings',
    ],
  },
  {
    id: 7, name: 'IRS Balance Resolution', status: 'pending', pct: 0,
    desc: 'Resolve outstanding IRS balance — identify total owed across all years, penalties, and payment options. Do NOT file 2025 return until strategy is determined.',
    docsHave: [],
    docsMissing: [
      'IRS account transcript (all tax years) — irs.gov/account',
      'All IRS CP notices received (CP2000, CP14, CP503, etc.)',
      'Prior-year returns 2021–2024 (especially 2022 and 2023)',
      '2024 tax return (if filed)',
    ],
    actions: [
      'Pull IRS account transcript from irs.gov/account (create IRS.gov login if needed)',
      'Identify which tax year(s) the balance is from and calculate total with penalties',
      'Pull all CP notices — check if there are offers or payment plans already set up',
      'Consult tax professional BEFORE filing 2025 return',
      'Explore IRS installment agreement if balance is $10K–$50K (Form 9465)',
      'Explore Offer in Compromise if balance is large relative to 2026 income (Form 656)',
      'Note: 2026 is a low-income year — potentially favorable terms for OIC',
      'Coordinate IRS resolution timeline with 2025 tax filing (Module 3)',
    ],
  },
  {
    id: 8, name: 'Savings & Wealth Plan', status: 'pending', pct: 0,
    desc: 'Build emergency fund, define savings targets, and create wealth-building roadmap post-JPMC. 3-month fund target: $18K. 20-yr projection at 30% savings rate: $3.7M.',
    docsHave: [],
    docsMissing: [
      'Current JPMC checking account balance',
      'Current savings account balance (any HYSA or savings)',
      'Any brokerage account statements (Robinhood, Fidelity, etc.)',
      '401(k) balance (from Module 5)',
    ],
    actions: [
      'Establish 3-month emergency fund target: $18K (3x $6,075/mo survival budget)',
      'Open high-yield savings account: SoFi 4.6%, Marcus 4.4%, or Ally 4.35%',
      'After HELOC closes: redirect $1,464 SoFi + $240 AmEx + $40 Nordstrom savings → HYSA',
      'Build emergency fund BEFORE accelerating extra debt payoff',
      'Model 20-year wealth scenarios on survival income ($312K/yr next job):',
      '  → 20% saved = $1.9M by 2046 · 30% = $3.7M · 40% = $6.2M',
      'Roth IRA: max contribution $7,000/yr starting 2026 (income likely allows)',
      'Define next-job compensation floor: $180K+ base to rebuild savings rate',
    ],
  },
  {
    id: 9, name: 'Estate Planning', status: 'pending', pct: 0,
    desc: 'Update beneficiaries, will, and insurance — especially critical after JPMC exit when employer coverage ends March 31. HARD DEADLINE: Life insurance port by April 19.',
    docsHave: [],
    docsMissing: [
      'JPMC life insurance policy details (coverage amount, policy number)',
      'Current beneficiary designations on 401(k), bank accounts, any IRAs',
      'Existing will or trust documents',
      'Property deed — 2214 N Carroll Ave, Dallas TX 75204',
    ],
    actions: [
      '🚨 HARD DEADLINE Apr 19: Convert/port JPMC life insurance — 31-day window from exit',
      'Contact JPMC HR on March 19 exit day — request life insurance portability forms',
      'Compare: port JPMC group policy vs. buy individual term life (likely cheaper)',
      'Update 401(k) beneficiary designations (especially if rolling over to new IRA)',
      'Update bank account beneficiaries — add TOD (Transfer on Death) designations',
      'Confirm GEICO auto insurance continues uninterrupted (not employer-sponsored)',
      'Consider umbrella liability policy ($1M coverage costs ~$300/yr with GEICO)',
      'Draft or update will — especially relevant as homeowner with mortgage',
    ],
  },
]

// Updated June 4, 2026
export const DEADLINES: Deadline[] = [
  { date: 'Mar 19, 2026', event: '✅ JPMC exit + HELOC closed',                    amount: null,     risk: '✅ Done' },
  { date: 'Jun 27, 2026', event: '✅ Best Buy Promo 1 paid from HELOC — $962',     amount: 962.44,   risk: '✅ Paid' },
  { date: 'Jul 9, 2026',  event: '✅ Chase Freedom Unlim BT1 paid from HELOC',     amount: 8453.66,  risk: '✅ Paid' },
  { date: 'Jul 22, 2026', event: 'Chase Prime promo expires — $1,398',             amount: 1398,     risk: '🟠 Pay from HELOC' },
  { date: 'Aug 12, 2026', event: '🟠 Chase Freedom BT1 expires — $7,384',          amount: 7384.33,  risk: '🟠 Pay from HELOC' },
  { date: 'Sep 9, 2026',  event: 'Chase Freedom Unlim BT2 expires — $2,600',       amount: 2600,     risk: '🟡 Pay from HELOC' },
  { date: 'Sep 12, 2026', event: 'Chase Freedom BT2 expires — $2,600',             amount: 2600,     risk: '🟡 Pay from HELOC' },
  { date: 'Oct 9, 2026',  event: 'Chase Freedom Unlim BT3 expires — $7,000',       amount: 7000,     risk: '🟡 Pay from HELOC' },
  { date: 'Dec 9, 2026',  event: 'Chase Freedom Unlim BT4 expires — $4,000',       amount: 4000,     risk: '🟢 Pay from HELOC' },
  { date: 'Dec 12, 2026', event: 'Chase Freedom BT3 expires — $3,000',             amount: 3000,     risk: '🟢 Pay from HELOC' },
  { date: 'Dec 27, 2026', event: 'Best Buy Promo 2 — $918 deferred int $312',      amount: 917.96,   risk: '🟡 Pay from HELOC' },
  { date: 'Dec 31, 2026', event: 'Roth conversion deadline — low income year',     amount: null,     risk: '🟡 Coordinate with CPA' },
  { date: 'Jun 18, 2027', event: 'Citi Diamond BT expires — $11,999',              amount: 11999,    risk: '✅ Low urgency' },
]

// Updated June 4, 2026
export const ACTION_ITEMS: ActionItem[] = [
  { priority: 'red',   title: 'Pay Chase Prime promo $1,398 — Jul 22 deadline', detail: 'Next promo expiry. Draw from HELOC per plan.' },
  { priority: 'red',   title: 'Roll AmEx Gold ($4,519) + Platinum ($4,514) to HELOC', detail: 'Both accruing at 27.49% vs HELOC 6.85% — costing ~$170/mo in unnecessary interest.' },
  { priority: 'amber', title: 'Pay Chase Freedom (4628) BT1 $7,384 — Aug 12 deadline', detail: 'Draw from HELOC per drawdown schedule.' },
  { priority: 'amber', title: 'Follow up on DCAD property tax protest', detail: 'Filed before May 15 deadline. Check ifile.dallascad.org for hearing date or informal offer.' },
  { priority: 'red',   title: 'Confirm unemployment benefit end date with TWC', detail: 'TX is typically 26 weeks — likely exhausts ~late Sep 2026. Burn jumps from ~$5.1K to ~$7.3K/mo after.' },
  { priority: 'blue',  title: 'Roth conversion decision — Dec 31, 2026 deadline', detail: '2026 is a low-income year (unemployment only). Convert up to the top of 22% bracket. Coordinate with CPA.' },
  { priority: 'blue',  title: 'File 2025 taxes — resolve IRS balance first', detail: 'Do not file until IRS balance strategy is determined. Extension filed if needed.' },
]

// Updated June 4, 2026 — balances from live statements
export const PROMOS: PromoDeadline[] = [
  // ✅ Jun 27 Best Buy #1 ($962.44) and Jul 9 CFU BT1 ($8,453.66) PAID from HELOC
  // 🟠 URGENT
  { name: 'Chase Freedom — BT1',                balance: 7384.33,  expires: '2026-08-12', risk: null,   acct: 'Chase Freedom (4628)',        note: 'Pay from HELOC before Aug 12' },
  { name: 'Chase Prime Visa — promo',           balance: 1398.00,  expires: '2026-07-22', risk: null,   acct: 'Chase Prime Visa (9313)',    note: 'Pay from HELOC before Jul 22' },
  // 🟡 MODERATE
  { name: 'Chase Freedom Unlim — BT2',          balance: 2600.00,  expires: '2026-09-09', risk: null,   acct: 'Chase Freedom Unlim (7117)', note: 'Pay from HELOC' },
  { name: 'Chase Freedom — BT2',                balance: 2600.00,  expires: '2026-09-12', risk: null,   acct: 'Chase Freedom (4628)',        note: 'Pay from HELOC' },
  { name: 'Chase Freedom Unlim — BT3',          balance: 7000.00,  expires: '2026-10-09', risk: null,   acct: 'Chase Freedom Unlim (7117)', note: 'Pay from HELOC' },
  // 🟢 YEAR-END
  { name: 'Chase Freedom Unlim — BT4',          balance: 4000.00,  expires: '2026-12-09', risk: null,   acct: 'Chase Freedom Unlim (7117)', note: 'Pay from HELOC' },
  { name: 'Chase Freedom — BT3',                balance: 3000.00,  expires: '2026-12-12', risk: null,   acct: 'Chase Freedom (4628)',        note: 'Pay from HELOC' },
  { name: 'Citi Best Buy — Promo 2 (deferred)', balance: 917.96,   expires: '2026-12-27', risk: 311.74, acct: 'Citi Best Buy 4802',        note: 'Deferred int $312 at risk — pay from HELOC before Dec 27' },
  // ✅ LOW URGENCY
  { name: 'Citi Diamond Preferred BT',          balance: 11999.00, expires: '2027-06-18', risk: null,   acct: 'Citi Diamond (4205)',         note: '✅ Confirmed — lowest urgency. Pay from HELOC by Jun 2027.' },
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

// Updated June 2026 — post-HELOC consolidation actuals
export const BURN_RATE: BurnRateItem[] = [
  { label: 'BofA Mortgage (fixed)',         current: 2486.79, survival: 2486.79, note: '3.375% fixed — untouchable' },
  { label: 'Texas CU HELOC (6.85%)',        current: 816.49,  survival: 816.49,  note: 'Interest-only on $143,057 drawn · $190K limit' },
  { label: 'Property Tax (escrowed)',        current: 1216.25, survival: 1216.25, note: '$14,595/yr ÷ 12 — DCAD protest filed' },
  { label: 'Virginia FCU Loan',             current: 350.00,  survival: 350.00,  note: '8.5% @ $18,500 — roll to HELOC soon' },
  { label: 'AmEx Gold + Platinum (revolve)', current: 230.00, survival: 0,       note: '27.49% — $4,519 + $4,514 · roll ASAP saves ~$170/mo' },
  { label: 'Promo card minimums',           current: 248.00,  survival: 248.00,  note: 'Citi Diamond $124 + Chase/Best Buy promo mins' },
  { label: 'Insurance + utilities',         current: 800.00,  survival: 800.00,  note: 'GEICO, homeowners, TXU, Atmos, Dallas Water' },
  { label: 'CC variable spend',             current: 2000.00, survival: 2000.00, note: 'Food, gas, personal — survival floor' },
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
  { name: 'Virginia FCU/Dad', balance: 18500, rate: 8.5, moNow: 131.04, decision: 'roll' },
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
  propertyTaxDetails: [
    { auth: 'Dallas ISD', amount: 6211.47, pct: 42.6 },
    { auth: 'City of Dallas', amount: 4751.84, pct: 32.6 },
    { auth: 'Dallas County', amount: 1465.40, pct: 10.0 },
    { auth: 'Parkland Hospital', amount: 1441.60, pct: 9.9 },
    { auth: 'Dallas College', amount: 724.71, pct: 5.0 },
  ],
}

// Updated June 4, 2026 — post-JPMC, unemployment only
export const INCOME_BRIDGE: IncomeBridge = {
  liquidCash:           22806.80,  // Checking $2,678.76 + Wealthfront savings $20,128.04 (as of Jun 15)
  marchPaychecks:       0,         // Received — no longer pending
  severanceEstimate:    0,         // Resolved
  familyBridge:         0,
  consultingMonthlyNet: 2176,      // Unemployment: $1,088 bi-weekly = ~$2,176/mo
  targetSalary:         240000,
  targetTotalComp:      312000,
  monthlyOutflow:       7320,      // Mortgage $2,487 + HELOC int $816 + property tax $1,216 + insurance/utils $800 + living $2,000
  newJobMonthlyNet:     13670,
}

export const SPENDING_SUMMARY: SpendingSummary = {
  totalAnnualCC: 76052,
  totalMonthlyAvg: 6338,
  totalTransactions: 1615,
  topCategory: 'Food & Dining',
  topCategoryAmount: 27441,
  topCategoryPct: 36,
  survivalMonthly: 2500,
  cardsAnalyzed: 'AmEx Gold + Plat + Chase 9313',
}

export const SUBSCRIPTION_SUMMARY: SubscriptionSummary = {
  totalRecurringMerchants: 102,
  keepTotalMonthly: 36.29,
  keepCount: 3,
}

// Updated June 4, 2026 — protest filed, awaiting result
export const PROPERTY_TAX: PropertyTaxConfig = {
  address: '2214 N Carroll Ave, Dallas TX 75204',
  assessedValue: 850000,
  protestTarget: 750000,
  annualTotal: 14595.02,
  monthlyBudget: 1216.25,
  protestSavingsEstimate: 1700,
  protestDeadline: '2026-05-15',
  taxesPaid: true,
}

// Updated June 4, 2026
export const ASSETS: Assets = {
  home:       850000,
  retirement: 207675.85,  // Chase Self-Directed 3509: $178,209 + JPMC 2-01: $29,467
  brokerage:  0,          // Confirmed Jun 2026 — no brokerage account exists
  cash:       2678.76,    // Chase checking (operating) — as of Jun 15, 2026
  savings:    20128.04,   // Wealthfront Cash Account (HYSA) — reserve, no withdrawals yet
  vehicles:   35000,      // TBD — not updated
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

// ── HELOC Constants ──────────────────────────────────
// Updated June 4, 2026 — HELOC closed March 19, 2026
export const HELOC_LIMIT   = 190_000
export const HELOC_RATE    = 6.85
export const HELOC_DRAWN   = 152_473.32   // Jul 2026: +$9,416 (Best Buy #1 + CFU BT1 payoffs)
export const HELOC_AVAILABLE = HELOC_LIMIT - HELOC_DRAWN  // $37,526.68 remaining

// ── HELOC Computation Engine ─────────────────────────
// Derives everything from the live debts array — single source of truth

export interface HelocKPIs {
  limit: number
  rate: number
  immediateRoll: number
  helocAfterRoll: number
  monthlyHelocInterest: number
  currentPaymentsOnRolled: number
  monthlyRelief: number
  annualGain: number
  promoTotal: number
  finalBuffer: number
}

export interface WaterfallItem {
  label: string
  amount: number
  color: string
}

/** Derive HELOCAccount entries from the debts array — excludes mortgage and HELOC itself */
export function deriveHelocAccounts(debts: DebtAccount[]): HELOCAccount[] {
  return debts
    .filter(d => d.category !== 'Mortgage' && d.category !== 'HELOC')
    .map(d => ({
      name: d.name,
      balance: d.balance,
      rate: d.rate,
      moNow: d.min ?? d.balance * (d.rate / 100) / 12,
      decision: d.decision,
    }))
    .sort((a, b) => {
      // Sort: roll first (by balance desc), then keep, then promo
      const order = { roll: 0, keep: 1, promo: 2 }
      const diff = order[a.decision] - order[b.decision]
      return diff !== 0 ? diff : b.balance - a.balance
    })
}

/** Compute all HELOC KPIs — uses actual drawn balance post-consolidation */
export function computeHelocKPIs(debts: DebtAccount[]): HelocKPIs {
  const nonMortgage = debts.filter(d => d.category !== 'Mortgage' && d.category !== 'HELOC')

  const rollAccounts  = nonMortgage.filter(d => d.decision === 'roll')
  const promoAccounts = nonMortgage.filter(d => d.decision === 'promo')

  // Post-consolidation: "immediateRoll" = remaining high-rate debt not yet in HELOC
  const immediateRoll  = rollAccounts.reduce((s, d) => s + d.balance, 0)
  const promoTotal     = promoAccounts.reduce((s, d) => s + d.balance, 0)

  // Use actual drawn balance for interest calculation
  const monthlyHelocInterest       = HELOC_DRAWN * (HELOC_RATE / 100) / 12
  const currentPaymentsOnRolled    = rollAccounts.reduce((s, d) => s + (d.min ?? d.balance * (d.rate / 100) / 12), 0)
  const monthlyRelief              = currentPaymentsOnRolled - (immediateRoll * (HELOC_RATE / 100) / 12)
  const annualGain                 = monthlyRelief * 12
  const helocAfterRoll             = HELOC_LIMIT - HELOC_DRAWN - immediateRoll
  const finalBuffer                = HELOC_AVAILABLE - immediateRoll - promoTotal

  return {
    limit:                    HELOC_LIMIT,
    rate:                     HELOC_RATE,
    immediateRoll,
    helocAfterRoll,
    monthlyHelocInterest,
    currentPaymentsOnRolled,
    monthlyRelief,
    annualGain,
    promoTotal,
    finalBuffer,
  }
}

/** Build waterfall chart data from live KPIs */
export function computeWaterfall(kpis: HelocKPIs): WaterfallItem[] {
  return [
    { label: 'HELOC Limit (Confirmed)', amount: kpis.limit, color: '#22c55e' },
    { label: '→ Immediate Roll (high-rate debt)', amount: -kpis.immediateRoll, color: '#ef4444' },
    { label: '= Available After Roll', amount: kpis.helocAfterRoll, color: '#3b82f6' },
    { label: '→ Promo payoffs (as they expire)', amount: -kpis.promoTotal, color: '#f59e0b' },
    { label: '= Final Available Buffer', amount: kpis.finalBuffer, color: '#22c55e' },
  ]
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
  const helocAccounts = deriveHelocAccounts(DEBTS)
  const helocKPIs = computeHelocKPIs(DEBTS)
  const waterfallData = computeWaterfall(helocKPIs)

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
    helocAccounts,
    helocKPIs,
    waterfallData,
    wealthScenarios: WEALTH_SCENARIOS,
    topActions: TOP_ACTIONS,
    taxSnapshot: TAX_SNAPSHOT,
    incomeBridge: INCOME_BRIDGE,
    spendingSummary: SPENDING_SUMMARY,
    subscriptionSummary: SUBSCRIPTION_SUMMARY,
    propertyTax: PROPERTY_TAX,
    assets: ASSETS,
    investments: EMPTY_INVESTMENT_DATA,
    burnAnalysis: { ...EMPTY_BURN, monthlyIncome: INCOME_BRIDGE.consultingMonthlyNet },
  }
}
