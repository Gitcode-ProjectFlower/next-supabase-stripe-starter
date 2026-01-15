-- Migration: Update RPC functions to include all new required fields
-- Updates create_selection and update_selection_items to save all 17 required fields

/**
 * RPC FUNCTION: create_selection (UPDATED)
 * Now includes all 17 required fields from the migration
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

  -- Bulk insert items with all 17 required fields
  insert into selection_items (
    selection_id, doc_id, name, domain, company_size, email, phone, 
    street, city, postal_code, 
    sector_level1, sector_level2, sector_level3,
    region_level1, region_level2, region_level3, region_level4,
    linkedin_company_url, legal_form,
    sectors, experience_years, similarity
  )
  select 
    v_selection_id,
    (item->>'doc_id')::text,
    COALESCE((item->>'name')::text, ''),
    COALESCE((item->>'domain')::text, ''),
    COALESCE((item->>'company_size')::text, ''),
    COALESCE((item->>'email')::text, ''),
    COALESCE((item->>'phone')::text, ''),
    COALESCE((item->>'street')::text, ''),
    COALESCE((item->>'city')::text, ''),
    COALESCE((item->>'postal_code')::text, ''),
    COALESCE((item->>'sector_level1')::text, ''),
    COALESCE((item->>'sector_level2')::text, ''),
    COALESCE((item->>'sector_level3')::text, ''),
    COALESCE((item->>'region_level1')::text, ''),
    COALESCE((item->>'region_level2')::text, ''),
    COALESCE((item->>'region_level3')::text, ''),
    COALESCE((item->>'region_level4')::text, ''),
    COALESCE((item->>'linkedin_company_url')::text, ''),
    COALESCE((item->>'legal_form')::text, ''),
    (item->'sectors')::jsonb,
    (item->>'experience_years')::integer,
    (item->>'similarity')::numeric(3,2)
  from jsonb_array_elements(p_items) as item;

  return v_selection_id;
end;
$$;

/**
 * RPC FUNCTION: update_selection_items (UPDATED)
 * Now includes all 17 required fields from the migration
 */
create or replace function update_selection_items(
  p_selection_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_item_count integer;
begin
  -- Verify ownership
  if not exists (
    select 1 from selections 
    where id = p_selection_id and user_id = auth.uid()
  ) then
    raise exception 'Selection not found or access denied';
  end if;

  -- Calculate the actual number of items to insert
  v_item_count := jsonb_array_length(p_items);

  -- Delete all existing items for this selection
  delete from selection_items where selection_id = p_selection_id;

  -- Insert new items (only if there are any) with all 17 required fields
  if v_item_count > 0 then
    insert into selection_items (
      selection_id, doc_id, name, domain, company_size, email, phone, 
      street, city, postal_code, 
      sector_level1, sector_level2, sector_level3,
      region_level1, region_level2, region_level3, region_level4,
      linkedin_company_url, legal_form,
      sectors, experience_years, similarity
    )
    select 
      p_selection_id,
      (item->>'doc_id')::text,
      COALESCE((item->>'name')::text, ''),
      COALESCE((item->>'domain')::text, ''),
      COALESCE((item->>'company_size')::text, ''),
      COALESCE((item->>'email')::text, ''),
      COALESCE((item->>'phone')::text, ''),
      COALESCE((item->>'street')::text, ''),
      COALESCE((item->>'city')::text, ''),
      COALESCE((item->>'postal_code')::text, ''),
      COALESCE((item->>'sector_level1')::text, ''),
      COALESCE((item->>'sector_level2')::text, ''),
      COALESCE((item->>'sector_level3')::text, ''),
      COALESCE((item->>'region_level1')::text, ''),
      COALESCE((item->>'region_level2')::text, ''),
      COALESCE((item->>'region_level3')::text, ''),
      COALESCE((item->>'region_level4')::text, ''),
      COALESCE((item->>'linkedin_company_url')::text, ''),
      COALESCE((item->>'legal_form')::text, ''),
      (item->'sectors')::jsonb,
      (item->>'experience_years')::integer,
      (item->>'similarity')::numeric(3,2)
    from jsonb_array_elements(p_items) as item;
  end if;

  -- Update item_count to match the actual number of items inserted
  update selections
  set item_count = v_item_count,
      updated_at = timezone('utc'::text, now())
  where id = p_selection_id;
end;
$$;
