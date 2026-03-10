-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_date     TEXT NOT NULL,          -- "Mon, Mar 9" matches Day.date in planner-data.ts
  week         INT NOT NULL,
  time_label   TEXT NOT NULL,          -- "1:30 PM"
  cat          TEXT NOT NULL,          -- CatKey: 'job', 'health', 'fitness', etc.
  task         TEXT NOT NULL,
  sort_order   FLOAT NOT NULL DEFAULT 0,
  static_key   TEXT,                   -- "week-dayIdx-blockIdx" if overriding/deleting a static block
  is_deleted   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Single-user app — disable RLS like schedule_completions
ALTER TABLE schedule_blocks DISABLE ROW LEVEL SECURITY;
