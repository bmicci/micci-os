-- ============================================================
-- Micci OS — Financial Data Seed (March 8, 2026)
-- Run this against your Supabase project to populate/replace
-- financial data with real balances.
--
-- Usage: Paste into Supabase Dashboard > SQL Editor > Run
-- ============================================================

-- ── 1. debt_accounts ─────────────────────────────────────────
-- Balances from CSV export March 8, 2026
-- Note: schema has no 'recommendation' column — using 'notes' for action info

TRUNCATE TABLE debt_accounts RESTART IDENTITY CASCADE;

INSERT INTO debt_accounts (name, account_type, balance, interest_rate, minimum_payment, notes) VALUES
  ('SoFi Personal Loan',                'loan',        56075.21, 12.41,  1464.07, 'ROLL TO HELOC — 12.41% vs 6.85%'),
  ('LightStream Loan',                  'loan',        44018.42,  5.87,   577.47, 'KEEP — 5.87% < HELOC rate'),
  ('Chase Freedom Unlimited (7117)',    'credit_card', 22306.00,  0.00,   225.00, '0% PROMO BT — pay from HELOC before expiry'),
  ('Chase Freedom (4628)',              'credit_card', 13269.00,  0.00,   132.00, '0% PROMO BT — pay from HELOC before expiry'),
  ('Citi Diamond Preferred (4205)',     'credit_card', 12366.00,  0.00,   124.00, '0% PROMO — pay from HELOC by Jun 2027'),
  ('Wells Fargo Loan (via Dad)',        'loan',        21420.00, 12.49,  1100.00, 'ROLL TO HELOC — 12.49% vs 6.85%'),
  ('Virginia FCU Loan (via Dad)',       'loan',        18600.00,  9.25,   350.00, 'ROLL TO HELOC — 9.25% vs 6.85%'),
  ('AmEx Platinum (3002)',              'credit_card',  6452.55, 21.49,   501.09, 'ROLL TO HELOC — includes Plan Its + revolving'),
  ('AmEx Gold (4000)',                  'credit_card',  6262.62, 27.49,   182.18, 'ROLL TO HELOC — 27.49% revolving + Plan It'),
  ('AmEx Personal Loan (1001)',         'loan',         3535.56,  7.33,   407.01, 'KEEP — 7.33% close to HELOC rate'),
  ('Citi Best Buy (4802)',              'credit_card',  2375.24,  0.00,    50.00, '0% PROMO — pay from HELOC before expiry'),
  ('Nordstrom (Synchrony)',             'credit_card',   653.43, 29.40,    40.00, 'ROLL TO HELOC — 29.4% revolving'),
  ('Chase Prime Visa (9313)',           'credit_card',   688.66,  0.00,    95.77, '0% PROMO — pay from cash/HELOC'),
  ('PayPal Credit',                     'credit_card',   124.35,  0.00,    30.00, '0% PROMO — small, pay from cash'),
  ('BofA Mortgage (1624)',              'mortgage',   498903.37,  3.375, 2486.79, 'KEEP — 3.375% fixed, do not touch');

-- ── 2. financial_modules ─────────────────────────────────────
-- Note: schema has no 'module_number' column — using name ordering

TRUNCATE TABLE financial_modules RESTART IDENTITY CASCADE;

