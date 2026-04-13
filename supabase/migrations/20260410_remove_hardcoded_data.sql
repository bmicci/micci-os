-- ============================================================
-- Micci OS — Remove Hardcoded Data Migration
-- Creates tables for: bills, burn_rate_items, promo_deadlines,
--   tax_snapshots, wealth_scenarios, financial_settings
-- Seeds all with current hardcoded values
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. bills — recurring monthly bills (replaces BILLS constant)
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  due_date   TEXT NOT NULL,               -- e.g. 'Mar 1', 'Mar 6–22'
  payee      TEXT NOT NULL,
  amount     NUMERIC(10,2) NOT NULL,
  bill_type  TEXT NOT NULL DEFAULT 'other',
  status     TEXT NOT NULL DEFAULT 'manual'
             CHECK (status IN ('autopay', 'paid', 'confirm', 'manual', 'recurring')),
  note       TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. burn_rate_items — current vs survival budget (replaces BURN_RATE)
-- ============================================================
CREATE TABLE IF NOT EXISTS burn_rate_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label          TEXT NOT NULL,
  current_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  survival_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  note           TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. promo_deadlines — 0% promo accounts (replaces PROMOS)
-- ============================================================
CREATE TABLE IF NOT EXISTS promo_deadlines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  balance         NUMERIC(10,2) NOT NULL DEFAULT 0,
  expires         DATE NOT NULL,
  deferred_interest NUMERIC(10,2),         -- risk amount if missed
  account_name    TEXT NOT NULL,
  note            TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paid', 'expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. tax_snapshots — per-year tax summary (replaces TAX_SNAPSHOT)
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year         INTEGER NOT NULL UNIQUE,
  w2_income        NUMERIC(12,2) NOT NULL DEFAULT 0,
  federal_withheld NUMERIC(12,2) NOT NULL DEFAULT 0,
  filing_status    TEXT NOT NULL DEFAULT 'single',
  state            TEXT NOT NULL DEFAULT 'TX',
  scenario_a_label TEXT NOT NULL DEFAULT '',
  scenario_a_owed  NUMERIC(10,2) NOT NULL DEFAULT 0,
  scenario_a_note  TEXT,
  scenario_b_label TEXT NOT NULL DEFAULT '',
  scenario_b_owed  NUMERIC(10,2) NOT NULL DEFAULT 0,
  scenario_b_note  TEXT,
  key_items        JSONB NOT NULL DEFAULT '[]',        -- array of strings
  filing_deadline  TEXT NOT NULL DEFAULT 'Apr 15',
  caveat           TEXT,
  property_tax_details JSONB DEFAULT '[]',             -- [{auth, amount, pct}]
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. wealth_scenarios — projection scenarios (replaces WEALTH_SCENARIOS)
-- ============================================================
CREATE TABLE IF NOT EXISTS wealth_scenarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  annual_savings NUMERIC(12,2) NOT NULL DEFAULT 0,    -- pmt
  return_rate   NUMERIC(5,4) NOT NULL DEFAULT 0.07,   -- e.g. 0.07 = 7%
  color         TEXT NOT NULL DEFAULT '#3b82f6',
  label         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. financial_settings — catch-all JSONB for misc config
