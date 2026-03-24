-- ═══════════════════════════════════════════════════════════════════════════
-- seed_financial_v2.sql  —  Micci OS Financial Data Seed
-- Sources: src/lib/financial-data.ts constants (as of March 2026)
--
-- SAFE TO RE-RUN: all inserts use ON CONFLICT … DO UPDATE.
-- Requires: migration_financial_architecture.sql to have run first.
-- Skips:    financial_modules (already seeded by migration_session_c.sql)
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 1: debt_accounts  (15 accounts)
-- Uses correct schema columns: interest_rate, minimum_payment, account_type
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO debt_accounts (name, account_type, balance, interest_rate, minimum_payment, status, notes) VALUES
  ('SoFi Personal Loan',             'loan',         56075.21, 12.41, 1464.07, 'active', 'ROLL TO HELOC — highest rate debt'),
  ('LightStream Loan',               'loan',         44018.42,  5.87,  577.47, 'active', 'KEEP — below HELOC rate'),
  ('Chase Freedom Unlimited (7117)', 'credit_card',  22306.00,  0.00,  225.00, 'active', 'HOLD 0% PROMO — BT buckets expiring Jul–Dec 2026'),
  ('Chase Freedom (4628)',           'credit_card',  13269.00,  0.00,  132.00, 'active', 'HOLD 0% PROMO — BT buckets expiring Aug–Dec 2026'),
  ('Citi Diamond Preferred (4205)',  'credit_card',  12366.00,  0.00,  124.00, 'active', 'HOLD 0% PROMO — expires Jun 18 2027'),
  ('Wells Fargo Loan (via Dad)',     'loan',         21420.00, 12.49, 1100.00, 'active', 'ROLL TO HELOC — family loan via Dad'),
  ('Virginia FCU Loan (via Dad)',    'loan',         18600.00,  9.25,  350.00, 'active', 'ROLL TO HELOC — family loan via Dad'),
  ('AmEx Platinum (3002)',           'credit_card',   6452.55, 21.49,  501.09, 'active', 'ROLL TO HELOC — high rate'),
  ('AmEx Gold (4000)',               'credit_card',   6262.62, 27.49,  182.18, 'active', 'ROLL TO HELOC — highest revolving rate'),
  ('AmEx Personal Loan (1001)',      'loan',          3535.56,  7.33,  407.01, 'active', 'KEEP — moderate rate, low balance'),
  ('Citi Best Buy (4802)',           'credit_card',   2375.24,  0.00,   50.00, 'active', 'HOLD 0% PROMO — Promo 1 Jun 27, Promo 2 Dec 27 2026'),
  ('Nordstrom (Synchrony)',          'credit_card',    653.43, 29.40,   40.00, 'active', 'ROLL TO HELOC — highest rate card'),
  ('Chase Prime Visa (9313)',        'credit_card',    688.66,  0.00,   95.77, 'active', 'HOLD 0% PROMO'),
  ('PayPal Credit',                  'credit_card',    124.35,  0.00,   30.00, 'active', 'HOLD 0% PROMO — expires Aug 4 2026'),
  ('BofA Mortgage (1624)',           'mortgage',    498903.37,  3.375, 2486.79,'active', 'KEEP — 3.375% fixed, never pay early')
ON CONFLICT (name) DO UPDATE SET
  account_type    = EXCLUDED.account_type,
  balance         = EXCLUDED.balance,
  interest_rate   = EXCLUDED.interest_rate,
  minimum_payment = EXCLUDED.minimum_payment,
  status          = EXCLUDED.status,
  notes           = EXCLUDED.notes;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 2: subscriptions  (22 rows)
