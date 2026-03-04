-- ============================================================
-- Micci OS — Full Database Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable pgvector for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- DOCUMENTS (upload pipeline)
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_type    TEXT NOT NULL CHECK (file_type IN ('pdf','xlsx','csv','docx','txt')),
  file_size    BIGINT,
  section      TEXT DEFAULT 'general' CHECK (section IN ('financial','goals','planner','health','general')),
  is_processed BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID REFERENCES documents(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  embedding    vector(1536),
  chunk_index  INTEGER,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  section    TEXT,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  sources    JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCIAL
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT,
  status      TEXT DEFAULT 'active',
  progress    INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  description TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  amount           DECIMAL(10,2),
  billing_cycle    TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual','weekly','one-time')),
  category         TEXT,
  action           TEXT CHECK (action IN ('cancel','review','keep','essential')),
  notes            TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  next_billing_date DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debt_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  account_type    TEXT CHECK (account_type IN ('credit_card','heloc','loan','mortgage','line_of_credit','other')),
  balance         DECIMAL(12,2) DEFAULT 0,
  interest_rate   DECIMAL(5,2),
  minimum_payment DECIMAL(10,2),
  due_day         INTEGER CHECK (due_day BETWEEN 1 AND 31),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','paid_off','closed','negotiating')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  monthly_actual  NUMERIC,
  annual_actual   NUMERIC,
  survival_budget NUMERIC,
  pct_of_total    NUMERIC,
  color           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GOALS
-- ============================================================

CREATE TABLE IF NOT EXISTS goal_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID REFERENCES goal_categories(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused','archived')),
  priority     INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  target_date  DATE,
  completed_at TIMESTAMPTZ,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HEALTH
-- ============================================================

CREATE TABLE IF NOT EXISTS supplements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  dosage     TEXT,
  frequency  TEXT,
  timing     TEXT,
  category   TEXT,
  notes      TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hormone_protocols (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  substance   TEXT NOT NULL,
  dosage      TEXT,
  day_of_week TEXT[],
  time_of_day TEXT,
  notes       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_schedule (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_type         TEXT DEFAULT 'weekday' CHECK (day_type IN ('weekday','weekend','any')),
  time_slot        TEXT NOT NULL,
  activity         TEXT NOT NULL,
  category         TEXT,
  duration_minutes INTEGER,
  is_fixed         BOOLEAN DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_modules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hormone_protocols   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedule      ENABLE ROW LEVEL SECURITY;

-- Documents: per-user ownership
CREATE POLICY "Users own their documents"         ON documents       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their chunks"            ON document_chunks FOR ALL USING (
  document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
);
CREATE POLICY "Users own their chat messages"     ON chat_messages   FOR ALL USING (auth.uid() = user_id);

-- Shared reference data: any authenticated user (single-user app)
CREATE POLICY "Auth users read financial_modules" ON financial_modules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write financial_modules" ON financial_modules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users read subscriptions"     ON subscriptions    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write subscriptions"    ON subscriptions    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users read debt_accounts"     ON debt_accounts    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write debt_accounts"    ON debt_accounts    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users read budget_categories" ON budget_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write budget_categories" ON budget_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users read goal_categories"   ON goal_categories  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write goal_categories"  ON goal_categories  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users read goals"             ON goals            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write goals"            ON goals            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users read supplements"       ON supplements      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write supplements"      ON supplements      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users read hormone_protocols" ON hormone_protocols FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write hormone_protocols" ON hormone_protocols FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users read daily_schedule"    ON daily_schedule   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users write daily_schedule"   ON daily_schedule   FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SUPABASE STORAGE BUCKET
-- ============================================================
-- Run in Supabase Dashboard → Storage → New Bucket:
--   Name: documents | Private: true
-- Or via SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Auth users can read own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users can delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- pgvector SIMILARITY SEARCH FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding  vector(1536),
  match_threshold  FLOAT    DEFAULT 0.5,
  match_count      INT      DEFAULT 8,
  filter_section   TEXT     DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  document_id UUID,
  content     TEXT,
  similarity  FLOAT,
  metadata    JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE
    1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_section IS NULL OR d.section = filter_section)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
