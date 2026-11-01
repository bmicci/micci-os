-- Micci Daily Grok migration — phase 0/1 tables
-- Parallel to the existing Claude `briefs` table (tab/doc_key/blocks).
-- Grok path uses brief_key + body_md as specified.

create table if not exists public.grok_briefs (
  id uuid primary key default gen_random_uuid(),
  brief_key text not null,
  brief_date date not null,
  title text,
  body_md text,
  highlights jsonb default '[]'::jsonb,
  sources jsonb default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now(),
  unique (brief_key, brief_date)
);

create table if not exists public.brief_runs (
  id uuid primary key default gen_random_uuid(),
  brief_key text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('success','error','skipped')),
  error_message text,
  input_tokens int,
  output_tokens int,
  duration_ms int
);

create table if not exists public.brief_schedules (
  brief_key text primary key,
  enabled boolean not null default true,
  local_time time not null,
  days text[] not null,
  function_name text not null,
  last_run_date date
);

create table if not exists public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  metric text not null,
  value numeric,
  unit text,
  measured_at timestamptz not null,
  metadata jsonb default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique (source, metric, measured_at)
);

alter table public.grok_briefs enable row level security;
alter table public.brief_runs enable row level security;
alter table public.brief_schedules enable row level security;
alter table public.health_metrics enable row level security;

-- Single-tenant: deny-all for authenticated; service role writes.
-- (no policies = deny all for non-service)

-- Seed schedules (starting points)
insert into public.brief_schedules (brief_key, enabled, local_time, days, function_name)
values
  ('markets', true, '07:00', '{mon,tue,wed,thu,fri}', 'markets'),
  ('inbox', true, '06:45', '{mon,tue,wed,thu,fri}', 'inbox'),
  ('jobs', true, '08:00', '{mon,wed,fri}', 'jobs'),
  ('money', true, '07:30', '{mon,tue,wed,thu,fri,sat,sun}', 'money'),
  ('health', true, '06:30', '{mon,tue,wed,thu,fri,sat,sun}', 'health'),
  ('home', true, '09:00', '{sat}', 'home'),
  ('ai_news', true, '07:15', '{mon,tue,wed,thu,fri}', 'ai_news')
on conflict (brief_key) do nothing;

-- Note: home has a second Wednesday slot; handled in dispatcher or second row later.
