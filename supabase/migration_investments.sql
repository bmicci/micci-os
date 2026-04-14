-- ═══════════════════════════════════════════════════════════════════
-- Investment Portfolio Schema
-- portfolio_positions: current holdings (updated manually or via CSV)
-- portfolio_targets:   target allocations from playbook
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portfolio_positions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker          TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  shares          NUMERIC(14,6) NOT NULL DEFAULT 0,
  current_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_value   NUMERIC(12,2) GENERATED ALWAYS AS (shares * current_price) STORED,
  cost_basis      NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(10,4) NOT NULL DEFAULT 0,
  unrealized_gl   NUMERIC(12,2) GENERATED ALWAYS AS (shares * current_price - cost_basis) STORED,
  unrealized_gl_pct NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN cost_basis > 0
         THEN (shares * current_price - cost_basis) / cost_basis * 100
         ELSE 0
    END
  ) STORED,
  theme           TEXT        NOT NULL,
  account         TEXT        NOT NULL DEFAULT 'IRA-3509',
  is_cash         BOOLEAN     NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ          DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_targets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  target_pct  NUMERIC(6,2)  NOT NULL,
  theme       TEXT        NOT NULL,
  rationale   TEXT,
  action      TEXT        -- HOLD, ADD, TRIM, NEW, DEPLOY
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_ticker ON portfolio_positions(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_theme  ON portfolio_positions(theme);
CREATE INDEX IF NOT EXISTS idx_portfolio_targets_ticker   ON portfolio_targets(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_targets_theme    ON portfolio_targets(theme);

-- Row Level Security
ALTER TABLE portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_targets   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read positions"  ON portfolio_positions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write positions" ON portfolio_positions FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read targets"    ON portfolio_targets   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write targets"   ON portfolio_targets   FOR ALL    USING (auth.role() = 'authenticated');
