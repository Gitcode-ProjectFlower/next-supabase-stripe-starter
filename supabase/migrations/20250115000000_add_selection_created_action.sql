-- Add 'selection_created' action type to usage_log table
-- This allows tracking when users create selections (Lookalike searches)

ALTER TABLE usage_log
DROP CONSTRAINT IF EXISTS usage_log_action_check;

ALTER TABLE usage_log
ADD CONSTRAINT usage_log_action_check 
CHECK (action IN ('record_download', 'ai_question', 'selection_created'));

COMMENT ON COLUMN usage_log.action IS 'Type of action: record_download, ai_question, or selection_created';

