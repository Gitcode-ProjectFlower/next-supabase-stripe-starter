-- Migration: Add versioning and validation columns to qa_standard_runs
-- Per ТЗ §4.4: log prompt_version, schema_version, and validation_status

ALTER TABLE qa_standard_runs
  ADD COLUMN IF NOT EXISTS prompt_version    TEXT,
  ADD COLUMN IF NOT EXISTS schema_version    TEXT,
  ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('valid', 'repaired', 'raw', 'failed'));
