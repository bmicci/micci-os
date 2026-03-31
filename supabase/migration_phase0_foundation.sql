-- ============================================================
-- Micci OS — Phase 0 Foundation Migration
-- New tables: financial_deadlines, paycheck_settings, financial_scenarios
-- Run in Supabase SQL Editor after migration_session_c.sql
-- ============================================================

-- ============================================================
-- 1. financial_deadlines
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_deadlines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  deadline_date DATE NOT NULL,
  urgency      TEXT NOT NULL DEFAULT 'medium'
               CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
  module       TEXT,
  impact_if_missed TEXT,
  status       TEXT NOT NULL DEFAULT 'upcoming'
               CHECK (status IN ('upcoming', 'completed', 'missed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed deadlines
DELETE FROM financial_deadlines;

INSERT INTO financial_deadlines (title, description, deadline_date, urgency, module, impact_if_missed, status) VALUES
  (
    'HELOC Close',
    'Must close Loan Depot HELOC while still employed at JPMC. Employment verification required by lender.',
    '2026-03-19',
    'critical',
    'Debt & Mortgage',
    'Cannot roll $66,667 of high-rate debt — lose ~$400/mo in interest savings. 12.41% SoFi and AmEx charges continue.',
    'upcoming'
  ),
  (
    'Last Day at JPMC',
    'Voluntary separation date — March 19, 2026. After this date, income verification for any new credit applications will fail.',
    '2026-03-19',
    'critical',
    'Tax & Income',
    'Employment-based financial products become unavailable. Health insurance ends — need COBRA or marketplace plan.',
    'upcoming'
  ),
  (
    'Life Insurance Port Deadline',
    'JPMC group life insurance portability window — must apply within 31 days of separation to convert without new underwriting.',
    '2026-04-19',
    'high',
    'Estate Planning',
    'Lose ability to port group life coverage without medical underwriting. Higher premiums or potential denial if health issues surface.',
    'upcoming'
  ),
  (
    'DCAD Property Tax Protest Deadline',
    'File informal review at ifile.dallascad.org to dispute $850,000 assessed value of 2214 N Carroll Ave, Dallas TX 75204.',
    '2026-05-15',
    'high',
    'Property Tax Dispute',
    'Cannot contest 2026 property tax assessment. At $850K assessment, estimated $17,000+ in annual property taxes.',
    'upcoming'
  ),
  (
    'Best Buy / Citi 0% Promo Expires',
    'Best Buy Citi card (4802) promo expires. $1,312 balance — if not paid by deadline, $339 in deferred interest backdates to purchase date.',
    '2026-06-27',
    'high',
    'Debt & Mortgage',
    '$339 in retroactive deferred interest hits. Pay from HELOC availability by June 2026.',
    'upcoming'
  ),
  (
    'Chase 0% Promos Expire (Staggered)',
    'Multiple Chase purchase buckets on CFU (7117) and CF (4628) expire throughout July–December 2026. Total: ~$36,427.',
    '2026-12-31',
    'medium',
    'Debt & Mortgage',
    'Standard APR (~27%) kicks in on any remaining balances. Roll each bucket to HELOC as it expires.',
    'upcoming'
  ),
  (
    'Roth Conversion Window Closes',
    '2026 is a uniquely low-income year (partial W-2 + potential gap). Optimal window to convert Traditional IRA to Roth at lower tax rates.',
    '2026-12-31',
    'medium',
    '401k & Investments',
    'Miss the window to convert at 22% bracket instead of 32-35% once new income starts. Could cost $10K+ in additional lifetime taxes.',
    'upcoming'
  ),
  (
    'Citi Diamond 0% Promo Expires',
    'Citi Diamond Preferred (4205) balance transfer promo expires. Current balance: ~$12,476.',
    '2027-06-18',
    'low',
    'Debt & Mortgage',
    'Citi Diamond reverts to ~27.49% APR on remaining balance. Longest runway of all promos — pay from HELOC before expiry.',
    'upcoming'
  );

-- ============================================================
-- 2. paycheck_settings
-- Stores simulator inputs per user (single row per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS paycheck_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary               NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus_percent        NUMERIC(5,2) NOT NULL DEFAULT 0,
  pay_frequency        INTEGER NOT NULL DEFAULT 26,
  filing_status        TEXT NOT NULL DEFAULT 'single',
  state                TEXT NOT NULL DEFAULT 'TX',
  tax_method           TEXT NOT NULL DEFAULT 'bracket_calc',
  manual_effective_rate NUMERIC(5,2) NOT NULL DEFAULT 22,
  contribution_401k    NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_match_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  employer_match_cap   NUMERIC(5,2) NOT NULL DEFAULT 0,
  hsa_contribution     NUMERIC(12,2) NOT NULL DEFAULT 0,
  health_premium       NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_pre_tax        NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. financial_scenarios
-- Named what-if scenario snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_scenarios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  is_baseline      BOOLEAN NOT NULL DEFAULT false,
  paycheck_inputs  JSONB NOT NULL DEFAULT '{}',
  heloc_inputs     JSONB NOT NULL DEFAULT '{}',
  cashflow_inputs  JSONB NOT NULL DEFAULT '{}',
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_financial_deadlines_date
  ON financial_deadlines (deadline_date ASC);

CREATE INDEX IF NOT EXISTS idx_financial_deadlines_status
  ON financial_deadlines (status);

CREATE INDEX IF NOT EXISTS idx_financial_scenarios_baseline
  ON financial_scenarios (is_baseline);

-- ============================================================
-- 5. RLS (no auth required for service role reads, but enable for future)
-- ============================================================
ALTER TABLE financial_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE paycheck_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_scenarios ENABLE ROW LEVEL SECURITY;

-- Policies: any authenticated user (single-user app)
CREATE POLICY "Auth users manage financial_deadlines"
  ON financial_deadlines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth users manage paycheck_settings"
  ON paycheck_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth users manage financial_scenarios"
  ON financial_scenarios FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