-- Uses correct schema columns: amount (not monthly_cost), notes (not reason)
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO subscriptions (name, amount, billing_cycle, action, notes, is_active) VALUES
  -- Cancel candidates
  ('GoPro Subscription',         5.32, 'monthly', 'cancel',   'Camera collecting dust',                                       TRUE),
  ('Paramount+',                14.06, 'monthly', 'cancel',   'Cut streaming — re-subscribe for specific shows',              TRUE),
  ('Cloaked (Privacy Tool)',     9.99, 'monthly', 'cancel',   'Nice-to-have only. Cut during survival period',                TRUE),
  ('Credit Sesame Premium',     14.28, 'monthly', 'cancel',   'Redundant — Chase/AmEx monitor credit for free',               TRUE),
  ('Pressed Juicery',           10.00, 'monthly', 'cancel',   'Small but easy. Juice at home instead',                        TRUE),
  ('Zips Car Wash Membership',  33.38, 'monthly', 'cancel',   'Cut now — use $5 self-serve wash',                             TRUE),
  -- Review candidates
  ('Paddle.net (Unknown SaaS)', 12.88, 'monthly', 'review',   '⚠️ UNIDENTIFIED — check email for Paddle receipts',            TRUE),
  ('Canva Pro',                 15.00, 'monthly', 'review',   'Free tier is very capable — downgrade',                        TRUE),
  ('Adobe Creative Cloud',      20.81, 'monthly', 'review',   'Verify plan — downgrade if possible',                          TRUE),
  ('Cursor (AI Code Editor)',   21.32, 'monthly', 'review',   'Pause if not actively coding post-JPMC',                       TRUE),
  ('Uber One Membership',        9.99, 'monthly', 'review',   'Pays for itself now, but reduce Uber usage first',             TRUE),
  ('AT&T Uverse (Internet/TV)', 100.03,'monthly', 'review',   'Shop Spectrum/Google Fiber — save $240–480/yr',                TRUE),
  ('LifeTime Fitness',          228.23,'monthly', 'review',   '⚠️ BIGGEST WIN — downgrade to LA Fitness at $25/mo',           TRUE),
  ('PlayStation Network',        84.30,'monthly', 'review',   '$1,011/yr — audit game purchases vs PS+ only',                 TRUE),
  ('Hand & Stone Massage',       25.55,'monthly', 'review',   'Pause during survival budget period',                          TRUE),
  -- Essential bills
  ('GEICO Auto Insurance',      230.51,'monthly', 'essential','Shop Progressive/USAA annually',                               TRUE),
  ('State Farm Insurance',       65.67,'monthly', 'essential','Verify coverage — confirm needed',                             TRUE),
  ('Homeowners Insurance',      385.01,'monthly', 'essential','Required for mortgage',                                        TRUE),
  ('TXU Electric',              215.19,'monthly', 'essential','Try Gexa or 4Change — PowerToChoose.org',                     TRUE),
  ('Atmos Energy (Gas)',         80.05,'monthly', 'essential','Regulated utility',                                            TRUE),
  ('Dallas Water',              122.11,'monthly', 'essential','City utility — normal rate',                                   TRUE),
  ('NTTA Toll Autocharge',       40.00,'monthly', 'essential','Reduce highway driving post-JPMC',                             TRUE)
ON CONFLICT (name) DO UPDATE SET
  amount        = EXCLUDED.amount,
  billing_cycle = EXCLUDED.billing_cycle,
  action        = EXCLUDED.action,
  notes         = EXCLUDED.notes,
  is_active     = EXCLUDED.is_active;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 3: budget_categories  (11 rows)
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO budget_categories (name, monthly_actual, annual_actual, survival_budget, pct_of_total, color) VALUES
  ('Food & Dining',    2287, 27441, 1100, 36.1, '#ef4444'),
  ('Shopping/Retail',  1099, 13182,  200, 17.3, '#f59e0b'),
  ('Housing',           723,  8676,  723, 11.4, '#3b82f6'),
  ('Health',            574,  6884,  100,  9.1, '#22c55e'),
  ('Insurance',         521,  6249,  467,  8.2, '#8b5cf6'),
  ('Transportation',    425,  5095,  200,  6.7, '#06b6d4'),
  ('Other',             284,  3413,  100,  4.5, '#64748b'),
  ('Travel',            157,  1885,    0,  2.5, '#ec4899'),
  ('Subscriptions',     130,  1558,   80,  2.0, '#eab308'),
  ('Debt Service',      128,  1537,    0,  2.0, '#be123c'),
  ('Entertainment',      11,   131,   50,  0.2, '#6366f1')
ON CONFLICT (name) DO UPDATE SET
  monthly_actual  = EXCLUDED.monthly_actual,
  annual_actual   = EXCLUDED.annual_actual,
  survival_budget = EXCLUDED.survival_budget,
  pct_of_total    = EXCLUDED.pct_of_total,
  color           = EXCLUDED.color;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 4: deadlines  (10 rows)
