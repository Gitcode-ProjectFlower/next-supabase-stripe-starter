-- Extend data retention period from 7 to 30 days for selections and downloads.
-- Only the DEFAULT is updated; existing rows keep their current expires_at.

alter table selections
  alter column expires_at set default timezone('utc'::text, now() + interval '30 days');

alter table downloads
  alter column expires_at set default timezone('utc'::text, now() + interval '30 days');
