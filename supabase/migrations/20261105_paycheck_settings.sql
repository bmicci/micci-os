-- The Paycheck simulator's Save button wrote to a table that never existed, so it
-- failed silently and the simulator always ran on old defaults. Single row,
-- single tenant: deny-all RLS, read/written by the service client in
-- /api/finance/paycheck-settings only.
create table if not exists paycheck_settings (
  id uuid primary key default gen_random_uuid(),
  salary numeric,
  bonus_percent numeric,
  pay_frequency integer,
  filing_status text,
  state text,
  tax_method text,
  manual_effective_rate numeric,
  contribution_401k numeric,
  employer_match_pct numeric,
  employer_match_cap numeric,
  hsa_contribution numeric,
  health_premium numeric,
  other_pre_tax numeric,
  updated_at timestamptz not null default now()
);
alter table paycheck_settings enable row level security;
