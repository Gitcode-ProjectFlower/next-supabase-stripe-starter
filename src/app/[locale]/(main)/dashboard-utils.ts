import type { SupabaseClient } from '@supabase/supabase-js';

import type { LookalikeResult } from '@/types/selection';

interface SelectionItem extends LookalikeResult {
  similarity: number;
}

function mapItemForRPC(item: SelectionItem) {
  return {
    doc_id: item.doc_id,
    name: item.name || '',
    domain: item.domain || '',
    company_size: item.company_size || '',
    email: item.email || '',
    phone: item.phone || '',
    street: item.street || '',
    city: item.city || '',
    postal_code: item.postal_code || '',
    sector_level1: item.sector_level1 || '',
    sector_level2: item.sector_level2 || '',
    sector_level3: item.sector_level3 || '',
    region_level1: item.region_level1 || '',
    region_level2: item.region_level2 || '',
    region_level3: item.region_level3 || '',
    region_level4: item.region_level4 || '',
    linkedin_company_url: item.linkedin_company_url || '',
    legal_form: item.legal_form || '',
    sectors: item.sectors,
    experience_years: item.experience_years,
    similarity: item.similarity,
  };
}

function deduplicateItems(items: SelectionItem[]): SelectionItem[] {
  return Array.from(new Map(items.map((item) => [item.doc_id, item])).values());
}

export async function createSelectionRPC(
  supabase: SupabaseClient,
  name: string,
  criteria: Record<string, unknown>,
  items: SelectionItem[]
): Promise<string> {
  const uniqueItems = deduplicateItems(items);

  // @ts-ignore - Supabase RPC type inference issue, p_items accepts Json array
  const { data: selectionId, error } = await supabase.rpc('create_selection', {
    p_name: name,
    p_criteria_json: criteria,
    p_items: uniqueItems.map(mapItemForRPC),
  });

  if (error) throw new Error(`Failed to create selection: ${error.message}`);
  if (!selectionId) throw new Error('Failed to create selection: No ID returned');
  return selectionId;
}

export async function updateSelectionRPC(
  supabase: SupabaseClient,
  selectionId: string,
  userId: string,
  name: string,
  criteria: Record<string, unknown>,
  items: SelectionItem[]
): Promise<void> {
  const { data: existing, error: checkError } = await supabase
    .from('selections')
    .select('id, user_id')
    .eq('id', selectionId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existing) throw new Error('Selection not found or access denied');

  const uniqueItems = deduplicateItems(items);

  const { error: updateError } = await supabase
    .from('selections')
    // @ts-ignore - Supabase browser client has TypeScript inference issue with update queries
    .update({ name, criteria_json: criteria, updated_at: new Date().toISOString() })
    .eq('id', selectionId);

  if (updateError) throw new Error(`Failed to update selection: ${updateError.message}`);

  // @ts-ignore - Supabase RPC type inference issue, p_items accepts Json array
  const { error: rpcError } = await supabase.rpc('update_selection_items', {
    p_selection_id: selectionId,
    p_items: uniqueItems.map(mapItemForRPC),
  });

  if (rpcError) throw new Error(`Failed to update selection items: ${rpcError.message}`);
}

export async function ensureSelectionExists(
  supabase: SupabaseClient,
  opts: {
    savedSelectionId: string | null;
    userId: string;
    selectionName: string;
    criteria: Record<string, unknown>;
    items: SelectionItem[];
  }
): Promise<{ selectionId: string; isNew: boolean }> {
  if (opts.savedSelectionId) {
    try {
      await updateSelectionRPC(supabase, opts.savedSelectionId, opts.userId, opts.selectionName, opts.criteria, opts.items);
      return { selectionId: opts.savedSelectionId, isNew: false };
    } catch {
      // Fall through to create if update fails (e.g. selection deleted)
    }
  }

  const selectionId = await createSelectionRPC(supabase, opts.selectionName, opts.criteria, opts.items);

  try {
    // @ts-ignore - Supabase browser client has TypeScript inference issue with insert queries
    await supabase.from('usage_log').insert({ user_id: opts.userId, action: 'selection_created', count: 1 });
  } catch {
    // Non-critical — don't fail the save
  }

  return { selectionId, isNew: true };
}
