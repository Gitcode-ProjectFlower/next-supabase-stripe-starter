-- Extend data retention period from 7 to 30 days for selections and downloads.
-- 1) Update the column DEFAULT so new rows get 30-day retention.
-- 2) Recalculate expires_at for EXISTING non-expired rows using created_at + 30 days,
--    so current users also benefit from the longer retention window.
-- Already-expired rows are left alone to avoid resurrecting data the cleanup job
-- would otherwise have removed.

alter table selections
  alter column expires_at set default timezone('utc'::text, now() + interval '30 days');

alter table downloads
  alter column expires_at set default timezone('utc'::text, now() + interval '30 days');

update selections
set expires_at = timezone('utc'::text, created_at + interval '30 days')
where expires_at > now();

update downloads
set expires_at = timezone('utc'::text, created_at + interval '30 days')
where expires_at > now();