INSERT INTO financial_modules (name, category, status, progress, description, details) VALUES
  ('Spending Analysis', 'Analysis', 'complete', 100,
   'Full 2025 spending breakdown — 1,615 transactions across AmEx Gold, AmEx Platinum, Chase 9313.',
   '{"docsHave":["AmEx Gold 2025 full-year transactions","AmEx Platinum 2025 full-year transactions","Chase Prime Visa 9313 full-year","Property tax statement 2025","Pay stubs (Feb 2026, Jan 2026)","JPMC W-2 2024 & 2025"],"docsMissing":["Apple Card full year","Chase checking full year"],"actions":["✅ 1,615 transactions loaded and categorized","✅ Survival budget sheet built","✅ 20-year wealth projections added","Confirm JPMC severance amount with HR"]}'
  ),
  ('Subscription Audit', 'Analysis', 'complete', 100,
   'Scanned 1,615 transactions — identified 102 recurring merchants, 6 immediate cancels ($87/mo).',
   '{"docsHave":["AmEx Gold 2025 full-year transactions","AmEx Platinum 2025 full-year","Chase Prime Visa 2025 full-year","Module_2_Subscription_Audit.xlsx"],"docsMissing":["Confirm Paddle.net identity","Apple Card full year"],"actions":["✅ 102 recurring merchants identified","✅ 6 services flagged for cancel — $87.03/mo","Cancel Credit Sesame, Paramount+, Cloaked, GoPro, Pressed Juicery, Zips this week","Evaluate LifeTime Fitness downgrade — $228/mo to $25/mo"]}'
  ),
  ('Tax Prep', 'Tax', 'in_progress', 30,
   '2025 tax filing + planning for unusual income year (bonus, severance, partial year employment)',
   '{"docsHave":["JPMC W-2 2024","JPMC W-2 2025","Pay stubs 2024–2026","Mortgage statement"],"docsMissing":["Form 1098","1099s","Property tax payment receipts 2025","Severance agreement","2024 prior-year tax return"],"actions":["Pull Form 1098 from BofA","Flag severance tax withholding","Consult CPA before filing"]}'
  ),
  ('Debt Inventory & HELOC', 'Debt', 'in_progress', 70,
   'Full debt consolidation via $190K HELOC at 6.85% — must close before March 19',
   '{"docsHave":["All credit card statements (Feb 2026)","SoFi loan details","LightStream amortization","HELOC offer — Texas CU $190K at 6.85%"],"docsMissing":["Chase Freedom card statements (promo confirmation)","Virginia FCU loan statement","Wells Fargo loan statement"],"actions":["Confirm HELOC closing date with Texas Credit Union","Verify Chase Freedom cards are 100% at 0%","Get Virginia FCU + Wells Fargo current balance statements"]}'
  ),
  ('401(k) Review', 'Retirement', 'not_started', 0,
   'Review JPMC 401k balance ($26,260 as of Mar 8), vesting, fund allocations, and rollover strategy post-exit',
   '{"docsHave":[],"docsMissing":["JPMC 401(k) statement","Prior employer 401(k) or IRA statements"],"actions":["Pull JPMC Retirement Jan 31 2026 statement","Confirm 100% vesting","Decide: rollover to IRA vs. leave vs. roll to new employer"]}'
  ),
  ('Property Tax Protest (DCAD)', 'Tax', 'not_started', 0,
   'Protest Dallas County Appraisal District valuation to reduce property tax bill',
   '{"docsHave":[],"docsMissing":["Current DCAD notice of appraised value","Original purchase price documents","Property condition documentation"],"actions":["Pull current appraisal from dallascad.org","File protest online — deadline May 15","Gather comparable sales data"]}'
  ),
  ('IRS Balance Resolution', 'Tax', 'not_started', 0,
   'Resolve outstanding IRS balance — understand total owed, penalties, and payment options',
   '{"docsHave":[],"docsMissing":["IRS account transcript","All IRS CP notices","Prior year returns 2021–2024"],"actions":["Pull IRS account transcript from IRS.gov","Calculate total balance including penalties","Consult tax professional"]}'
  ),
  ('Savings & Wealth Plan', 'Wealth', 'not_started', 0,
   'Build emergency fund, set savings targets, and create wealth-building roadmap',
   '{"docsHave":[],"docsMissing":["Current savings/checking balances","Brokerage account statement","401(k) statement"],"actions":["Establish 3–6 month emergency fund target ($25K–$50K)","Open high-yield savings","Define investment allocation strategy"]}'
  ),
  ('Estate Planning', 'Legal', 'not_started', 0,
   'Review and update beneficiaries, will, and key legal documents',
   '{"docsHave":[],"docsMissing":["Beneficiary designations","Property deed(s)","Existing will or trust","Life insurance policy documents"],"actions":["Review and update all beneficiary designations","Confirm life insurance coverage post-JPMC","Draft or update will"]}'
  );

-- ── 3. subscriptions ─────────────────────────────────────────

TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE;

