-- Create usage_log table for tracking downloads and AI calls
-- Rolling 30-day usage limits

CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('record_download', 'ai_question')),
  count INTEGER NOT NULL CHECK (count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast rolling 30-day queries
CREATE INDEX idx_usage_log_user_action_created 
  ON usage_log(user_id, action, created_at DESC);

-- Index for cleanup queries
CREATE INDEX idx_usage_log_created 
  ON usage_log(created_at);

-- Enable RLS
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own usage
CREATE POLICY "Users can view own usage"
  ON usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Only backend can insert (via service role)
CREATE POLICY "Service role can insert usage"
  ON usage_log FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE usage_log IS 'Tracks user downloads and AI question usage for rolling 30-day limits';
COMMENT ON COLUMN usage_log.action IS 'Type of action: record_download or ai_question';
COMMENT ON COLUMN usage_log.count IS 'Number of records/calls in this action';
