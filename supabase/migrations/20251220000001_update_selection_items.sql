/**
 * RPC FUNCTION: update_selection_items
 * Atomically replaces all items for a selection by deleting old ones and inserting new ones.
 * This ensures no duplicates and proper transaction handling.
 * Also updates the item_count to match the actual number of items inserted.
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

  -- Insert new items (only if there are any)
  if v_item_count > 0 then
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

  -- Update item_count to match the actual number of items inserted
  update selections
  set item_count = v_item_count,
      updated_at = timezone('utc'::text, now())
  where id = p_selection_id;
end;
$$;