--    (replaces ACTION_ITEMS, TOP_ACTIONS, income bridge inputs)
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_promo_deadlines_expires ON promo_deadlines (expires ASC);
CREATE INDEX IF NOT EXISTS idx_bills_active ON bills (is_active);
CREATE INDEX IF NOT EXISTS idx_burn_rate_sort ON burn_rate_items (sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_tax_snapshots_year ON tax_snapshots (tax_year DESC);
CREATE INDEX IF NOT EXISTS idx_financial_settings_key ON financial_settings (key);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE bills              ENABLE ROW LEVEL SECURITY;
ALTER TABLE burn_rate_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_deadlines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_scenarios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage bills"
  ON bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage burn_rate_items"
  ON burn_rate_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage promo_deadlines"
  ON promo_deadlines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage tax_snapshots"
  ON tax_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage wealth_scenarios"
  ON wealth_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage financial_settings"
  ON financial_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Bills
INSERT INTO bills (due_date, payee, amount, bill_type, status, note) VALUES
  ('Feb 28', 'AmEx Platinum — CONFIRM PAID', 501.09, 'Credit Card', 'confirm', 'Both Plan It plans: $230.97 + $270.12'),
  ('Feb 28', 'Citi Best Buy 4802', 50.00, 'Credit Card', 'paid', '✅ Autopay paid $50'),
  ('Mar 1', 'BofA Mortgage', 2486.79, 'Mortgage', 'autopay', '3.375% fixed · auto-debit confirmed'),
  ('Mar 1', 'Transfer to Dad (Wells Fargo)', 1100.00, 'Family', 'recurring', 'Monthly Zelle transfer'),
  ('Mar 1', 'AmEx Personal Loan', 407.01, 'Personal Loan', 'autopay', '7.33% · KEEP'),
  ('Mar 2', 'Citizens Pay 6607 — FINAL', 769.78, 'Installment', 'autopay', '✅ FINAL PAYMENT — account closes'),
  ('Mar 5', 'SoFi Personal Loan', 1464.07, 'Personal Loan', 'autopay', '12.41% · ROLL TO HELOC'),
  ('Mar 5', 'PayPal Credit', 30.00, 'Credit Card', 'manual', '$124.35 balance · promo exp Aug 4'),
  ('Mar 6–22', 'Chase Cards (3 accounts)', 452.77, 'Credit Card', 'autopay', 'CFU $225 + Freedom $132 + Prime $95.77'),
  ('Mar 8', 'Nordstrom (Synchrony)', 40.00, 'Credit Card', 'manual', 'Min only — rolling $653.43 to HELOC'),
  ('Mar 9', 'NFM (Synchrony)', 15.00, 'Installment', 'autopay', '$191.10 balance remaining'),
  ('Mar 10', 'AmEx Gold — Adjusted Balance', 2112.43, 'Credit Card', 'confirm', 'Clears revolving · minimize new Gold charges'),
  ('Mar 10', 'Apple Card (GS Bank)', 104.54, 'Credit Card', 'autopay', 'Feb autopay confirmed'),
  ('Mar 14', 'Citi Diamond Preferred', 124.00, 'Credit Card', 'autopay', '0% BT promo thru Jun 18 2027'),
  ('Mar 20', 'LightStream Loan', 577.47, 'Personal Loan', 'autopay', '5.87% · KEEP'),
  ('Mar 21', 'Virginia FCU Loan (via Dad)', 350.00, 'Loan', 'recurring', '9.25% · ROLL TO HELOC');

-- Burn Rate Items
INSERT INTO burn_rate_items (label, current_amount, survival_amount, note, sort_order) VALUES
  ('BofA Mortgage (fixed)', 2486.79, 2486.79, '3.375% — do not touch', 1),
  ('HELOC Interest (6.85%)', 0, 631.51, 'Interest-only on ~$110.6K draw', 2),
  ('LightStream Auto', 577.47, 577.47, '5.87% — keep', 3),
  ('AmEx Personal Loan', 407.01, 407.01, '7.33% — KEEP (close to HELOC rate)', 4),
  ('Property Tax (escrowed)', 1216.25, 1216.25, '$14,595/yr actual', 5),
  ('Other fixed + promos', 756.31, 756.31, 'Apple, Chase, Citi, PayPal, NFM', 6),
  ('Rolled debt (SoFi/WF/VFCU/AmEx)', 4077.34, 0, '✅ Eliminated by HELOC', 7),
  ('CC variable spend', 5756.00, 2197.00, 'Cuts: dining/shop/fitness/travel', 8);

-- Promo Deadlines
INSERT INTO promo_deadlines (name, balance, expires, deferred_interest, account_name, note, status) VALUES
  ('Citizens Pay 6607', 0, '2026-03-02', 0, 'Citizens Pay', '✅ Final payment made Mar 2. Account closing.', 'paid'),
  ('Citi Best Buy — Promo 1', 1312.44, '2026-06-27', 338.99, 'Citi Best Buy 4802', 'Pay from HELOC or cash before Jun 27', 'active'),
  ('Chase Freedom Unlim — BT1', 8500.00, '2026-07-09', NULL, 'Chase Freedom Unlim (7117)', '⚠️ Largest single promo — plan HELOC draw now', 'active'),
  ('PayPal Credit promo', 124.35, '2026-08-04', NULL, 'PayPal', 'Small — pay from cash. Deferred int applies retroactively.', 'active'),
  ('Chase Freedom — BT1', 7500.00, '2026-08-12', NULL, 'Chase Freedom (9313)', 'Pay from HELOC before Aug 12', 'active'),
  ('Chase Freedom Unlim — BT2', 2600.00, '2026-09-09', NULL, 'Chase Freedom Unlim (7117)', 'Pay from HELOC', 'active'),
  ('Chase Freedom — BT2', 2600.00, '2026-09-12', NULL, 'Chase Freedom (9313)', 'Pay from HELOC', 'active'),
  ('Chase Freedom Unlim — BT3', 7000.00, '2026-10-09', NULL, 'Chase Freedom Unlim (7117)', 'Pay from HELOC', 'active'),
  ('Chase Freedom Unlim — BT4', 1032.25, '2026-12-09', NULL, 'Chase Freedom Unlim (7117)', 'Pay from HELOC', 'active'),
  ('Chase Freedom — BT3', 1064.51, '2026-12-12', NULL, 'Chase Freedom (9313)', 'Pay from HELOC', 'active'),
  ('Citi Best Buy — Promo 2', 917.96, '2026-12-27', 196.33, 'Citi Best Buy 4802', 'Pay $918 from HELOC or cash before Dec 27', 'active'),
  ('Citi Diamond Preferred BT', 12366.00, '2027-06-18', NULL, 'Citi Diamond', '✅ Confirmed — lowest urgency. Pay from HELOC by Jun 2027.', 'active');

-- Tax Snapshots (2025)
INSERT INTO tax_snapshots (
  tax_year, w2_income, federal_withheld, filing_status, state,
  scenario_a_label, scenario_a_owed, scenario_a_note,
  scenario_b_label, scenario_b_owed, scenario_b_note,
  key_items, filing_deadline, caveat,
  property_tax_details
) VALUES (
  2025, 160667.19, 23126.93, 'single', 'TX',
  'No SALT Deduction', 4164.00, 'Standard deduction only · $15,000',
  'With $10K SALT', 1764.00, 'Itemized: mortgage int $17,152 + SALT $10K',
  '[
    "W-2 Box 1: $160,667.19 · Federal withheld: $23,126.93",
    "Mortgage interest deduction: $17,152.41 (itemizes > $15K standard)",
    "Property taxes paid 2025: $14,595.02 — confirm HAF deductibility",
    "Severance income — verify withholding rate (29.65% supplemental)",
    "IRS balance resolution pending (Module 7) — consult CPA",
    "Low income year 2026 — Roth conversion opportunity (deadline Dec 31)"
  ]'::jsonb,
  'Apr 15, 2026',
  'Confirm HAF program impact on property tax deductibility with accountant before filing.',
  '[
    {"auth": "Dallas ISD", "amount": 6211.47, "pct": 42.6},
    {"auth": "City of Dallas", "amount": 4751.84, "pct": 32.6},
    {"auth": "Dallas County", "amount": 1465.40, "pct": 10.0},
    {"auth": "Parkland Hospital", "amount": 1441.60, "pct": 9.9},
    {"auth": "Dallas College", "amount": 724.71, "pct": 5.0}
  ]'::jsonb
);

