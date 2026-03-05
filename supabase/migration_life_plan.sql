-- Migration: Life Plan Goals System
-- Stores state for the master life plan dashboard

-- Tracks completion of hardcoded/static goals
CREATE TABLE IF NOT EXISTS life_plan_goal_states (
  goal_key   TEXT PRIMARY KEY,   -- e.g. "health-40-0-3" (section-timeframe-catIdx-goalIdx)
  completed  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom goals: user-created or AI-generated additions
CREATE TABLE IF NOT EXISTS life_plan_custom_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      TEXT NOT NULL,
  timeframe       TEXT NOT NULL,  -- '40','45','50','60','all','pinned'
  category_header TEXT,
  goal_text       TEXT NOT NULL,
  completed       BOOLEAN DEFAULT FALSE,
  ai_generated    BOOLEAN DEFAULT FALSE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Foundation edits: overrides for vision, purpose, role models, etc.
CREATE TABLE IF NOT EXISTS life_plan_foundation_edits (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE life_plan_goal_states      ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_plan_custom_goals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_plan_foundation_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_life_plan_goal_states"
  ON life_plan_goal_states FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_life_plan_custom_goals"
  ON life_plan_custom_goals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_life_plan_foundation_edits"
  ON life_plan_foundation_edits FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Trigger: auto-update updated_at on custom goals
CREATE OR REPLACE FUNCTION update_life_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER life_plan_custom_goals_updated_at
  BEFORE UPDATE ON life_plan_custom_goals
  FOR EACH ROW EXECUTE FUNCTION update_life_plan_updated_at();
