-- ============================================================
-- Micci OS — Seed Data
-- Run AFTER schema.sql in the Supabase SQL editor
-- ============================================================

-- ============================================================
-- FINANCIAL MODULES (9 modules)
-- ============================================================

INSERT INTO financial_modules (name, category, status, progress, description, details) VALUES
  ('Texas CU HELOC', 'heloc', 'active', 60,
   'HELOC application in progress — Texas CU @ 6.85% variable',
   '{"lender":"Texas Credit Union","rate":6.85,"type":"variable","amount_requested":50000,"status":"application_submitted"}'),

  ('BofA Legal Dispute', 'legal', 'active', 30,
   'Bank of America legal dispute — Hyatt legal plan engaged',
   '{"type":"legal_dispute","institution":"Bank of America","attorney_engaged":true,"hyatt_plan":true}'),

  ('JPMC 401k Rollover', 'retirement', 'pending', 10,
   'Roll 401k from JPMorganChase to IRA upon separation March 19',
   '{"from":"JPMC 401k","to":"IRA","target_date":"2026-03-19","provider":"Empower","forfeiture_risk":true}'),

  ('COBRA vs Marketplace', 'benefits', 'active', 25,
   'Evaluate COBRA continuation vs ACA marketplace plan post March 19',
   '{"deadline":"2026-03-19","cobra_deadline_days":60,"decision_pending":true}'),

  ('Unemployment Filing', 'income', 'pending', 5,
   'File for Texas unemployment on or after March 19',
   '{"state":"Texas","eligible_date":"2026-03-19","weekly_benefit_estimate":null}'),

  ('MRA/FSA Spend-Down', 'benefits', 'active', 40,
   'Spend remaining MRA and FSA balances before JPMC separation',
   '{"deadline":"2026-03-19","mra_balance":null,"fsa_balance":null}'),

  ('Survival Budget', 'budgeting', 'active', 55,
   'Maintain survival budget during job search phase',
   '{"phase":"survival","target_monthly_spend":null,"job_search_runway_months":3}'),

  ('Job Search Pipeline', 'career', 'active', 20,
   '40+ applications by March 19 — Goldman Sachs, RealPage and others in pipeline',
   '{"target_applications":40,"current_applications":8,"active_interviews":["Goldman Sachs","RealPage"],"target_date":"2026-03-19"}'),

  ('Net Worth Tracking', 'wealth', 'active', 50,
   'Monthly net worth snapshot across all accounts',
   '{"tracking_frequency":"monthly","include_heloc":true,"include_retirement":true}')
;

-- ============================================================
-- SUBSCRIPTIONS (25 subs)
-- ============================================================