-- Matches DbDeadline type: title, impact_if_missed, status columns
-- Past items → status='completed'. 'done' urgency maps to 'low'.
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO deadlines (title, deadline_date, amount, urgency, impact_if_missed, status, sort_order) VALUES
  ('Citizens Pay — FINAL payment',                     '2026-03-02',    769.78, 'low',      '✅ Done',                                'completed', 1),
  ('March 15 Paycheck',                                '2026-03-15',   4652.00, 'low',      '➕ Income',                              'completed', 2),
  ('Last day at JPMC / HELOC must close',              '2026-03-19',      NULL, 'critical', 'HELOC employment verification deadline', 'completed', 3),
  ('Partial paycheck + healthcare ends',               '2026-03-31',   1598.00, 'high',     'Healthcare ends — COBRA window opens',   'upcoming',  4),
  ('Life insurance convert/port DEADLINE',             '2026-04-19',      NULL, 'critical', '31-day hard window from exit date',      'upcoming',  5),
  ('COBRA election window closes',                     '2026-05-30',      NULL, 'high',     'Must elect within 60 days of Mar 31',    'upcoming',  6),
  ('Best Buy Promo 1 expires',                         '2026-06-27',   1312.00, 'high',     '$339 deferred interest if missed',       'upcoming',  7),
  ('Chase Freedom Unlim BT1 expires',                  '2026-07-09',   8500.00, 'high',     'Largest single promo — plan HELOC draw', 'upcoming',  8),
  ('Chase Freedom BT1 expires',                        '2026-08-12',   7500.00, 'high',     'Pay from HELOC before Aug 12',           'upcoming',  9),
  ('Citi Diamond BT promo expires',                    '2027-06-18',  12366.00, 'low',      'Lowest urgency — pay from HELOC by Jun 2027', 'upcoming', 10)
ON CONFLICT (title) DO UPDATE SET
  deadline_date    = EXCLUDED.deadline_date,
  amount           = EXCLUDED.amount,
  urgency          = EXCLUDED.urgency,
  impact_if_missed = EXCLUDED.impact_if_missed,
  status           = EXCLUDED.status,
  sort_order       = EXCLUDED.sort_order;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 5: promo_deadlines  (12 rows)
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO promo_deadlines (name, account_name, balance, expires_date, deferred_interest_risk, notes, status, sort_order) VALUES
  ('Citizens Pay 6607',           'Citizens Pay',                       0.00, '2026-03-02',   NULL, '✅ Final payment made. Account closing.',              'paid',   1),
  ('Citi Best Buy — Promo 1',     'Citi Best Buy (4802)',            1312.44, '2026-06-27', 338.99, 'Pay from HELOC or cash before Jun 27',                 'active', 2),
  ('Chase Freedom Unlim — BT1',   'Chase Freedom Unlimited (7117)', 8500.00, '2026-07-09',   NULL, '⚠️ Largest promo — plan HELOC draw now',               'active', 3),
  ('PayPal Credit promo',         'PayPal Credit',                   124.35, '2026-08-04',   NULL, 'Small — pay from cash. Deferred int applies.',         'active', 4),
  ('Chase Freedom — BT1',         'Chase Freedom (4628)',           7500.00, '2026-08-12',   NULL, 'Pay from HELOC before Aug 12',                         'active', 5),
  ('Chase Freedom Unlim — BT2',   'Chase Freedom Unlimited (7117)', 2600.00, '2026-09-09',   NULL, 'Pay from HELOC',                                        'active', 6),
  ('Chase Freedom — BT2',         'Chase Freedom (4628)',           2600.00, '2026-09-12',   NULL, 'Pay from HELOC',                                        'active', 7),
  ('Chase Freedom Unlim — BT3',   'Chase Freedom Unlimited (7117)', 7000.00, '2026-10-09',   NULL, 'Pay from HELOC',                                        'active', 8),
  ('Chase Freedom Unlim — BT4',   'Chase Freedom Unlimited (7117)', 1032.25, '2026-12-09',   NULL, 'Pay from HELOC',                                        'active', 9),
  ('Chase Freedom — BT3',         'Chase Freedom (4628)',           1064.51, '2026-12-12',   NULL, 'Pay from HELOC',                                        'active', 10),
  ('Citi Best Buy — Promo 2',     'Citi Best Buy (4802)',            917.96, '2026-12-27', 196.33, 'Pay from HELOC or cash before Dec 27',                 'active', 11),
  ('Citi Diamond Preferred BT',   'Citi Diamond Preferred (4205)', 12366.00, '2027-06-18',   NULL, '✅ Lowest urgency. Pay from HELOC by Jun 2027.',        'active', 12)
ON CONFLICT (name) DO UPDATE SET
  account_name            = EXCLUDED.account_name,
  balance                 = EXCLUDED.balance,
  expires_date            = EXCLUDED.expires_date,
  deferred_interest_risk  = EXCLUDED.deferred_interest_risk,
  notes                   = EXCLUDED.notes,
  status                  = EXCLUDED.status,
  sort_order              = EXCLUDED.sort_order;
