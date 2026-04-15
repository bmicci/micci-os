-- ═══════════════════════════════════════════════════════════════════
-- Investment Portfolio Seed Data
-- Feb 18 2026 playbook targets + Apr 10 2026 actual positions
-- (sourced from Chase Tax Lots export)
-- ═══════════════════════════════════════════════════════════════════

-- ── Target Allocations (Feb 18 2026 playbook post-rotation) ───────
INSERT INTO portfolio_targets (ticker, name, target_pct, theme, rationale, action)
VALUES
  ('QQQ',  'Invesco QQQ Trust',              22.0, 'Tech/Growth',    'Large-cap tech & growth — core position',                'TRIM'),
  ('VTI',  'Vanguard Total Stock Market',    17.3, 'Broad Market',   'Total US market exposure — bedrock diversifier',         'HOLD'),
  ('SMH',  'VanEck Semiconductor ETF',        9.2, 'Semis',          'Semiconductor supercycle exposure',                      'HOLD'),
  ('IAU',  'iShares Gold Trust',              8.5, 'Gold',           'Inflation hedge, monetary debasement protection',        'ADD'),
  ('PAVE', 'Global X U.S. Infrastructure',   6.3, 'Industrials',    'Multi-decade infrastructure build-out theme',            'ADD'),
  ('SHLD', 'Global X Defense Tech',          5.9, 'Defense',        'Elevated global defense spend; NATO budget pledges',     'HOLD'),
  ('DIA',  'SPDR Dow Jones Industrial Avg',  4.4, 'Blue Chips',     'Dividend-paying blue chips, low volatility anchor',      'ADD'),
  ('SRVR', 'Pacer Data & Infrastructure',    4.0, 'Data Centers',   'Data center & digital infrastructure real estate',       'TRIM'),
  ('VYM',  'Vanguard High Dividend Yield',   4.0, 'Dividends',      'High-yield dividend income stream',                      'HOLD'),
  ('XLV',  'Health Care Select Sector SPDR', 3.2, 'Healthcare',     'Defensive sector; aging demographics tailwind',          'NEW'),
  ('ROBO', 'ROBO Global Robotics & AI',      3.0, 'Robotics',       'Pure-play robotics & automation index',                  'ADD'),
  ('BOTZ', 'Global X Robotics & AI',         2.7, 'Robotics',       'Complementary robotics ETF; broader AI exposure',        'ADD'),
  ('NUKZ', 'Range Nuclear Renaissance',      3.3, 'Nuclear',        'Nuclear renaissance — AI data center power demand',      'ADD'),
  ('VOLT', 'Volt Equity (TSLA-focused)',      1.9, 'Electrification','EV & clean-energy transition; speculative satellite',    'NEW'),
  ('CASH', 'Cash / Money Market',            2.5, 'Liquidity',      'Dry powder; deploy on 5%+ pullbacks',                   'DEPLOY')
ON CONFLICT (ticker) DO UPDATE
  SET name       = EXCLUDED.name,
      target_pct = EXCLUDED.target_pct,
      theme      = EXCLUDED.theme,
      rationale  = EXCLUDED.rationale,
      action     = EXCLUDED.action;

-- ── Portfolio Positions (Apr 10 2026 — from Chase Tax Lots export) ──
-- Aggregated from individual tax lots; prices as of 04/10/2026 11:59 ET
INSERT INTO portfolio_positions (ticker, name, shares, current_price, cost_basis, unit_cost, theme, account, is_cash)
VALUES
  ('QQQ',  'Invesco QQQ Trust',             58.38292, 611.07, 22379.74, 383.4600, 'Tech/Growth',    'IRA-3509', false),
  ('VTI',  'Vanguard Total Stock Market',   80.72212, 335.05, 27484.33, 340.4800, 'Broad Market',   'IRA-3509', false),
  ('SMH',  'VanEck Semiconductor ETF',      43.91347, 436.88, 15651.71, 356.4500, 'Semis',          'IRA-3509', false),
  ('PAVE', 'Global X U.S. Infrastructure', 182.26444,  54.65, 10000.00,  54.8800, 'Industrials',    'IRA-3509', false),
  ('IAU',  'iShares Gold Trust',           110.30536,  89.56,  9800.00,  88.8500, 'Gold',           'IRA-3509', false),
  ('SHLD', 'Global X Defense Tech',        126.10333,  72.70,  8065.02,  63.9500, 'Defense',        'IRA-3509', false),
  ('NUKZ', 'Range Nuclear Renaissance',    112.00000,  69.66,  7920.92,  70.7200, 'Nuclear',        'IRA-3509', false),
  ('DIA',  'SPDR Dow Jones Industrial Avg', 14.14313, 479.25,  7025.78, 496.8500, 'Blue Chips',     'IRA-3509', false),
  ('SRVR', 'Pacer Data & Infrastructure',  201.00000,  33.48,  5938.89,  29.5500, 'Data Centers',   'IRA-3509', false),
  ('VYM',  'Vanguard High Dividend Yield',  40.65378, 152.06,  6034.83, 148.4500, 'Dividends',      'IRA-3509', false),
  ('XLV',  'Health Care Select Sector SPDR',32.55492, 147.31,  5019.28, 154.2000, 'Healthcare',     'IRA-3509', false),
  ('ROBO', 'ROBO Global Robotics & AI',     63.16733,  73.78,  4500.00,  71.2300, 'Robotics',       'IRA-3509', false),
  ('BOTZ', 'Global X Robotics & AI',       108.18862,  35.43,  4012.92,  37.1000, 'Robotics',       'IRA-3509', false),
  ('VOLT', 'Volt Equity (TSLA-focused)',     57.00000,  37.60,  2020.07,  35.4400, 'Electrification','IRA-3509', false),
  ('CASH', 'Cash / Money Market (QDERQ)',  3381.04000,   1.00,  3381.04,   1.0000, 'Liquidity',      'IRA-3509', true)
ON CONFLICT (ticker) DO UPDATE
  SET name          = EXCLUDED.name,
      shares        = EXCLUDED.shares,
      current_price = EXCLUDED.current_price,
      cost_basis    = EXCLUDED.cost_basis,
      unit_cost     = EXCLUDED.unit_cost,
      theme         = EXCLUDED.theme,
      account       = EXCLUDED.account,
      is_cash       = EXCLUDED.is_cash,
      updated_at    = now();