INSERT INTO subscriptions (name, amount, billing_cycle, category, action, notes, is_active) VALUES
  -- Cancel (6)
  ('LinkedIn Premium',         39.99,  'monthly',  'career',         'cancel',    'Downgrade to free after active job search phase',  true),
  ('Hulu',                     17.99,  'monthly',  'entertainment',  'cancel',    'Rarely used — cut during survival phase',          true),
  ('Peacock',                   7.99,  'monthly',  'entertainment',  'cancel',    'Minimal usage',                                    true),
  ('Audible',                  14.95,  'monthly',  'education',      'cancel',    'Switch to library app',                            true),
  ('Xbox Game Pass',           14.99,  'monthly',  'entertainment',  'cancel',    'Not playing — cancel immediately',                 true),
  ('Adobe Creative Cloud',     54.99,  'monthly',  'software',       'cancel',    'Downgrade to free tools',                          true),

  -- Review (9)
  ('Netflix',                  22.99,  'monthly',  'entertainment',  'review',    'Consider downgrade to standard plan',              true),
  ('Spotify',                  10.99,  'monthly',  'entertainment',  'review',    'Keep if essential, else cancel',                   true),
  ('iCloud Storage',            2.99,  'monthly',  'storage',        'review',    'Audit what is stored',                             true),
  ('Amazon Prime',             14.99,  'monthly',  'shopping',       'review',    'Evaluate ordering frequency',                      true),
  ('ClassPass',                49.00,  'monthly',  'fitness',        'review',    'Keep if 2x/week use maintained',                   true),
  ('ChatGPT Plus',             20.00,  'monthly',  'ai_tools',       'review',    'Evaluate vs Claude subscription',                  true),
  ('GitHub Copilot',           10.00,  'monthly',  'development',    'review',    'Keep if actively coding',                          true),
  ('Notion',                   16.00,  'monthly',  'productivity',   'review',    'Consolidate into micci-os',                        true),
  ('Vercel Pro',               20.00,  'monthly',  'development',    'review',    'Keep for micci-os deployment',                     true),

  -- Keep (3)
  ('Apple One',                21.95,  'monthly',  'entertainment',  'keep',      'Bundles Apple TV, Music, Arcade — good value',     true),
  ('1Password',                 2.99,  'monthly',  'security',       'keep',      'Essential password manager',                       true),
  ('Claude Pro',               20.00,  'monthly',  'ai_tools',       'keep',      'Primary AI assistant — essential for dev work',    true),

  -- Essential bills (7)
  ('Rent',                   2800.00,  'monthly',  'housing',        'essential', 'Fixed monthly',                                    true),
  ('Electricity',              120.00, 'monthly',  'utilities',      'essential', 'Varies seasonally',                                true),
  ('Internet',                  89.00, 'monthly',  'utilities',      'essential', 'Comcast — no alternatives in area',                true),
  ('Car Insurance',            180.00, 'monthly',  'insurance',      'essential', 'Full coverage',                                    true),
  ('Phone',                    85.00,  'monthly',  'utilities',      'essential', 'T-Mobile',                                         true),
  ('Health Insurance (COBRA)', 650.00, 'monthly',  'insurance',      'essential', 'Estimated post-JPMC COBRA cost',                   false),
  ('Gym Membership',            45.00, 'monthly',  'fitness',        'essential', 'Primary gym for heavy lifts',                      true)
;

-- ============================================================
-- DEBT ACCOUNTS (15 accounts)
-- ============================================================

INSERT INTO debt_accounts (name, account_type, balance, interest_rate, minimum_payment, due_day, status, notes) VALUES
  ('Chase Sapphire Reserve',     'credit_card',     4200.00,  27.24,  95.00,   21, 'active',      'Travel card — pay monthly if possible'),
  ('Chase Freedom Unlimited',    'credit_card',     1850.00,  24.99,  45.00,   15, 'active',      'Cash back card'),
  ('Amex Gold',                  'credit_card',     2100.00,  29.99,  52.00,   27, 'active',      'Charge card — balance due monthly'),
  ('Citi Double Cash',           'credit_card',      750.00,  22.49,  25.00,   10, 'active',      'Low balance — pay off first'),
  ('Discover It',                'credit_card',      320.00,  19.99,  18.00,    5, 'active',      'Smallest balance — snowball target'),
  ('Capital One Venture',        'credit_card',     3100.00,  26.99,  78.00,   19, 'active',      'Travel rewards'),
  ('Bank of America Cash Rewards','credit_card',    1200.00,  21.99,  32.00,   12, 'negotiating', 'In legal dispute — see BofA module'),
  ('Apple Card',                 'credit_card',      680.00,  19.99,  20.00,   28, 'active',      'Used for Apple ecosystem'),
  ('Home Depot Credit',          'credit_card',      450.00,  29.99,  18.00,   22, 'active',      'Store card — high rate, target soon'),
  ('Best Buy Visa',              'credit_card',      290.00,  27.99,  15.00,   18, 'active',      'Electronics purchases'),
  ('Texas CU HELOC',             'heloc',               0.00,   6.85,   0.00,    1, 'active',      'Application in progress — $50k limit pending'),
  ('Car Loan — Toyota',          'loan',           12400.00,   4.99, 380.00,    8, 'active',      '2021 Camry — 34 months remaining'),
  ('Personal Loan — SoFi',       'loan',            8500.00,  11.49, 285.00,   17, 'active',      'Debt consolidation loan 2024'),
  ('Student Loan — Fed',         'loan',           24000.00,   5.05, 275.00,   20, 'active',      'Income-driven repayment eligible'),
  ('Student Loan — Private',     'loan',            9200.00,   7.25, 195.00,   20, 'active',      'Navient — refinance target')
