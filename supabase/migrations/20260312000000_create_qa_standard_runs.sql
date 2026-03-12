-- Migration: Create qa_standard_runs table
-- Tracks each Standard Question (SQ1-SQ4) run with its form_input snapshot and per-company results.

CREATE TABLE IF NOT EXISTS qa_standard_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selection_id    UUID NOT NULL REFERENCES selections(id) ON DELETE CASCADE,
  sq_id           VARCHAR(2) NOT NULL CHECK (sq_id IN ('1', '2', '3', '4')),
  form_input      JSONB,
  status          TEXT NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'completed', 'failed')),
  total_count     INTEGER DEFAULT 0,
  success_count   INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at    TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_qa_standard_runs_session   ON qa_standard_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_qa_standard_runs_user      ON qa_standard_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_standard_runs_selection ON qa_standard_runs(selection_id);

-- RLS
ALTER TABLE qa_standard_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own standard runs"
  ON qa_standard_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own standard runs"
  ON qa_standard_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update standard runs"
  ON qa_standard_runs FOR UPDATE
  USING (true);