-- Cancel (action = 'cancel')
INSERT INTO subscriptions (name, amount, billing_cycle, category, action, notes, is_active) VALUES
  ('GoPro Subscription',      5.32, 'monthly', 'Entertainment', 'cancel', 'Camera collecting dust',                                    true),
  ('Paramount+',             14.06, 'monthly', 'Entertainment', 'cancel', 'Cut streaming — re-subscribe for specific shows',            true),
  ('Cloaked (Privacy Tool)',  9.99, 'monthly', 'Software',      'cancel', 'Nice-to-have only. Cut during survival period',              true),
  ('Credit Sesame Premium',  14.28, 'monthly', 'Finance',       'cancel', 'Redundant — Chase/AmEx monitor credit for free',             true),
  ('Pressed Juicery',        10.00, 'monthly', 'Health',        'cancel', 'Small but easy. Juice at home instead',                      true),
  ('Zips Car Wash Membership',33.38,'monthly', 'Auto',          'cancel', 'Cut now — use $5 self-serve wash',                           true);

-- Review (action = 'review')
INSERT INTO subscriptions (name, amount, billing_cycle, category, action, notes, is_active) VALUES
  ('Paddle.net (Unknown SaaS)',  12.88, 'monthly', 'Software',   'review', 'UNIDENTIFIED — check email for Paddle receipts',              true),
  ('Canva Pro',                  15.00, 'monthly', 'Software',   'review', 'Free tier is very capable — downgrade',                       true),
  ('Adobe Creative Cloud',       20.81, 'monthly', 'Software',   'review', 'Verify plan — downgrade if possible',                         true),
  ('Cursor (AI Code Editor)',    21.32, 'monthly', 'Software',   'review', 'Pause if not actively coding post-JPMC',                      true),
  ('Uber One Membership',         9.99, 'monthly', 'Transport',  'review', 'Pays for itself now, but reduce Uber first',                   true),
  ('AT&T Uverse (Internet/TV)', 100.03, 'monthly', 'Utilities',  'review', 'Shop Spectrum/Google Fiber — save $240–480/yr',               true),
  ('LifeTime Fitness',          228.23, 'monthly', 'Health',     'review', 'BIGGEST WIN — Consider LA Fitness at $25/mo',                 true),
  ('PlayStation Network',        84.30, 'monthly', 'Entertainment','review','$1,011/yr — audit game purchases vs PS+ only',                true),
  ('Hand & Stone Massage',       25.55, 'monthly', 'Health',     'review', 'Pause during survival budget period',                         true);

-- Essential bills (action = 'essential')
INSERT INTO subscriptions (name, amount, billing_cycle, category, action, notes, is_active) VALUES
  ('GEICO Auto Insurance',    230.51, 'monthly', 'Insurance',  'essential', 'Shop Progressive/USAA annually',           true),
  ('State Farm Insurance',     65.67, 'monthly', 'Insurance',  'essential', 'Verify coverage — confirm needed',          true),
  ('Homeowners Insurance',    385.01, 'monthly', 'Insurance',  'essential', 'Required for mortgage',                     true),
  ('TXU Electric',            215.19, 'monthly', 'Utilities',  'essential', 'Try Gexa or 4Change — PowerToChoose.org',   true),
  ('Atmos Energy (Gas)',       80.05, 'monthly', 'Utilities',  'essential', 'Regulated utility',                         true),
  ('Dallas Water',            122.11, 'monthly', 'Utilities',  'essential', 'City utility — normal rate',                true),
  ('NTTA Toll Autocharge',     40.00, 'monthly', 'Transport',  'essential', 'Reduce highway driving post-JPMC',          true);

-- ── 4. budget_categories ─────────────────────────────────────

TRUNCATE TABLE budget_categories RESTART IDENTITY CASCADE;

INSERT INTO budget_categories (name, monthly_actual, annual_actual, survival_budget, pct_of_total, color) VALUES
  ('Food & Dining',   2287, 27441, 1100, 36.1, '#ef4444'),
  ('Shopping/Retail', 1099, 13182,  200, 17.3, '#f59e0b'),
  ('Housing',          723,  8676,  723, 11.4, '#3b82f6'),
  ('Health',           574,  6884,  100,  9.1, '#22c55e'),
  ('Insurance',        521,  6249,  467,  8.2, '#8b5cf6'),
  ('Transportation',   425,  5095,  200,  6.7, '#06b6d4'),
  ('Other',            284,  3413,  100,  4.5, '#64748b'),
  ('Travel',           157,  1885,    0,  2.5, '#ec4899'),
  ('Subscriptions',    130,  1558,   80,  2.0, '#eab308'),
  ('Debt Service',     128,  1537,    0,  2.0, '#be123c'),
  ('Entertainment',     11,   131,   50,  0.2, '#6366f1');
