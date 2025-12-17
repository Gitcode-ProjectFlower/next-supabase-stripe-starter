-- Add email_notifications_enabled column to users table
-- This column stores the user's preference for receiving email notifications
-- for CSV exports ready and Q&A runs completed

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT false;

-- Add comment to document the column
COMMENT ON COLUMN users.email_notifications_enabled IS 'User preference for receiving email notifications when CSV exports are ready or Q&A runs complete';

