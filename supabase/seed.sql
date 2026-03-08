-- ============================================================
-- Micci OS — Seed Data (real data from Financial Master Plan 2026)
-- ============================================================

-- ============================================================
-- FINANCIAL MODULES (9 modules)
-- ============================================================

INSERT INTO financial_modules (module_number, name, category, status, progress, description) VALUES
  (1, 'Spending Analysis',         'budgeting',   'in_progress', 90,
   'Full 2025 spending breakdown — 1,615 transactions across AmEx Gold, AmEx Platinum, Chase 9313. Survival budget, 20-year wealth projections, and post-HELOC burn rate completed.'),
  (2, 'Subscription Audit',        'budgeting',   'in_progress', 90,
   'Scanned 1,615 transactions — identified 102 recurring merchants, 6 immediate cancels ($87/mo), 9 under review ($458/mo). Conservative savings: $316/mo · $3,824/yr.'),
  (3, 'Tax Prep',                  'taxes',       'in_progress', 30,
   '2025 tax filing + planning for unusual income year (bonus, severance, partial year employment)'),
  (4, 'Debt Inventory & HELOC',    'debt',        'in_progress', 70,
   'Full debt consolidation via $190K HELOC at 6.85% — must close before March 19'),
  (5, '401(k) Review',             'investments', 'not_started',  0,
   'Review JPMC 401k balance, vesting, fund allocations, and rollover strategy post-exit'),
  (6, 'Property Tax Protest (DCAD)','taxes',      'not_started',  0,
   'Protest Dallas County Appraisal District valuation — market value $850K, deadline May 15 2026'),
  (7, 'IRS Balance Resolution',    'taxes',       'not_started',  0,
   'Resolve outstanding IRS balance — understand total owed, penalties, and payment options'),
  (8, 'Savings & Wealth Plan',     'banking',     'not_started',  0,
   'Build emergency fund, set savings targets, and create wealth-building roadmap post-income-gap'),
  (9, 'Estate Planning',           'legal',       'not_started',  0,
   'Review and update beneficiaries, will, and key legal documents — especially critical during employment transition')
;

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

INSERT INTO subscriptions (name, amount, billing_cycle, category, action, notes, is_active) VALUES
  -- Cancel (6)
  ('GoPro Subscription',       5.32, 'monthly', 'entertainment', 'cancel', 'Camera collecting dust? Cancel immediately',           true),
  ('Paramount+',              14.06, 'monthly', 'entertainment', 'cancel', 'Cut streaming — re-subscribe for specific shows',      true),
  ('Cloaked (Privacy Tool)',   9.99, 'monthly', 'software',      'cancel', 'Nice-to-have only. Cut during survival period',        true),
  ('Credit Sesame Premium',   14.28, 'monthly', 'finance',       'cancel', 'Redundant — Chase/AmEx monitor credit for free',       true),
  ('Pressed Juicery',         10.00, 'monthly', 'food',          'cancel', 'Small but easy. Juice at home instead',                true),
  ('Zips Car Wash',           33.38, 'monthly', 'auto',          'cancel', 'Cut now — use $5 self-serve wash',                     true),

  -- Review (9)
  ('Paddle.net (Unknown SaaS)',12.88, 'monthly', 'software',     'review', '⚠️ UNIDENTIFIED — check email for Paddle receipts',    true),
  ('Canva Pro',               15.00, 'monthly', 'software',      'review', 'Free tier is very capable — downgrade',                true),
  ('Adobe Creative Cloud',    20.81, 'monthly', 'software',      'review', 'Verify plan — downgrade if possible',                  true),
  ('Cursor (AI Code Editor)', 21.32, 'monthly', 'development',   'review', 'Pause if not actively coding post-JPMC',               true),
  ('Uber One',                 9.99, 'monthly', 'transportation', 'review', 'Pays for itself now, but reduce Uber first',           true),
  ('AT&T Uverse',            100.03, 'monthly', 'utilities',     'review', 'Shop Spectrum/Google Fiber — save $240-480/yr',        true),
  ('LifeTime Fitness',       228.23, 'monthly', 'fitness',       'review', '⚠️ BIGGEST WIN — Consider LA Fitness at $25/mo',       true),
  ('PlayStation Network',     84.30, 'monthly', 'entertainment', 'review', '$1,011/yr — audit game purchases vs PS+ only',         true),
  ('Hand & Stone Massage',    25.55, 'monthly', 'wellness',      'review', 'Pause during survival budget period',                  true),

  -- Essential bills (7)
  ('GEICO Auto Insurance',   230.51, 'monthly', 'insurance',    'essential', 'Shop Progressive/USAA annually — 20-30% savings possible', true),
  ('State Farm Insurance',    65.67, 'monthly', 'insurance',    'essential', 'Verify coverage — renters? life? confirm needed',           true),
  ('Homeowners Insurance',   385.01, 'monthly', 'insurance',    'essential', 'Required for mortgage — shop at renewal date',              true),
  ('TXU Electric',           215.19, 'monthly', 'utilities',    'essential', 'Try Gexa or 4Change — check PowerToChoose.org',            true),
  ('Atmos Energy (Gas)',      80.05, 'monthly', 'utilities',    'essential', 'Regulated utility — limited alternatives',                  true),
  ('Dallas Water',           122.11, 'monthly', 'utilities',    'essential', 'City utility — normal Dallas residential rate',             true),
  ('NTTA Toll Autocharge',    40.00, 'monthly', 'transportation','essential', 'Reduce highway driving post-JPMC',                         true)
