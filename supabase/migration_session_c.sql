-- ============================================================
-- Micci OS — Session C Migration
-- Financial Dashboard schema additions + real data
-- Run in Supabase SQL Editor after schema.sql + seed.sql
-- ============================================================

-- 1. Add module_number column to financial_modules
ALTER TABLE financial_modules ADD COLUMN IF NOT EXISTS module_number INTEGER;

-- 2. Add recommendation column to debt_accounts (strategy label per account)
ALTER TABLE debt_accounts ADD COLUMN IF NOT EXISTS recommendation TEXT;

-- ============================================================
-- 3. Replace financial modules with the 9 spec modules
-- ============================================================
DELETE FROM financial_modules;

INSERT INTO financial_modules (module_number, name, category, status, progress, description) VALUES
  (1, 'Spending Analysis',    'budgeting',   'complete',    100, 'Full analysis of 2025 spending patterns across all categories'),
  (2, 'Subscription Audit',   'budgeting',   'complete',    100, 'All subscriptions audited — cancel/review/keep decisions finalized'),
  (3, 'Tax & Income',         'taxes',       'in_progress',  85, '2025 W-2 income analysis, deduction scenarios modeled — accountant review pending'),
  (4, 'Debt & Mortgage',      'debt',        'in_progress',  90, 'Full debt inventory complete, HELOC strategy mapped, payoff sequence set'),
  (5, '401k & Investments',   'investments', 'in_progress',  40, 'JPMC 401k rollover planned — IRA provider selected (Empower), paperwork pending'),
  (6, 'Property Tax Dispute', 'taxes',       'in_progress',  50, 'DCAD protest prepared for $850K assessment — file by May 15, 2026'),
  (7, 'IRS Notices',          'taxes',       'not_started',   0, 'Review outstanding IRS correspondence and resolve any open items'),
  (8, 'Savings & Accounts',   'banking',     'not_started',   0, 'HYSA setup, emergency fund target, account consolidation and optimization'),
  (9, 'Estate Planning',      'legal',       'not_started',   0, 'Will, POA, beneficiary designations — first priority post-employment');

-- ============================================================
-- 4. Replace debt accounts with actual financial data
-- ============================================================
DELETE FROM debt_accounts;

INSERT INTO debt_accounts (name, account_type, balance, interest_rate, minimum_payment, recommendation, status, notes) VALUES
  ('BofA Mortgage',         'mortgage',    498903.00,  3.375,  2485.00, 'KEEP - NEVER PAY EARLY', 'active', 'Primary residence — 3.375% fixed, maximize mortgage interest deduction, never pay early'),
  ('SoFi Personal Loan',    'loan',         56958.00, 12.41,   1150.00, 'ROLL TO HELOC',           'active', 'Highest rate debt — roll to HELOC @ 6.85% as first priority once HELOC closes'),
  ('LightStream',           'loan',         44018.00,  5.87,    745.00, 'KEEP',                    'active', 'Below HELOC rate — do not roll, maintain payments as-is'),
  ('Chase CFU 0% Promo',    'credit_card',  22531.00,  0.00,    450.00, 'HOLD - 0% PROMO',         'active', 'Multiple purchase buckets expiring Jul–Dec 2026 — pay from HELOC as each expires'),
  ('Dad (Virginia FCU)',    'other',        21420.00,  0.00,   1100.00, 'FAMILY',                  'active', '0% family loan — $1,100/mo, priority relationship, maintain all payments'),
  ('Citi Diamond 0% Promo', 'credit_card',  12476.00,  0.00,    250.00, 'HOLD - 0% PROMO',         'active', 'Longest runway — 0% expires Jun 18 2027, pay from HELOC before expiry'),
  ('AmEx Personal Loan',    'loan',          3943.00,  7.33,    125.00, 'KEEP',                    'active', 'Moderate rate, low balance — pay normally, no need to roll'),
  ('Best Buy 0% Promo',     'credit_card',   1312.00,  0.00,     55.00, 'HOLD - 0% PROMO',         'active', 'Expires Jun 27 2026 — $339 deferred interest if missed, must pay by Jun 2026');

-- ============================================================
-- Resulting totals (for reference):
--   Total Debt:           $661,561
--   Monthly Min Payments: $6,360
--   Net Worth (est.):     $850,000 - $661,561 = $188,439
-- ============================================================
