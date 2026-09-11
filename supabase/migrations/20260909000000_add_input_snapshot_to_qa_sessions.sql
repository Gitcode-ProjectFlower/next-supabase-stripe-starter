-- Self-describing immutable input snapshot per analysis run (Briefing 21.08 §20-21).
-- Shape: {"fields": [{"key","label","type","value","order"}]}. NULL = run predates snapshots.

ALTER TABLE qa_sessions
ADD COLUMN IF NOT EXISTS input_snapshot JSONB;
