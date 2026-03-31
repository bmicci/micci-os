-- ============================================================
-- Micci OS — Planner: Schedule Completions Table
-- Run in Supabase Dashboard > SQL Editor > Run
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_completions (
  key TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: authenticated users only
ALTER TABLE schedule_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage schedule_completions"
  ON schedule_completions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
