-- ═══════════════════════════════════════════════════════════════════
-- Investment Portfolio Seed Data
-- Feb 18 2026 playbook targets + Jan 7 2026 baseline positions
-- ═══════════════════════════════════════════════════════════════════

-- ── Target Allocations (Feb 18 2026 playbook post-rotation) ───────
INSERT INTO portfolio_targets (ticker, name, target_pct, theme, rationale, action)
VALUES
  ('QQQ',  'Invesco QQQ Trust',              22.0, 'Tech/Growth',    'Large-cap tech & growth — core position',                'TRIM'),
  ('VTI',  'Vanguard Total Stock Market',    17.3, 'Broad Market',   'Total US market exposure — bedrock diversifier',         'HOLD'),
  ('SMH',  'VanEck Semiconductor ETF',        9.2, 'Semis',          'Semiconductor supercycle exposure',                       'HOLD'),
  ('IAU',  'iShares Gold Trust',              8.5, 'Gold',           'Inflation hedge, monetary debasement protection',         'ADD'),
  ('PAVE', 'Global X U.S. Infrastructure',   6.3, 'Industrials',    'Multi-decade infrastructure build-out theme',             'ADD'),
  ('SHLD', 'Global X Defense Tech',          5.9, 'Defense',        'Elevated global defense spend; NATO budget pledges',      'HOLD'),
  ('DIA',  'SPDR Dow Jones Industrial Avg',  4.4, 'Blue Chips',     'Dividend-paying blue chips, low volatility anchor',       'ADD'),
  ('SRVR', 'Pacer Data & Infrastructure',    4.0, 'Data Centers',   'Data center & digital infrastructure real estate',        'TRIM'),
  ('VYM',  'Vanguard High Dividend Yield',   4.0, 'Dividends',      'High-yield dividend income stream',                       'HOLD'),
  ('XLV',  'Health Care Select Sector SPDR', 3.2, 'Healthcare',     'Defensive sector; aging demographics tailwind',           'NEW'),
  ('ROBO', 'ROBO Global Robotics & AI',      3.0, 'Robotics',       'Pure-play robotics & automation index',                   'ADD'),
  ('BOTZ', 'Global X Robotics & AI',         2.7, 'Robotics',       'Complementary robotics ETF; broader AI exposure',         'ADD'),
  ('NUKZ', 'Range Nuclear Renaissance',      3.3, 'Nuclear',        'Nuclear renaissance — AI data center power demand',       'ADD'),
  ('VOLT', 'Volt Equity (TSLA-focused)',      1.9, 'Electrification','EV & clean-energy transition; speculative satellite',     'NEW'),
  ('CASH', 'Cash / Money Market',            2.5, 'Liquidity',      'Dry powder; deploy on 5%+ pullbacks',                    'DEPLOY')
ON CONFLICT (ticker) DO UPDATE
  SET name       = EXCLUDED.name,
      target_pct = EXCLUDED.target_pct,
      theme      = EXCLUDED.theme,
      rationale  = EXCLUDED.rationale,
      action     = EXCLUDED.action;

-- ── Portfolio Positions (Jan 7 2026 baseline — update prices manually) ──
INSERT INTO portfolio_positions (ticker, name, shares, current_price, cost_basis, unit_cost, theme, account, is_cash)
VALUES
  -- Active positions
  ('QQQ',  'Invesco QQQ Trust',           136.11542,  625.29, 51656.69, 379.4900, 'Tech/Growth',    'IRA-3509', false),
  ('SMH',  'VanEck Semiconductor ETF',     35.09248,  385.40, 12151.71, 346.2500, 'Semis',          'IRA-3509', false),
  ('VTI',  'Vanguard Total Stock Market',  39.52947,  341.15, 13404.01, 339.0800, 'Broad Market',   'IRA-3509', false),
  ('SHLD', 'Global X Defense Tech',       125.68894,   72.57,  8035.19,  63.9300, 'Defense',        'IRA-3509', false),
  ('SLV',  'iShares Silver Trust',         76.67334,   70.895,  5000.00,  65.2200, 'Precious Metals','IRA-3509', false),
  ('IAU',  'iShares Gold Trust',           58.83870,   83.95,  4800.00,  81.5900, 'Gold',           'IRA-3509', false),
  ('SRVR', 'Pacer Data & Infrastructure', 153.00000,   29.52,  4507.38,  29.4600, 'Data Centers',   'IRA-3509', false),
  ('ROBO', 'ROBO Global Robotics & AI',    50.23229,   72.61,  3500.00,  69.6800, 'Robotics',       'IRA-3509', false),
  ('BOTZ', 'Global X Robotics & AI',       81.82125,   38.155,  3000.00,  36.6700, 'Robotics',      'IRA-3509', false),
  ('SLVP', 'iShares MSCI Global Silver',   86.92270,   35.62,  3000.00,  34.5200, 'Precious Metals','IRA-3509', false),
  ('CASH', 'Cash / Money Market',       26815.69000,    1.00, 26815.69,   1.0000, 'Liquidity',      'IRA-3509', true),

  -- Target positions not yet purchased (0 shares — shows as "not yet purchased")
  ('PAVE', 'Global X U.S. Infrastructure',  0.000000,   0.00,     0.00,   0.0000, 'Industrials',    'IRA-3509', false),
  ('VYM',  'Vanguard High Dividend Yield',   0.000000,   0.00,     0.00,   0.0000, 'Dividends',      'IRA-3509', false),
  ('DIA',  'SPDR Dow Jones Industrial Avg',  0.000000,   0.00,     0.00,   0.0000, 'Blue Chips',     'IRA-3509', false),
  ('NUKZ', 'Range Nuclear Renaissance',      0.000000,   0.00,     0.00,   0.0000, 'Nuclear',        'IRA-3509', false),
  ('VOLT', 'Volt Equity (TSLA-focused)',      0.000000,   0.00,     0.00,   0.0000, 'Electrification','IRA-3509', false),
  ('XLV',  'Health Care Select Sector SPDR', 0.000000,   0.00,     0.00,   0.0000, 'Healthcare',     'IRA-3509', false)
ON CONFLICT DO NOTHING;
