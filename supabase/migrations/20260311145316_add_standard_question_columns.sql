-- Add standard_question_id and form_input columns to qa_sessions table
ALTER TABLE qa_sessions 
ADD COLUMN IF NOT EXISTS standard_question_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS form_input JSONB;

-- Create an index for standard_question_id for potentially faster lookups
CREATE INDEX IF NOT EXISTS idx_qa_sessions_standard_question_id ON qa_sessions(standard_question_id);