;

-- ============================================================
-- DEBT ACCOUNTS (real balances as of Feb/Mar 2026)
-- ============================================================

INSERT INTO debt_accounts (name, account_type, balance, interest_rate, minimum_payment, status, recommendation, notes) VALUES
  ('SoFi Personal Loan',              'loan',        56958.92, 12.41, 1464.07, 'active',      'ROLL TO HELOC',      '12.41% — highest rate, roll to HELOC immediately at close'),
  ('LightStream Loan',                'loan',        44018.42,  5.87,  577.47, 'active',      'KEEP',               '5.87% — below HELOC rate, maintain payments as-is'),
  ('Wells Fargo Loan (via Dad)',       'loan',        21420.00, 12.49, 1100.00, 'active',      'ROLL TO HELOC',      '12.49% — family loan, $1,100/mo Zelle, roll to HELOC'),
  ('Virginia FCU Loan (via Dad)',      'loan',        18600.00,  9.25,  350.00, 'active',      'ROLL TO HELOC',      '9.25% — roll to HELOC at close'),
  ('Chase Freedom Unlimited (7117)',   'credit_card', 22531.00,  0.00,  225.00, 'active',      'HOLD - 0% PROMO',    '0% BT promo — multiple buckets expiring Jul–Dec 2026, pay from HELOC'),
  ('Chase Freedom (9313)',             'credit_card', 13269.00,  0.00,  132.00, 'active',      'HOLD - 0% PROMO',    '0% BT promo — buckets expiring Aug–Dec 2026'),
  ('Citi Diamond Preferred',          'credit_card', 12366.00,  0.00,  124.00, 'active',      'HOLD - 0% PROMO',    '0% BT promo confirmed thru Jun 18 2027 — lowest urgency'),
  ('AmEx Platinum — Old Plan It®',    'credit_card',  2252.41, 15.50,  230.97, 'active',      'ROLL TO HELOC',      '15.5% Plan fee — roll to HELOC at close'),
  ('AmEx Platinum — New Plan It®',    'credit_card',  2835.58, 15.50,  270.12, 'active',      'ROLL TO HELOC',      '15.5% Plan fee — roll to HELOC at close'),
  ('AmEx Platinum — Revolving',       'credit_card',   513.11, 27.49,   NULL,  'active',      'ROLL TO HELOC',      '27.49% revolving — minimize new charges, roll at close'),
  ('AmEx Gold — Plan It®',            'credit_card',  1776.88, 15.50,  182.18, 'active',      'ROLL TO HELOC',      '15.5% Plan fee — roll to HELOC at close'),
  ('AmEx Personal Loan',              'loan',         3942.57,  7.33,  407.01, 'active',      'KEEP',               '7.33% — keep, below HELOC rate cutoff in practice'),
  ('Nordstrom (Synchrony)',            'credit_card',   653.43, 29.40,   40.00, 'active',      'ROLL TO HELOC',      '29.4% — roll to HELOC at close'),
  ('Citi Best Buy 4802',              'credit_card',  2230.40,  0.00,   50.00, 'active',      'HOLD - 0% PROMO',    '0% promos — Promo 1 exp Jun 27, Promo 2 exp Dec 27 2026'),
  ('Chase Prime Visa',                'credit_card',   627.73,  0.00,   95.77, 'active',      'HOLD - 0% PROMO',    '0% promo balance'),
  ('PayPal Credit',                   'credit_card',   124.35,  0.00,   30.00, 'active',      'HOLD - 0% PROMO',    '0% promo exp Aug 4 2026 — deferred int applies, pay from cash'),
  ('BofA Mortgage',                   'mortgage',   498903.37,  3.375, 2486.79,'active',      'KEEP - NEVER PAY EARLY', '3.375% fixed — primary residence, maximize mortgage interest deduction')