-- Wealth Scenarios
INSERT INTO wealth_scenarios (name, annual_savings, return_rate, color, label, sort_order) VALUES
  ('Conservative', 62400, 0.07, '#3b82f6', '20% saved · 7% return', 1),
  ('Moderate', 93600, 0.08, '#22c55e', '30% saved · 8% return', 2),
  ('Aggressive', 124800, 0.10, '#f59e0b', '40% saved · 10% return', 3);

-- Financial Settings (JSONB catch-all)
INSERT INTO financial_settings (key, value) VALUES
  ('action_items', '[
    {"priority": "red", "title": "HELOC closing — confirm Texas Credit Union timeline", "detail": "Must close before March 19. VVOE required. Do NOT resign before closing."},
    {"priority": "red", "title": "Sign Release Agreement — do NOT rush", "detail": "45-day window from notice. Get employment attorney first."},
    {"priority": "amber", "title": "Life insurance — convert/port by April 19", "detail": "31-day hard deadline from exit date. Call HR immediately after March 19."},
    {"priority": "amber", "title": "COBRA — elect within 60 days of March 31", "detail": "Healthcare ends March 31. Compare COBRA vs marketplace before electing."},
    {"priority": "amber", "title": "Confirm personal days payout with HR", "detail": "24 hrs personal days — Texas has no law requiring payout. Confirm JPMC policy."},
    {"priority": "blue", "title": "Chase Freedom cards — verify all balances are 0% promo", "detail": "Statement balances ($22,531 + $13,269) need promo confirmation. Pull statements."},
    {"priority": "blue", "title": "Minimize AmEx Gold new charges until HELOC closes", "detail": "Revolving cleared by March payment. New charges accrue at 27.49% until HELOC rolls."}
  ]'::jsonb),
  ('top_actions', '[
    {"icon": "🔴", "text": "Cancel Credit Sesame Premium — use Chase/AmEx free monitoring instead", "save": "$14.28/mo"},
    {"icon": "🔴", "text": "Cancel Zips Car Wash membership", "save": "$33.38/mo"},
    {"icon": "🔴", "text": "Cancel Paramount+ — re-subscribe for specific shows only", "save": "$14.06/mo"},
    {"icon": "🟡", "text": "Investigate Paddle.net charge — check email for receipts", "save": "$12.88/mo"},
    {"icon": "🟡", "text": "Downgrade Canva to free tier at canva.com", "save": "$15.00/mo"}
  ]'::jsonb),
  ('income_bridge', '{
    "liquid_cash": 8000,
    "march_paychecks": 6250,
    "severance_estimate": 25000,
    "family_bridge": 2000,
    "consulting_monthly_net": 2500,
    "target_salary": 240000,
    "target_total_comp": 312000,
    "monthly_outflow": 7234,
    "new_job_monthly_net": 13670
  }'::jsonb),
  ('property_tax', '{
    "address": "2214 N Carroll Ave, Dallas TX 75204",
    "assessed_value": 850000,
    "protest_target": 750000,
    "annual_total": 14595.02,
    "monthly_budget": 1216.25,
    "protest_savings_estimate": 1700,
    "protest_deadline": "2026-05-15",
    "taxes_paid": true
  }'::jsonb),
  ('spending_summary', '{
    "total_annual_cc": 76052,
    "total_monthly_avg": 6338,
    "total_transactions": 1615,
    "top_category": "Food & Dining",
    "top_category_amount": 27441,
    "top_category_pct": 36,
    "survival_monthly": 2500,
    "cards_analyzed": "AmEx Gold + Plat + Chase 9313"
  }'::jsonb),
  ('subscription_summary', '{
    "total_recurring_merchants": 102,
    "keep_total_monthly": 36.29,
    "keep_count": 3
  }'::jsonb);
