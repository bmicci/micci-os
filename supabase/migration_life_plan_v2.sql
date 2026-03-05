-- =============================================================
-- Life Plan v2 Migration — Full Supabase data model
-- Replaces migration_life_plan.sql (hybrid approach)
-- Run this AFTER schema.sql
-- =============================================================

-- ── Tables ────────────────────────────────────────────────────

-- Sections (Health, Career, etc.)
CREATE TABLE IF NOT EXISTS life_plan_sections (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color_hex  TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- All goals — both seeded (is_seeded=true) and user-added (is_seeded=false)
CREATE TABLE IF NOT EXISTS life_plan_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      TEXT NOT NULL REFERENCES life_plan_sections(id) ON DELETE CASCADE,
  timeframe       TEXT NOT NULL,       -- '40','45','50','60','all','pinned'
  timeframe_label TEXT,                -- human-readable, e.g. 'Age 40 (1 Year)'
  category_header TEXT,                -- e.g. 'Physique & Weight:'
  goal_text       TEXT NOT NULL,
  completed       BOOLEAN DEFAULT FALSE,
  ai_generated    BOOLEAN DEFAULT FALSE,
  is_seeded       BOOLEAN DEFAULT TRUE, -- false for user-created goals
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Foundation edits — narrative overrides (vision, purpose, values, etc.)
CREATE TABLE IF NOT EXISTS life_plan_foundation_edits (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE life_plan_sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_plan_goals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_plan_foundation_edits  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_life_plan_sections"
  ON life_plan_sections FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_life_plan_goals"
  ON life_plan_goals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_life_plan_foundation_edits"
  ON life_plan_foundation_edits FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── Trigger: auto-update updated_at ───────────────────────────

CREATE OR REPLACE FUNCTION update_life_plan_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER life_plan_goals_updated_at
  BEFORE UPDATE ON life_plan_goals
  FOR EACH ROW EXECUTE FUNCTION update_life_plan_goals_updated_at();

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS life_plan_goals_section_id  ON life_plan_goals (section_id);
CREATE INDEX IF NOT EXISTS life_plan_goals_timeframe   ON life_plan_goals (section_id, timeframe);
CREATE INDEX IF NOT EXISTS life_plan_goals_completed   ON life_plan_goals (completed);

-- ── Drop old tables if migrating from v1 ─────────────────────
-- (Only run if upgrading from the first migration)
-- DROP TABLE IF EXISTS life_plan_goal_states;
-- DROP TABLE IF EXISTS life_plan_custom_goals;