;

-- ============================================================
-- BUDGET CATEGORIES (10 categories)
-- ============================================================

INSERT INTO budget_categories (name, actual_2025, survival_target, current_month, notes) VALUES
  ('Housing',        2800.00, 2800.00, 2800.00, 'Fixed rent — no flex'),
  ('Food & Groceries', 620.00, 350.00, 290.00, 'Cook at home, cut DoorDash'),
  ('Transportation', 480.00,  300.00,  260.00,  'Gas + car insurance + occasional Uber'),
  ('Utilities',       295.00, 250.00,  240.00,  'Electricity + internet + phone'),
  ('Health & Medical', 180.00, 100.00,  90.00,  'Copays + prescriptions; COBRA cost separate'),
  ('Fitness',         250.00, 180.00,  160.00,  'Gym + ClassPass; reduce if needed'),
  ('Entertainment',   310.00, 100.00,   80.00,  'Cut aggressively — streaming audits'),
  ('Subscriptions',   420.00, 200.00,  195.00,  'Post-cancel audit brings this down'),
  ('Personal Care',   120.00,  80.00,   75.00,  'Haircut + skincare basics'),
  ('Misc / Buffer',   200.00, 100.00,   50.00,  'Unexpected expenses buffer')
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
-- GOALS — sample goals per category (adjust to taste)
-- ============================================================

