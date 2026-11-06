-- Investments year-end target, moved out of code (was hardcoded in InvestmentsPortfolioTab).
insert into financial_settings (key, value, updated_at) values ('investment_targets',
  '{"year_end_target": 189053, "year_start_value": 143000, "note": "Moved from code 2026-11-06. year_start_value is a fallback; the page uses an early-January portfolio_history snapshot when one exists. Revisit after consolidating the old 401(k) into Schwab."}'::jsonb, now())
on conflict (key) do nothing;
