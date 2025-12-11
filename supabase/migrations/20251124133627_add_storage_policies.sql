-- STORAGE POLICIES FOR 'exports' BUCKET
-- Note: These policies ensure users can only access their own CSV export files.
-- Files are organized by user_id: exports/{user_id}/{selection_id}/file.csv

-- Enable RLS on storage.objects
-- alter table storage.objects enable row level security;

-- POLICY: Users can upload files to their own folder
-- Pattern: exports/{user_id}/*
create policy "Users can upload to own folder"
on storage.objects
for insert
with check (
  bucket_id = 'exports' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Users can view their own files
-- Pattern: exports/{user_id}/*
create policy "Users can view own files"
on storage.objects
for select
using (
  bucket_id = 'exports' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Users can update their own files
-- Pattern: exports/{user_id}/*
create policy "Users can update own files"
on storage.objects
for update
using (
  bucket_id = 'exports' 
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Users can delete their own files
-- Pattern: exports/{user_id}/*
create policy "Users can delete own files"
on storage.objects
for delete
using (
  bucket_id = 'exports' 
  and (storage.foldername(name))[1] = auth.uid()::text
);
