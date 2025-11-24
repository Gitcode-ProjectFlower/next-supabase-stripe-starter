/**
 * SELECTIONS
 * Note: This table stores user's saved candidate selections/lists.
 * Users can only view and manage their own selections.
 */
create table selections (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  criteria_json jsonb not null,
  item_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now() + interval '7 days') not null
);

alter table selections enable row level security;

create policy "Users can view own selections" on selections 
  for select using (auth.uid() = user_id);

create policy "Users can insert own selections" on selections 
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own selections" on selections 
  for delete using (auth.uid() = user_id);

create index selections_user_id_idx on selections(user_id);
create index selections_expires_at_idx on selections(expires_at);

/**
 * SELECTION_ITEMS
 * Note: This table stores individual candidate profiles within each selection.
 * Access is controlled via join with selections table.
 */
create table selection_items (
  id uuid not null primary key default gen_random_uuid(),
  selection_id uuid references selections(id) on delete cascade not null,
  doc_id text not null,
  name text,
  email text,
  phone text,
  city text,
  street text,
  sectors jsonb,
  experience_years integer,
  similarity numeric(3,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table selection_items enable row level security;

create policy "Users can view items of own selections" on selection_items 
  for select using (
    exists (
      select 1 from selections 
      where selections.id = selection_items.selection_id 
      and selections.user_id = auth.uid()
    )
  );

create policy "Users can insert items to own selections" on selection_items 
  for insert with check (
    exists (
      select 1 from selections 
      where selections.id = selection_items.selection_id 
      and selections.user_id = auth.uid()
    )
  );

create index selection_items_selection_id_idx on selection_items(selection_id);

/**
 * DOWNLOADS
 * Note: This table stores generated CSV export files (lookalike and Q&A results).
 * Files are stored in Supabase Storage with signed URLs.
 */
create table downloads (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  selection_id uuid references selections(id) on delete cascade,
  type text not null check (type in ('lookalike', 'qa')),
  url text not null,
  row_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now() + interval '7 days') not null
);

alter table downloads enable row level security;

create policy "Users can view own downloads" on downloads 
  for select using (auth.uid() = user_id);

create policy "Users can insert own downloads" on downloads 
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own downloads" on downloads 
  for delete using (auth.uid() = user_id);

create index downloads_user_id_idx on downloads(user_id);
create index downloads_selection_id_idx on downloads(selection_id);
create index downloads_expires_at_idx on downloads(expires_at);

/**
 * RPC FUNCTION: create_selection
 * Creates a selection and bulk inserts items in a single transaction.
 */
create or replace function create_selection(
  p_name text,
  p_criteria_json jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_selection_id uuid;
  v_item_count integer;
begin
  -- Insert selection
  insert into selections (user_id, name, criteria_json, item_count)
  values (auth.uid(), p_name, p_criteria_json, jsonb_array_length(p_items))
  returning id into v_selection_id;

  -- Bulk insert items
  insert into selection_items (
    selection_id, doc_id, name, email, phone, city, street, 
    sectors, experience_years, similarity
  )
  select 
    v_selection_id,
    (item->>'doc_id')::text,
    (item->>'name')::text,
    (item->>'email')::text,
    (item->>'phone')::text,
    (item->>'city')::text,
    (item->>'street')::text,
    (item->'sectors')::jsonb,
    (item->>'experience_years')::integer,
    (item->>'similarity')::numeric(3,2)
  from jsonb_array_elements(p_items) as item;

  return v_selection_id;
end;
$$;

/**
 * RPC FUNCTION: list_selections
 * Returns user's selections with item counts and metadata.
 */
create or replace function list_selections()
returns table (
  id uuid,
  name text,
  criteria_json jsonb,
  item_count integer,
  created_at timestamp with time zone,
  expires_at timestamp with time zone
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    s.id,
    s.name,
    s.criteria_json,
    s.item_count,
    s.created_at,
    s.expires_at
  from selections s
  where s.user_id = auth.uid()
    and s.expires_at > now()
  order by s.created_at desc;
end;
$$;

/**
 * RPC FUNCTION: delete_selection
 * Deletes a selection and all related items and downloads (cascade).
 */
create or replace function delete_selection(p_selection_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check ownership
  if not exists (
    select 1 from selections 
    where id = p_selection_id and user_id = auth.uid()
  ) then
    raise exception 'Selection not found or access denied';
  end if;

  -- Delete selection (cascade will handle items and downloads)
  delete from selections where id = p_selection_id;
end;
$$;