;

-- ============================================================
-- BUDGET CATEGORIES (from 2025 CC spend analysis — 1,615 transactions)
-- ============================================================

INSERT INTO budget_categories (name, monthly_actual, annual_actual, survival_budget, pct_of_total, color) VALUES
  ('Food & Dining',    2286.75, 27441, 1100, 36.1, '#dc2626'),
  ('Shopping/Retail',  1098.50, 13182,  200, 17.3, '#d97706'),
  ('Housing',           723.00,  8676,  723, 11.4, '#2563eb'),
  ('Health',            573.67,  6884,  100,  9.1, '#16a34a'),
  ('Insurance',         520.75,  6249,  467,  8.2, '#7c3aed'),
  ('Transportation',    424.58,  5095,  200,  6.7, '#0891b2'),
  ('Other',             284.42,  3413,  100,  4.5, '#64748b'),
  ('Travel',            157.08,  1885,    0,  2.5, '#be185d'),
  ('Subscriptions',     129.83,  1558,   80,  2.0, '#ca8a04'),
  ('Debt Service',      128.08,  1537,    0,  2.0, '#9f1239'),
  ('Entertainment',      10.92,   131,   50,  0.2, '#4f46e5')
;

-- ============================================================
-- GOAL CATEGORIES (13 categories)
-- ============================================================

INSERT INTO goal_categories (name, icon, color, description) VALUES
  ('Career & Income',      '💼', '#818cf8', 'Job search, income streams, career development'),
  ('Financial',            '💰', '#34d399', 'Debt payoff, savings, investments, net worth'),
  ('Health & Fitness',     '💪', '#f97316', 'Workouts, nutrition, body composition, labs'),
  ('Mental & Emotional',   '🧠', '#a78bfa', 'Therapy, journaling, stress management'),
  ('Relationships',        '❤️', '#f43f5e', 'Family, friends, dating, social connections'),
  ('Learning & Skills',    '📚', '#38bdf8', 'Courses, reading, new technologies'),
  ('Home & Environment',   '🏠', '#fbbf24', 'Living space, organization, HELOC project'),
  ('Travel & Experiences', '✈️', '#06b6d4', 'Trips, concerts, bucket list experiences'),
  ('Wellness & Recovery',  '🧘', '#4ade80', 'Sleep, sauna, massage, meditation'),
  ('Business & Projects',  '🚀', '#c084fc', 'micci-os, side projects, freelance'),
  ('Legal & Admin',        '⚖️', '#fb923c', 'BofA dispute, JPMC exit, legal documents'),
  ('Style & Identity',     '✨', '#e879f9', 'Wardrobe, grooming, personal brand'),
  ('Spiritual & Purpose',  '🌟', '#fde68a', 'Values, meaning, life vision clarity')
;

