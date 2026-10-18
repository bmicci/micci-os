-- Statements pipeline: card statement PDFs (Plaid Statements or manual
-- upload) → Claude extraction → "Statement findings" the user confirms
-- before anything touches promo_deadlines. Nothing is overwritten silently;
-- promos are marked paid, never deleted.
--
-- Single-tenant pipeline tables: deny-all RLS, read/written server-side via
-- the service client (same pattern as plaid_liabilities).

create table if not exists public.statements (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null check (source in ('plaid','upload')),
  plaid_statement_id  text unique,
  item_id             text,
  plaid_account_id    text,
  institution         text,
  account_name        text,
  account_mask        text,
  period_year         int,
  period_month        int,
  date_posted         date,
  storage_path        text not null,          -- private bucket "statements"
  file_size           int,
  status              text not null default 'downloaded'
                        check (status in ('downloaded','parsing','parsed','error')),
  parse_error         text,
  extracted           jsonb,                  -- full structured extraction
  parsed_at           timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists statements_account_idx on public.statements (plaid_account_id, period_year desc, period_month desc);

create table if not exists public.statement_findings (
  id            uuid primary key default gen_random_uuid(),
  statement_id  uuid not null references public.statements(id) on delete cascade,
  kind          text not null check (kind in ('update_promo','new_promo','promo_paid','info')),
  promo_id      uuid references public.promo_deadlines(id),
  account_name  text,
  title         text not null,
  current       jsonb,       -- promo row as it is now (null for new)
  proposed      jsonb,       -- {balance, expires, deferred_interest, apr, name, note}
  status        text not null default 'pending' check (status in ('pending','applied','dismissed')),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists statement_findings_status_idx on public.statement_findings (status, created_at desc);

alter table public.plaid_items
  add column if not exists statements_refreshed_at timestamptz;

-- Provenance on promos (shown in /financial; set when a finding is applied).
alter table public.promo_deadlines
  add column if not exists verified_at timestamptz,
  add column if not exists verified_source text;

alter table public.statements         enable row level security;
alter table public.statement_findings enable row level security;

insert into storage.buckets (id, name, public)
values ('statements', 'statements', false)
on conflict (id) do nothing;
