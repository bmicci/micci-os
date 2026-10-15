-- Micci Daily briefs hub — system of record for the scheduled briefs.
--
-- Writers: the claude.ai Routines (Morning Brief, Markets, Job Scout, Health,
-- Home & Admin) via the Supabase connector, using upsert_brief() below.
-- Reader: /briefs in micci-os via the server-side service client.
--
-- Single-tenant pipeline pattern (same as the financial tables): RLS on with
-- no policies = deny-all for anon/authenticated; only the service role and
-- the postgres role (Routines' connector) touch these tables.

create table if not exists public.briefs (
  id            uuid primary key default gen_random_uuid(),
  tab           text not null check (tab in ('today','jobs','markets','money','health','home')),
  doc_key       text not null,             -- YYYY-MM-DD, or YYYY-MM-DD-plan (Sunday health plan)
  brief_date    date not null,
  generated_at  timestamptz,
  source        text,                      -- scheduled-task | backfill | manual
  headline      text,
  period_label  text,
  chips         jsonb not null default '[]'::jsonb,
  blocks        jsonb not null default '[]'::jsonb,  -- generic block list (kpis|list|table|drafts|decision|text)
  payload       jsonb not null default '{}'::jsonb,  -- full document as written (today tab's custom shape lives here)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tab, doc_key)
);
create index if not exists briefs_tab_date_idx on public.briefs (tab, brief_date desc);

create table if not exists public.brief_config (
  tab         text primary key check (tab in ('today','jobs','markets','money','health','home')),
  text        text not null default '',
  source      text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.brief_tweaks (
  id           uuid primary key default gen_random_uuid(),
  tab          text not null check (tab in ('today','jobs','markets','money','health','home')),
  edition      text,                       -- doc_key of the brief the note is about
  section      text,                       -- block title / section the note is about
  kind         text not null check (kind in ('missing','noise','wrong','idea')),
  text         text not null,
  status       text not null default 'open' check (status in ('open','applied','dismissed')),
  created_at   timestamptz not null default now(),
  applied_at   timestamptz
);
create index if not exists brief_tweaks_open_idx on public.brief_tweaks (tab, status);

alter table public.briefs       enable row level security;
alter table public.brief_config enable row level security;
alter table public.brief_tweaks enable row level security;

-- One call per brief from the Routines:
--   select public.upsert_brief('markets', '2026-10-16', $brief$ {...document...} $brief$::jsonb);
-- Dollar-quoting means the model never has to escape the JSON.
create or replace function public.upsert_brief(p_tab text, p_doc_key text, p_doc jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_date date := coalesce(
    nullif(p_doc->>'date', '')::date,
    nullif(p_doc->>'brief_date', '')::date,
    left(p_doc_key, 10)::date
  );
begin
  insert into public.briefs as b
    (tab, doc_key, brief_date, generated_at, source, headline, period_label, chips, blocks, payload)
  values (
    p_tab, p_doc_key, v_date,
    coalesce(nullif(p_doc->>'generated_at', '')::timestamptz, now()),
    coalesce(p_doc->>'source', 'scheduled-task'),
    p_doc->>'headline',
    p_doc->>'period_label',
    coalesce(p_doc->'chips', '[]'::jsonb),
    coalesce(p_doc->'blocks', '[]'::jsonb),
    p_doc
  )
  on conflict (tab, doc_key) do update set
    brief_date   = excluded.brief_date,
    generated_at = excluded.generated_at,
    source       = excluded.source,
    headline     = excluded.headline,
    period_label = excluded.period_label,
    chips        = excluded.chips,
    blocks       = excluded.blocks,
    payload      = excluded.payload,
    updated_at   = now()
  returning id into v_id;
  return v_id;
end $$;

-- Writers only: never callable through the public REST API.
revoke all on function public.upsert_brief(text, text, jsonb) from public, anon, authenticated;