-- Career & Income
WITH cat AS (SELECT id FROM goal_categories WHERE name = 'Career & Income')
INSERT INTO goals (category_id, title, priority, status, target_date) VALUES
  ((SELECT id FROM cat), 'Submit 40+ job applications by March 19', 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Land 5+ recruiter conversations before March 19', 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Ace Goldman Sachs interview process', 1, 'active', NULL),
  ((SELECT id FROM cat), 'Ace RealPage interview process', 1, 'active', NULL),
  ((SELECT id FROM cat), 'Request 3–5 LinkedIn recommendations from JPMC colleagues', 2, 'active', '2026-03-15'),
  ((SELECT id FROM cat), 'Download all JPMC documents (pay stubs, W-2s, reviews, 401k)', 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'File for Texas unemployment on March 19 or 20', 2, 'active', '2026-03-20'),
  ((SELECT id FROM cat), 'Complete all JPMC certifications before last day', 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Update LinkedIn profile and resume for 2026', 3, 'active', '2026-03-01');

-- Financial
WITH cat AS (SELECT id FROM goal_categories WHERE name = 'Financial')
INSERT INTO goals (category_id, title, priority, status, target_date) VALUES
  ((SELECT id FROM cat), 'Secure Texas CU HELOC at 6.85%', 1, 'active', '2026-04-01'),
  ((SELECT id FROM cat), 'Resolve BofA legal dispute through Hyatt Legal Plan', 1, 'active', NULL),
  ((SELECT id FROM cat), 'Roll JPMC 401k to IRA (Empower) by April 30', 2, 'active', '2026-04-30'),
  ((SELECT id FROM cat), 'Make COBRA vs marketplace decision by March 19', 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Spend all MRA/FSA balances before March 19', 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Cancel 6 subscriptions this week', 2, 'active', '2026-03-07'),
  ((SELECT id FROM cat), 'Audit and cut budget to survival target levels', 2, 'active', '2026-03-15'),
  ((SELECT id FROM cat), 'Pay off Discover It card ($320) first — snowball', 3, 'active', '2026-04-30');

-- Health & Fitness
WITH cat AS (SELECT id FROM goal_categories WHERE name = 'Health & Fitness')
INSERT INTO goals (category_id, title, priority, status, target_date) VALUES
  ((SELECT id FROM cat), 'Maintain heavy lift schedule 5x/week Mon–Fri', 1, 'active', NULL),
  ((SELECT id FROM cat), 'Daily outdoor walk minimum 30 minutes', 1, 'active', NULL),
  ((SELECT id FROM cat), 'ClassPass 2x/week (Tue + Thu 5–6 PM)', 2, 'active', NULL),
  ((SELECT id FROM cat), 'Schedule physical + blood work before March 19', 1, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Schedule dentist appointment before March 19', 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Schedule dermatology appointment before March 19', 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Schedule eye exam before March 19', 2, 'active', '2026-03-19'),
  ((SELECT id FROM cat), 'Refill all prescriptions to 90-day supply before March 19', 1, 'active', '2026-03-19');

-- Wellness & Recovery
WITH cat AS (SELECT id FROM goal_categories WHERE name = 'Wellness & Recovery')
INSERT INTO goals (category_id, title, priority, status, target_date) VALUES
  ((SELECT id FROM cat), 'Lock in 8 hours sleep nightly (11 PM → 7 AM)', 1, 'active', NULL),
  ((SELECT id FROM cat), 'Weekly massage 1–2x (weekends)', 2, 'active', NULL),
  ((SELECT id FROM cat), 'IR sauna 1x/week Saturday PM', 2, 'active', NULL),
  ((SELECT id FROM cat), 'Daily morning stretch (non-negotiable)', 1, 'active', NULL),
  ((SELECT id FROM cat), 'Meditation + journaling each morning', 3, 'active', NULL);

-- ============================================================
-- SUPPLEMENTS (40 supplements)
-- ============================================================

INSERT INTO supplements (name, dosage, frequency, timing, category, notes, is_active) VALUES
  -- Core stack
  ('Vitamin D3',          '5000 IU',     'daily',    'morning with food', 'vitamins',     'With K2 for optimal absorption',            true),
  ('Vitamin K2 (MK-7)',   '200 mcg',     'daily',    'morning with food', 'vitamins',     'Paired with D3',                            true),
  ('Magnesium Glycinate', '400 mg',      'daily',    'bedtime',           'minerals',     'Sleep quality + muscle recovery',           true),
  ('Omega-3 Fish Oil',    '3g EPA/DHA',  'daily',    'with meals',        'essential',    'Anti-inflammatory, cardiovascular',         true),
  ('Creatine Monohydrate','5g',           'daily',    'post-workout',      'performance',  'Load phase complete — maintenance dose',    true),
  ('Zinc Picolinate',     '30 mg',        'daily',    'bedtime',           'minerals',     'Testosterone support, sleep, immunity',     true),
  ('Ashwagandha (KSM-66)','600 mg',       'daily',    'evening',           'adaptogens',   'Cortisol reduction, stress resilience',     true),
  ('Rhodiola Rosea',      '500 mg',       'daily',    'morning, fasted',   'adaptogens',   'Energy + cognitive performance',            true),
  ('CoQ10 (Ubiquinol)',   '200 mg',       'daily',    'with fat meal',     'mitochondrial','Cellular energy, TRT support',             true),
  ('NAC (N-Acetyl Cysteine)','600 mg',   'daily',    'with meals',        'antioxidants', 'Liver support, glutathione precursor',      true),

  -- Gut & digestion
  ('Probiotic (50B CFU)', '1 capsule',   'daily',    'morning, fasted',   'gut_health',   'Multi-strain, rotate brands quarterly',     true),
  ('Digestive Enzymes',   '1 capsule',   'with meals','before meals',     'gut_health',   'With heavy meals',                          true),
  ('Berberine',           '500 mg',       '3x daily', 'with meals',        'metabolic',    'Blood sugar regulation, AMPK activation',  true),

  -- Cognitive
  ('Alpha-GPC',           '300 mg',       'daily',    'morning',           'nootropics',   'Choline source, cognitive performance',     true),
  ('Lion''s Mane',        '1000 mg',      'daily',    'morning',           'nootropics',   'NGF stimulation, focus, memory',            true),
  ('Bacopa Monnieri',     '300 mg',       'daily',    'with food',         'nootropics',   'Memory consolidation — takes 4–6 weeks',    true),

  -- Sleep stack
  ('Melatonin',           '0.5 mg',       'nightly',  '30 min before bed', 'sleep',        'Low dose — avoid high-dose dependency',     true),
  ('L-Theanine',          '200 mg',       'nightly',  'bedtime',           'sleep',        'Wind down, reduce racing thoughts',         true),
  ('GABA',                '750 mg',       'nightly',  'bedtime',           'sleep',        'Deep sleep initiation',                     true),

  -- Hormone support (non-TRT)
  ('DHEA',                '25 mg',        'daily',    'morning with food', 'hormones',     'Precursor to androgens/estrogens',          true),
  ('Pregnenolone',        '50 mg',        'daily',    'morning',           'hormones',     'Neurosteroid — mood and memory support',    true),
  ('Boron',               '10 mg',        'daily',    'with food',         'hormones',     'Free testosterone optimization',            true),
  ('Tongkat Ali',         '400 mg',       'daily',    'morning',           'hormones',     'LH/FSH stimulation, testosterone support', true),

  -- Recovery
  ('Tart Cherry Extract', '500 mg',       'daily',    'post-workout',      'recovery',     'Reduces muscle soreness, anti-inflammatory',true),
  ('Collagen Peptides',   '15g',           'daily',    'morning in coffee', 'recovery',     'Joint health + skin',                       true),
  ('Glutamine',           '5g',            'daily',    'post-workout',      'recovery',     'Gut lining + muscle preservation',          true),

  -- Cardiovascular
  ('Bergamot Extract',    '500 mg',       'daily',    'with food',         'cardiovascular','LDL reduction, cardiovascular health',     true),
  ('Red Yeast Rice',      '600 mg',       'daily',    'evening',           'cardiovascular','Lipid support — monitor liver enzymes',    true),
  ('Niacin (Flush-free)', '500 mg',       'daily',    'with food',         'cardiovascular','HDL support, vasodilation',                true),

  -- Energy & metabolism
  ('B-Complex (methylated)','1 capsule', 'daily',    'morning with food', 'vitamins',     'MTHFR support, energy metabolism',          true),
  ('Vitamin C',           '1000 mg',      'daily',    'morning',           'vitamins',     'Immune, collagen synthesis',                true),
  ('Iodine (Lugol''s 2%)', '4 drops',    'daily',    'in water, morning', 'thyroid',      'Thyroid optimization',                      true),
  ('Selenium',            '200 mcg',      'daily',    'with food',         'thyroid',      'Thyroid + antioxidant',                     true),

  -- Occasional / situational
  ('NMN',                 '500 mg',       'daily',    'morning, fasted',   'longevity',    'NAD+ precursor — longevity protocol',       true),
  ('Resveratrol',         '500 mg',       'daily',    'with fat meal',     'longevity',    'Sirtuin activation, paired with NMN',       true),
  ('Fisetin',             '500 mg',       'monthly',  '2-day pulse monthly','longevity',   'Senolytic — pulse dosing protocol',         true),
  ('Quercetin',           '1000 mg',      'monthly',  '2-day pulse monthly','longevity',   'Senolytic + antihistamine — pulse dosing',  true),
  ('Metformin',           '500 mg',       'daily',    'with dinner',       'metabolic',    'Off-label longevity — consult prescriber',  false),
  ('Lithium Orotate',     '5 mg',         'daily',    'evening',           'mental_health','Neuroprotective, mood stability micro-dose',true),
  ('Apigenin',            '50 mg',        'nightly',  'bedtime',           'sleep',        'CD38 inhibitor + mild anxiolytic',          true)
;

-- ============================================================
-- HORMONE PROTOCOLS (TRT)
-- ============================================================

INSERT INTO hormone_protocols (name, substance, dosage, day_of_week, time_of_day, notes, is_active) VALUES
  ('TRT — Testosterone Cypionate', 'Testosterone Cypionate',
   '100mg/0.5mL', ARRAY['Monday'], 'morning',
   'Subcutaneous injection. Rotate injection sites. Track in protocol log.',
   true),

  ('TRT — hCG',  'Human Chorionic Gonadotropin (hCG)',
   '500 IU',  ARRAY['Thursday','Sunday'], 'morning',
   'Maintain testicular function and size. Refrigerate hCG.',
   true),

  ('TRT — Anastrozole (AI)', 'Anastrozole',
   '1 mg', ARRAY['Thursday'], 'with food',
   'Aromatase inhibitor — monitor E2 levels. Adjust dose based on bloodwork every 6 weeks.',
   true)
;

-- ============================================================
-- DAILY SCHEDULE TEMPLATE
-- ============================================================

INSERT INTO daily_schedule (day_type, time_slot, activity, category, duration_minutes, is_fixed) VALUES
  ('weekday', '06:00', 'Wake up — no alarm, natural light', 'morning_routine', 15, true),
  ('weekday', '06:15', 'Sunlight exposure (5–10 min outside)', 'wellness', 10, true),
  ('weekday', '06:25', 'Hydrate — 32 oz water + electrolytes', 'health', 5, true),
  ('weekday', '06:30', 'Morning supplements stack', 'health', 5, true),
  ('weekday', '06:35', 'Meditation (Waking Up app, 10–15 min)', 'mental_health', 15, true),
  ('weekday', '06:50', 'Journaling — 3 priorities for the day', 'planning', 15, true),
  ('weekday', '07:05', 'Morning stretch — full body (20 min)', 'fitness', 20, true),
  ('weekday', '07:25', 'Shower + grooming + skincare', 'personal_care', 25, false),
  ('weekday', '07:50', 'Breakfast — high protein + fat', 'nutrition', 20, false),
  ('weekday', '08:10', 'Deep work block 1 — job search (applications, outreach)', 'job_search', 90, false),
  ('weekday', '09:40', 'Break — walk + rehydrate', 'wellness', 15, false),
  ('weekday', '09:55', 'Deep work block 2 — project / coding / interviews', 'deep_work', 90, false),
  ('weekday', '11:25', 'Admin block — email, scheduling, tasks (max 45 min)', 'admin', 45, false),
  ('weekday', '12:10', 'Lunch + rest', 'nutrition', 45, false),
  ('weekday', '12:55', 'Gym — heavy compound lifts (Mon–Fri splits)', 'fitness', 75, true),
  ('weekday', '14:10', 'Post-workout: protein shake + creatine + tart cherry', 'nutrition', 10, false),
  ('weekday', '14:20', 'Outdoor walk — minimum 30 minutes', 'fitness', 45, true),
  ('weekday', '15:05', 'Deep work block 3 — optional (networking / follow-ups)', 'job_search', 60, false),
  ('weekday', '16:05', 'Review tomorrow + plan next day (15 min)', 'planning', 15, false),
  ('weekday', '16:20', 'Free time / reading / hobbies', 'personal', 90, false),
  ('weekday', '17:50', 'Dinner prep + dinner', 'nutrition', 60, false),
  ('weekday', '18:50', 'Evening wind-down — no screens after 10 PM', 'wellness', 30, false),
  ('weekday', '21:30', 'Evening skincare + sleep supplements', 'health', 15, true),
  ('weekday', '21:45', 'Read (physical book) or journal', 'mental_health', 45, false),
  ('weekday', '22:30', 'Lights out — phones out of bedroom', 'sleep', 0, true),

  -- Weekend
  ('weekend', '07:00', 'Wake up (sleep in 1 hour)', 'morning_routine', 20, false),
  ('weekend', '07:20', 'Sunlight + hydrate + supplements', 'health', 15, true),
  ('weekend', '07:35', 'Extended stretch — 30–45 min', 'fitness', 40, true),
  ('weekend', '08:15', 'Meditation + long-form journaling / weekly review', 'mental_health', 45, false),
  ('weekend', '09:00', 'Gym — upper body or full body', 'fitness', 75, false),
  ('weekend', '10:15', 'Brunch — larger meal', 'nutrition', 45, false),
  ('weekend', '11:00', 'Massage (1–2x weekend)', 'recovery', 60, false),
  ('weekend', '13:00', 'Free time — errands, social, admin', 'personal', 120, false),
  ('weekend', '15:00', 'Outdoor cardio or extended walk', 'fitness', 60, false),
  ('weekend', '16:00', 'IR sauna (Saturday PM preferred)', 'recovery', 45, false),
  ('weekend', '19:00', 'Dinner', 'nutrition', 60, false),
  ('weekend', '20:00', 'Social / relax / reading', 'personal', 120, false),
  ('weekend', '22:00', 'Wind down + sleep supplements', 'health', 30, true),
  ('weekend', '22:30', 'Lights out', 'sleep', 0, true)
;
