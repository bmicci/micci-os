-- Micci Daily — add the AI & Tech News tab ('ai') for the Grok briefs
-- (docs/GROK_BRIEFS_HANDOFF.md §7). Widens the tab checks only; no data change.

alter table public.briefs       drop constraint if exists briefs_tab_check;
alter table public.briefs       add  constraint briefs_tab_check
  check (tab in ('today','jobs','markets','money','health','home','ai'));

alter table public.brief_config drop constraint if exists brief_config_tab_check;
alter table public.brief_config add  constraint brief_config_tab_check
  check (tab in ('today','jobs','markets','money','health','home','ai'));

alter table public.brief_tweaks drop constraint if exists brief_tweaks_tab_check;
alter table public.brief_tweaks add  constraint brief_tweaks_tab_check
  check (tab in ('today','jobs','markets','money','health','home','ai'));
