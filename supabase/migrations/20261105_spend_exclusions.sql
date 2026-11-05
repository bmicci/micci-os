-- Rows the forward-looking spend average (burn, runway, Cash Flow) skips.
-- Transactions are kept; see applySpendExclusions in src/lib/finance/txnAggregate.ts.
insert into financial_settings (key, value, updated_at) values ('spend_exclusions', '[
  {"match": "Blue Cross Blue Shield", "reason": "Individual BCBS plan ends after November 2026; Schwab medical ($105.70/check) is netted out of paychecks instead. Owner decision 2026-11-05."},
  {"match": "BMW", "dates": ["2026-08-13"], "reason": "One-off BMW service charge ($1,332.64). Owner decision 2026-11-05."}
]'::jsonb, now())
on conflict (key) do update set value = excluded.value, updated_at = now();
