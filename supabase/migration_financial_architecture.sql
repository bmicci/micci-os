-- ============================================================
-- Micci OS — Financial Architecture Migration
-- Adds: transactions, balance_snapshots, deadlines,
--       promo_deadlines tables + unique constraints
--
-- Run in Supabase SQL Editor AFTER schema.sql + seed.sql
-- Safe to re-run (all statements are idempotent)
-- ============================================================

-- ── Fix upsert: add unique constraints ───────────────────────────────────

ALTER TABLE debt_accounts
  ADD CONSTRAINT IF NOT EXISTS debt_accounts_name_unique UNIQUE (name);

ALTER TABLE subscriptions
  ADD CONSTRAINT IF NOT EXISTS subscriptions_name_unique UNIQUE (name);

ALTER TABLE budget_categories
  ADD CONSTRAINT IF NOT EXISTS budget_categories_name_unique UNIQUE (name);

ALTER TABLE financial_modules
  ADD CONSTRAINT IF NOT EXISTS financial_modules_name_unique UNIQUE (name);

-- ── TRANSACTIONS ─────────────────────────────────────────────────────────
-- Stores individual transactions imported from bank CSVs.
-- amount: negative = expense, positive = income/credit
-- Duplicate prevention: unique on (date + merchant + amount + account)

CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  merchant         TEXT NOT NULL,
  raw_description  TEXT,
  amount           DECIMAL(12,2) NOT NULL,
  category         TEXT,
  account_name     TEXT NOT NULL,
  source_file      TEXT,
  is_income        BOOLEAN DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_dedup_idx
  ON transactions (transaction_date, merchant, amount, account_name);

CREATE INDEX IF NOT EXISTS transactions_date_idx     ON transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions (category);
CREATE INDEX IF NOT EXISTS transactions_account_idx  ON transactions (account_name);

-- ── BALANCE SNAPSHOTS ────────────────────────────────────────────────────
-- One row per account per update — powers debt paydown charts and
-- net worth over time. Written automatically on every import.

CREATE TABLE IF NOT EXISTS balance_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name  TEXT NOT NULL,
  balance       DECIMAL(12,2) NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source        TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'csv')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS balance_snapshots_daily_idx
  ON balance_snapshots (account_name, snapshot_date);

CREATE INDEX IF NOT EXISTS balance_snapshots_date_idx    ON balance_snapshots (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS balance_snapshots_account_idx ON balance_snapshots (account_name);

-- ── DEADLINES ────────────────────────────────────────────────────────────
-- Schema matches the existing DbDeadline type in src/types/database.ts.
-- Previously hardcoded in financial-data.ts DEADLINES constant.

CREATE TABLE IF NOT EXISTS deadlines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  deadline_date    DATE NOT NULL,
  amount           DECIMAL(12,2),
  urgency          TEXT DEFAULT 'medium'
                   CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
  module           TEXT,
  impact_if_missed TEXT,
  status           TEXT DEFAULT 'upcoming'
                   CHECK (status IN ('upcoming', 'completed', 'missed')),
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Unique on title so ON CONFLICT (title) works in seed
ALTER TABLE deadlines
  ADD CONSTRAINT IF NOT EXISTS deadlines_title_unique UNIQUE (title);

-- ── PROMO DEADLINES ──────────────────────────────────────────────────────
-- 0% promotional period tracking.
-- Previously hardcoded in financial-data.ts PROMOS constant.

CREATE TABLE IF NOT EXISTS promo_deadlines (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  account_name           TEXT NOT NULL,
  balance                DECIMAL(12,2) NOT NULL DEFAULT 0,
  expires_date           DATE NOT NULL,
  deferred_interest_risk DECIMAL(12,2),
  notes                  TEXT,
  status                 TEXT DEFAULT 'active'
                         CHECK (status IN ('active', 'paid', 'expired')),
  sort_order             INTEGER DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promo_deadlines
  ADD CONSTRAINT IF NOT EXISTS promo_deadlines_name_unique UNIQUE (name);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────

ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_deadlines   ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Auth users read transactions"
  ON transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Auth users write transactions"
  ON transactions FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Auth users read balance_snapshots"
  ON balance_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Auth users write balance_snapshots"
  ON balance_snapshots FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Auth users read deadlines"
  ON deadlines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Auth users write deadlines"
  ON deadlines FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Auth users read promo_deadlines"
  ON promo_deadlines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Auth users write promo_deadlines"
  ON promo_deadlines FOR ALL USING (auth.role() = 'authenticated');

-- ── HELPER VIEWS ─────────────────────────────────────────────────────────

-- Monthly spending by category (replaces hardcoded SPENDING_CATEGORIES actuals)
CREATE OR REPLACE VIEW monthly_spending_by_category AS
SELECT
  category,
  DATE_TRUNC('month', transaction_date)::DATE AS month,
  SUM(ABS(amount))    AS total,
  COUNT(*)            AS transaction_count
FROM transactions
WHERE is_income = FALSE
  AND category IS NOT NULL
GROUP BY category, DATE_TRUNC('month', transaction_date)
ORDER BY month DESC, total DESC;

-- Net worth over time (for wealth trajectory chart)
CREATE OR REPLACE VIEW net_worth_history AS
SELECT
  snapshot_date,
  SUM(balance)               AS total_debt,
  850000 - SUM(balance)      AS estimated_net_worth
FROM balance_snapshots
GROUP BY snapshot_date
ORDER BY snapshot_date;
