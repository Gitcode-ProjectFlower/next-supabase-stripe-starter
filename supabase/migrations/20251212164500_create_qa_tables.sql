-- Create qa_sessions table
CREATE TABLE qa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selection_id UUID NOT NULL REFERENCES selections(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  csv_url TEXT
);

-- Create qa_answers table
CREATE TABLE qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
  doc_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  city TEXT,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_qa_sessions_user_selection ON qa_sessions(user_id, selection_id);
CREATE INDEX idx_qa_answers_session ON qa_answers(session_id);

-- RLS
ALTER TABLE qa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_answers ENABLE ROW LEVEL SECURITY;

-- Policies for qa_sessions
CREATE POLICY "Users can view own qa sessions"
  ON qa_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own qa sessions"
  ON qa_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update qa sessions"
  ON qa_sessions FOR UPDATE
  USING (true);

-- Policies for qa_answers
CREATE POLICY "Users can view own qa answers via session"
  ON qa_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qa_sessions
      WHERE qa_sessions.id = qa_answers.session_id
      AND qa_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert qa answers"
  ON qa_answers FOR INSERT
  WITH CHECK (true);
