/**
 * RPC FUNCTION: update_selection_items
 * Atomically replaces all items for a selection by deleting old ones and inserting new ones.
 * This ensures no duplicates and proper transaction handling.
 */
create or replace function update_selection_items(
  p_selection_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Verify ownership
  if not exists (
    select 1 from selections 
    where id = p_selection_id and user_id = auth.uid()
  ) then
    raise exception 'Selection not found or access denied';
  end if;

  -- Delete all existing items for this selection
  delete from selection_items where selection_id = p_selection_id;

  -- Insert new items (only if there are any)
  if jsonb_array_length(p_items) > 0 then
    insert into selection_items (
      selection_id, doc_id, name, email, phone, city, street, 
      sectors, experience_years, similarity
    )
    select 
      p_selection_id,
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
  end if;
end;
$$;

