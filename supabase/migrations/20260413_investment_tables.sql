-- ═══════════════════════════════════════════════════════════════
-- Investment Tables for micci-os
-- 3 tables: investment_accounts, tax_lots, investment_transactions
-- Based on Chase Self-Directed Rollover IRA CSV exports
-- ═══════════════════════════════════════════════════════════════

-- ── 1. investment_accounts ─────────────────────────────────────
-- Account-level metadata (one row per brokerage account)

CREATE TABLE IF NOT EXISTS investment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,           -- e.g. "Self-Directed-Ret"
  account_number TEXT,                  -- e.g. "...3509"
  account_type TEXT DEFAULT 'Brokerage', -- Brokerage, 401k, Roth IRA, etc.
  institution TEXT DEFAULT 'Chase',
  total_value NUMERIC(14,2) DEFAULT 0,  -- sum of all positions (updated on import)
  total_cost NUMERIC(14,2) DEFAULT 0,   -- sum of all cost basis
  unrealized_gl NUMERIC(14,2) DEFAULT 0,-- total unrealized gain/loss
  as_of_date DATE,                      -- last data refresh date
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_name, account_number)
);

-- ── 2. tax_lots ───────────────────────────────────────────────
-- Per-lot position data from Chase tax lots CSV
-- One row per acquisition lot (multiple lots per ticker)

CREATE TABLE IF NOT EXISTS tax_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES investment_accounts(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_number TEXT,

  -- Security info
  ticker TEXT NOT NULL,
  cusip TEXT,
  description TEXT,                     -- full security name
  asset_class TEXT,                     -- "Equity", "Cash & Cash Equivalents", etc.
  asset_strategy TEXT,                  -- "US Large Cap Equity", "Thematic", etc.
  security_type TEXT,                   -- "Stock", "ETF", etc.

  -- Position data
  quantity NUMERIC(16,8) NOT NULL DEFAULT 0,
  price NUMERIC(14,4),                  -- current price per share
  value NUMERIC(14,2),                  -- quantity * price
  cost NUMERIC(14,2),                   -- adjusted cost basis
  original_cost NUMERIC(14,2),          -- original cost basis
  unit_cost NUMERIC(14,4),              -- cost per share
  unrealized_gl NUMERIC(14,2),          -- unrealized gain/loss $
  unrealized_gl_pct NUMERIC(8,4),       -- unrealized gain/loss %

  -- Tax info
  acquisition_date DATE,
  tax_term TEXT,                         -- "Short" or "Long"
  days_held INTEGER,
  days_until_long INTEGER,

  -- Income
  est_annual_income NUMERIC(14,2),
  accrued_income NUMERIC(14,2),

  -- Metadata
  pricing_date DATE,
  as_of_date DATE,                      -- snapshot date
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Dedup: same lot = same user + account + ticker + acquisition date + quantity
  UNIQUE(user_id, account_name, ticker, acquisition_date, quantity)
);

-- ── 3. investment_transactions ────────────────────────────────
-- Trade/dividend/transfer history from Chase transaction CSV

CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES investment_accounts(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_number TEXT,

  -- Transaction info
  trade_date DATE NOT NULL,
  post_date DATE,
  settlement_date DATE,
  transaction_type TEXT NOT NULL,        -- "Buy", "Sell", "Dividend", "STK SPLT", "BNK", "WDL", "DBS"
  description TEXT,
  tran_code TEXT,                        -- raw transaction code
  tran_code_description TEXT,

  -- Security info
  ticker TEXT,
  cusip TEXT,
  security_type TEXT,

  -- Amounts
  price NUMERIC(14,4),                   -- price per share
  quantity NUMERIC(16,8),                -- shares traded
  amount NUMERIC(14,2),                  -- total $ amount (negative = outflow/buy, positive = inflow/sell)
  income NUMERIC(14,2),                  -- dividend/interest income
  gl_short NUMERIC(14,2),               -- realized short-term gain/loss
  gl_long NUMERIC(14,2),                -- realized long-term gain/loss
  commissions NUMERIC(14,2) DEFAULT 0,
  tax_withheld NUMERIC(14,2) DEFAULT 0,

  -- Metadata
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Dedup: same transaction = same user + account + date + ticker + type + amount
  UNIQUE(user_id, account_name, trade_date, ticker, transaction_type, amount)
);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tax_lots_user ON tax_lots(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_lots_ticker ON tax_lots(ticker);
CREATE INDEX IF NOT EXISTS idx_tax_lots_account ON tax_lots(account_name);
CREATE INDEX IF NOT EXISTS idx_tax_lots_tax_term ON tax_lots(tax_term);

CREATE INDEX IF NOT EXISTS idx_inv_txn_user ON investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_trade_date ON investment_transactions(trade_date);
CREATE INDEX IF NOT EXISTS idx_inv_txn_ticker ON investment_transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_inv_txn_type ON investment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inv_txn_account ON investment_transactions(account_name);

CREATE INDEX IF NOT EXISTS idx_inv_accounts_user ON investment_accounts(user_id);

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investment accounts"
  ON investment_accounts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can manage own tax lots"
  ON tax_lots FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can manage own investment transactions"
  ON investment_transactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