-- ============================================================
-- GOALS
-- ============================================================

WITH cat AS (SELECT id FROM goal_categories WHERE name = 'Career & Income' LIMIT 1)
INSERT INTO goals (category_id, title, section, timeframe, completed, priority, status, target_date) VALUES
  ((SELECT id FROM cat), 'Submit 40+ job applications by March 19',                       'career', 'monthly', false, 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Land 5+ recruiter conversations before March 19',               'career', 'monthly', false, 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Ace Goldman Sachs interview process',                           'career', 'monthly', false, 1, 'active', NULL),
  ((SELECT id FROM cat), 'Ace RealPage interview process',                                'career', 'monthly', false, 1, 'active', NULL),
  ((SELECT id FROM cat), 'Request 3–5 LinkedIn recommendations from JPMC colleagues',    'career', 'weekly',  false, 2, 'active', '2026-03-15'),
  ((SELECT id FROM cat), 'Download all JPMC documents (pay stubs, W-2s, reviews, 401k)', 'career', 'weekly',  false, 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'File for Texas unemployment on March 19 or 20',                'career', 'monthly', false, 2, 'active', '2026-03-20'),
  ((SELECT id FROM cat), 'Complete all JPMC certifications before last day',              'career', 'weekly',  false, 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Update LinkedIn profile and resume for 2026',                   'career', 'monthly', false, 3, 'active', '2026-03-01');

WITH cat AS (SELECT id FROM goal_categories WHERE name = 'Financial' LIMIT 1)
INSERT INTO goals (category_id, title, section, timeframe, completed, priority, status, target_date) VALUES
  ((SELECT id FROM cat), 'Close HELOC with Loan Depot before March 19',                  'financial', 'monthly', false, 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Do NOT sign release agreement without employment attorney',     'financial', 'monthly', false, 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Elect life insurance conversion/port by April 19',             'financial', 'monthly', false, 1, 'active', '2026-04-19'),
  ((SELECT id FROM cat), 'Make COBRA vs marketplace decision before May 30',             'financial', 'monthly', false, 1, 'active', '2026-05-30'),
  ((SELECT id FROM cat), 'Roll JPMC 401k to IRA (Empower) after March 19',              'financial', 'monthly', false, 2, 'active', '2026-04-30'),
  ((SELECT id FROM cat), 'Cancel 6 subscriptions: GoPro, Paramount+, Cloaked, Credit Sesame, Pressed Juicery, Zips', 'financial', 'weekly', false, 1, 'active', '2026-03-10'),
  ((SELECT id FROM cat), 'Pay off Best Buy Promo 1 ($1,312) before Jun 27',             'financial', 'monthly', false, 2, 'active', '2026-06-27'),
  ((SELECT id FROM cat), 'File DCAD property tax protest by May 15',                    'financial', 'monthly', false, 2, 'active', '2026-05-15');

WITH cat AS (SELECT id FROM goal_categories WHERE name = 'Health & Fitness' LIMIT 1)
INSERT INTO goals (category_id, title, section, timeframe, completed, priority, status, target_date) VALUES
  ((SELECT id FROM cat), 'Maintain heavy lift schedule 5x/week Mon–Fri',               'health', 'weekly',  false, 1, 'active', NULL),
  ((SELECT id FROM cat), 'Daily outdoor walk minimum 30 minutes',                      'health', 'daily',   false, 1, 'active', NULL),
  ((SELECT id FROM cat), 'Schedule physical + blood work before March 19',             'health', 'monthly', false, 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Schedule dentist appointment before March 19',               'health', 'monthly', false, 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Schedule dermatology appointment before March 19',           'health', 'monthly', false, 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Schedule eye exam before March 19',                          'health', 'monthly', false, 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Refill all prescriptions to 90-day supply before March 19', 'health', 'weekly',  false, 1, 'active', '2026-03-19');

WITH cat AS (SELECT id FROM goal_categories WHERE name = 'Wellness & Recovery' LIMIT 1)
INSERT INTO goals (category_id, title, section, timeframe, completed, priority, status, target_date) VALUES
  ((SELECT id FROM cat), 'Lock in 8 hours sleep nightly (11 PM → 7 AM)', 'wellness', 'daily',  false, 1, 'active', NULL),
  ((SELECT id FROM cat), 'Weekly massage 1–2x (weekends)',                'wellness', 'weekly', false, 2, 'active', NULL),
  ((SELECT id FROM cat), 'IR sauna 1x/week Saturday PM',                  'wellness', 'weekly', false, 2, 'active', NULL),
  ((SELECT id FROM cat), 'Daily morning stretch (non-negotiable)',         'wellness', 'daily',  false, 1, 'active', NULL),
  ((SELECT id FROM cat), 'Meditation + journaling each morning',           'wellness', 'daily',  false, 3, 'active', NULL);

-- ============================================================
-- SUPPLEMENTS (40 supplements)
-- ============================================================

INSERT INTO supplements (name, dosage, frequency, timing, category, notes, is_active) VALUES
  ('Vitamin D3',             '5000 IU',    'daily',    'morning with food',  'vitamins',       'With K2 for optimal absorption',             true),
  ('Vitamin K2 (MK-7)',      '200 mcg',    'daily',    'morning with food',  'vitamins',       'Paired with D3',                             true),
  ('Magnesium Glycinate',    '400 mg',     'daily',    'bedtime',            'minerals',       'Sleep quality + muscle recovery',            true),
  ('Omega-3 Fish Oil',       '3g EPA/DHA', 'daily',    'with meals',         'essential',      'Anti-inflammatory, cardiovascular',          true),
  ('Creatine Monohydrate',   '5g',         'daily',    'post-workout',       'performance',    'Load phase complete — maintenance dose',     true),
  ('Zinc Picolinate',        '30 mg',      'daily',    'bedtime',            'minerals',       'Testosterone support, sleep, immunity',      true),
  ('Ashwagandha (KSM-66)',   '600 mg',     'daily',    'evening',            'adaptogens',     'Cortisol reduction, stress resilience',      true),
  ('Rhodiola Rosea',         '500 mg',     'daily',    'morning, fasted',    'adaptogens',     'Energy + cognitive performance',             true),
  ('CoQ10 (Ubiquinol)',      '200 mg',     'daily',    'with fat meal',      'mitochondrial',  'Cellular energy, TRT support',               true),
  ('NAC (N-Acetyl Cysteine)','600 mg',     'daily',    'with meals',         'antioxidants',   'Liver support, glutathione precursor',       true),
  ('Probiotic (50B CFU)',    '1 capsule',  'daily',    'morning, fasted',    'gut_health',     'Multi-strain, rotate brands quarterly',      true),
  ('Digestive Enzymes',      '1 capsule',  'with meals','before meals',      'gut_health',     'With heavy meals',                           true),
  ('Berberine',              '500 mg',     '3x daily', 'with meals',         'metabolic',      'Blood sugar regulation, AMPK activation',    true),
  ('Alpha-GPC',              '300 mg',     'daily',    'morning',            'nootropics',     'Choline source, cognitive performance',      true),
  ('Lion''s Mane',           '1000 mg',    'daily',    'morning',            'nootropics',     'NGF stimulation, focus, memory',             true),
  ('Bacopa Monnieri',        '300 mg',     'daily',    'with food',          'nootropics',     'Memory consolidation — takes 4–6 weeks',     true),
  ('Melatonin',              '0.5 mg',     'nightly',  '30 min before bed',  'sleep',          'Low dose — avoid high-dose dependency',      true),
  ('L-Theanine',             '200 mg',     'nightly',  'bedtime',            'sleep',          'Wind down, reduce racing thoughts',          true),
  ('GABA',                   '750 mg',     'nightly',  'bedtime',            'sleep',          'Deep sleep initiation',                      true),
  ('DHEA',                   '25 mg',      'daily',    'morning with food',  'hormones',       'Precursor to androgens/estrogens',           true),
  ('Pregnenolone',           '50 mg',      'daily',    'morning',            'hormones',       'Neurosteroid — mood and memory support',     true),
  ('Boron',                  '10 mg',      'daily',    'with food',          'hormones',       'Free testosterone optimization',             true),
  ('Tongkat Ali',            '400 mg',     'daily',    'morning',            'hormones',       'LH/FSH stimulation, testosterone support',  true),
  ('Tart Cherry Extract',    '500 mg',     'daily',    'post-workout',       'recovery',       'Reduces muscle soreness, anti-inflammatory', true),
  ('Collagen Peptides',      '15g',        'daily',    'morning in coffee',  'recovery',       'Joint health + skin',                        true),
  ('Glutamine',              '5g',         'daily',    'post-workout',       'recovery',       'Gut lining + muscle preservation',           true),
  ('Bergamot Extract',       '500 mg',     'daily',    'with food',          'cardiovascular', 'LDL reduction, cardiovascular health',       true),
  ('Red Yeast Rice',         '600 mg',     'daily',    'evening',            'cardiovascular', 'Lipid support — monitor liver enzymes',      true),
  ('Niacin (Flush-free)',    '500 mg',     'daily',    'with food',          'cardiovascular', 'HDL support, vasodilation',                  true),
  ('B-Complex (methylated)', '1 capsule',  'daily',    'morning with food',  'vitamins',       'MTHFR support, energy metabolism',           true),
  ('Vitamin C',              '1000 mg',    'daily',    'morning',            'vitamins',       'Immune, collagen synthesis',                 true),
  ('Iodine (Lugol''s 2%)',   '4 drops',    'daily',    'in water, morning',  'thyroid',        'Thyroid optimization',                       true),
  ('Selenium',               '200 mcg',    'daily',    'with food',          'thyroid',        'Thyroid + antioxidant',                      true),
  ('NMN',                    '500 mg',     'daily',    'morning, fasted',    'longevity',      'NAD+ precursor — longevity protocol',        true),
  ('Resveratrol',            '500 mg',     'daily',    'with fat meal',      'longevity',      'Sirtuin activation, paired with NMN',        true),
  ('Fisetin',                '500 mg',     'monthly',  '2-day pulse monthly','longevity',      'Senolytic — pulse dosing protocol',          true),
  ('Quercetin',              '1000 mg',    'monthly',  '2-day pulse monthly','longevity',      'Senolytic + antihistamine — pulse dosing',   true),
  ('Metformin',              '500 mg',     'daily',    'with dinner',        'metabolic',      'Off-label longevity — consult prescriber',   false),
  ('Lithium Orotate',        '5 mg',       'daily',    'evening',            'mental_health',  'Neuroprotective, mood stability micro-dose', true),
  ('Apigenin',               '50 mg',      'nightly',  'bedtime',            'sleep',          'CD38 inhibitor + mild anxiolytic',           true)
;

-- ============================================================
-- HORMONE PROTOCOLS (TRT)
-- ============================================================

INSERT INTO hormone_protocols (name, substance, dosage, day_of_week, time_of_day, notes, is_active) VALUES
  ('TRT — Testosterone Cypionate', 'Testosterone Cypionate', '100mg/0.5mL',
   ARRAY['Monday'], 'morning',
   'Subcutaneous injection. Rotate injection sites. Track in protocol log.', true),
  ('TRT — hCG', 'Human Chorionic Gonadotropin (hCG)', '500 IU',
   ARRAY['Thursday','Sunday'], 'morning',
   'Maintain testicular function and size. Refrigerate hCG.', true),
  ('TRT — Anastrozole (AI)', 'Anastrozole', '1 mg',
   ARRAY['Thursday'], 'with food',
   'Aromatase inhibitor — monitor E2 levels. Adjust dose based on bloodwork every 6 weeks.', true)
;

-- ============================================================
-- DAILY SCHEDULE TEMPLATE
-- ============================================================

INSERT INTO daily_schedule (day_type, time_slot, activity, category, duration_minutes, is_fixed) VALUES
  ('weekday', '06:00', 'Wake up — no alarm, natural light',                          'morning_routine', 15, true),
  ('weekday', '06:15', 'Sunlight exposure (5–10 min outside)',                       'wellness',        10, true),
  ('weekday', '06:25', 'Hydrate — 32 oz water + electrolytes',                      'health',           5, true),
  ('weekday', '06:30', 'Morning supplements stack',                                  'health',           5, true),
  ('weekday', '06:35', 'Meditation (Waking Up app, 10–15 min)',                      'mental_health',   15, true),
  ('weekday', '06:50', 'Journaling — 3 priorities for the day',                     'planning',        15, true),
  ('weekday', '07:05', 'Morning stretch — full body (20 min)',                       'fitness',         20, true),
  ('weekday', '07:25', 'Shower + grooming + skincare',                              'personal_care',   25, false),
  ('weekday', '07:50', 'Breakfast — high protein + fat',                            'nutrition',       20, false),
  ('weekday', '08:10', 'Deep work block 1 — job search (applications, outreach)',   'job_search',      90, false),
  ('weekday', '09:40', 'Break — walk + rehydrate',                                  'wellness',        15, false),
  ('weekday', '09:55', 'Deep work block 2 — project / coding / interviews',         'deep_work',       90, false),
  ('weekday', '11:25', 'Admin block — email, scheduling, tasks (max 45 min)',       'admin',           45, false),
  ('weekday', '12:10', 'Lunch + rest',                                              'nutrition',       45, false),
  ('weekday', '12:55', 'Gym — heavy compound lifts (Mon–Fri splits)',               'fitness',         75, true),
  ('weekday', '14:10', 'Post-workout: protein shake + creatine + tart cherry',     'nutrition',       10, false),
  ('weekday', '14:20', 'Outdoor walk — minimum 30 minutes',                         'fitness',         45, true),
  ('weekday', '15:05', 'Deep work block 3 — optional (networking / follow-ups)',    'job_search',      60, false),
  ('weekday', '16:05', 'Review tomorrow + plan next day (15 min)',                  'planning',        15, false),
  ('weekday', '16:20', 'Free time / reading / hobbies',                             'personal',        90, false),
  ('weekday', '17:50', 'Dinner prep + dinner',                                      'nutrition',       60, false),
  ('weekday', '18:50', 'Evening wind-down — no screens after 10 PM',               'wellness',        30, false),
  ('weekday', '21:30', 'Evening skincare + sleep supplements',                      'health',          15, true),
  ('weekday', '21:45', 'Read (physical book) or journal',                           'mental_health',   45, false),
  ('weekday', '22:30', 'Lights out — phones out of bedroom',                        'sleep',            0, true),
  ('weekend', '07:00', 'Wake up (sleep in 1 hour)',                                 'morning_routine', 20, false),
  ('weekend', '07:20', 'Sunlight + hydrate + supplements',                          'health',          15, true),
  ('weekend', '07:35', 'Extended stretch — 30–45 min',                             'fitness',         40, true),
  ('weekend', '08:15', 'Meditation + long-form journaling / weekly review',         'mental_health',   45, false),
  ('weekend', '09:00', 'Gym — upper body or full body',                             'fitness',         75, false),
  ('weekend', '10:15', 'Brunch — larger meal',                                      'nutrition',       45, false),
  ('weekend', '11:00', 'Massage (1–2x weekend)',                                    'recovery',        60, false),
  ('weekend', '13:00', 'Free time — errands, social, admin',                        'personal',       120, false),
  ('weekend', '15:00', 'Outdoor cardio or extended walk',                           'fitness',         60, false),
  ('weekend', '16:00', 'IR sauna (Saturday PM preferred)',                          'recovery',        45, false),
  ('weekend', '19:00', 'Dinner',                                                    'nutrition',       60, false),
  ('weekend', '20:00', 'Social / relax / reading',                                  'personal',       120, false),
  ('weekend', '22:00', 'Wind down + sleep supplements',                             'health',          30, true),
  ('weekend', '22:30', 'Lights out',                                                'sleep',            0, true)
;
