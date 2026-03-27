-- ═══════════════════════════════════════════════════════════════════
-- Job Search Tracker Tables
-- Sprint: March 24 – April 30, 2026
-- ═══════════════════════════════════════════════════════════════════

-- ── Job Pipeline (opportunities / applications) ─────────────────

CREATE TABLE IF NOT EXISTS job_pipeline (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  company     text NOT NULL,
  role        text NOT NULL,
  status      text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','waiting','rejected','offer','closed')),
  stage       text NOT NULL DEFAULT '',
  contact     text,
  last_action text,
  next_step   text,
  priority    text NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('high','medium','low')),
  notes       text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE job_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pipeline" ON job_pipeline
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Outreach Log ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_outreach (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  date           date NOT NULL DEFAULT CURRENT_DATE,
  target         text NOT NULL,
  outreach_type  text NOT NULL DEFAULT 'cold'
                   CHECK (outreach_type IN ('cold','warm','referral')),
  method         text NOT NULL DEFAULT 'LinkedIn',
  status         text NOT NULL DEFAULT 'planned'
                   CHECK (status IN ('planned','sent','responded','no_response')),
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE job_outreach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own outreach" ON job_outreach
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── LinkedIn Content Calendar ───────────────────────────────────

CREATE TABLE IF NOT EXISTS job_content (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  week         int NOT NULL,
  day_label    text NOT NULL,
  content_type text NOT NULL DEFAULT 'post'
                 CHECK (content_type IN ('post','engage','article')),
  topic        text NOT NULL,
  status       text NOT NULL DEFAULT 'idea'
                 CHECK (status IN ('idea','draft','published','ongoing')),
  notes        text,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE job_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content" ON job_content
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Recruiter Tracker ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_recruiters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  name         text NOT NULL,
  practice     text,
  status       text NOT NULL DEFAULT 'to_contact'
                 CHECK (status IN ('to_contact','cold','warm','engaged')),
  last_contact date,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE job_recruiters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recruiters" ON job_recruiters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Weekly KPI Scorecard ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_weekly_kpis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  week_label        text NOT NULL,
  week_number       int NOT NULL,
  apps              int NOT NULL DEFAULT 0,
  outreach          int NOT NULL DEFAULT 0,
  posts             int NOT NULL DEFAULT 0,
  comments          int NOT NULL DEFAULT 0,
  interviews        int NOT NULL DEFAULT 0,
  target_apps       int NOT NULL DEFAULT 8,
  target_outreach   int NOT NULL DEFAULT 6,
  target_posts      int NOT NULL DEFAULT 2,
  target_comments   int NOT NULL DEFAULT 15,
  target_interviews int NOT NULL DEFAULT 2,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, week_number)
);

ALTER TABLE job_weekly_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own kpis" ON job_weekly_kpis
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
