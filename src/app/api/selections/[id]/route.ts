import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: selectionId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectionId)) {
      return NextResponse.json({ error: 'Invalid selection ID format' }, { status: 400 });
    }

    // @ts-expect-error - Supabase RPC type inference issue
    const { error: rpcError } = await supabase.rpc('delete_selection', {
      p_selection_id: selectionId,
    });

    if (rpcError) {
      if (rpcError.message.includes('not found') || rpcError.message.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Selection not found or you do not have permission to delete it' },
          { status: 404 }
        );
      }

      console.error('Error deleting selection:', rpcError);
      return NextResponse.json({ error: 'Failed to delete selection', details: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Selection deleted successfully',
      selection_id: selectionId,
    });
  } catch (error) {
    console.error('Error in DELETE /api/selections/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: selectionId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectionId)) {
      return NextResponse.json({ error: 'Invalid selection ID format' }, { status: 400 });
    }

    const { data: selectionData, error: selectionError } = await supabase
      .from('selections')
      .select('*')
      .eq('id', selectionId)
      .single();

    const selection = selectionData as any;

    if (selectionError || !selection) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('selection_items')
      .select('*')
      .eq('selection_id', selectionId)
      .order('similarity', { ascending: false });

    if (itemsError) {
      console.error('Error fetching selection items:', itemsError);
      return NextResponse.json({ error: 'Failed to fetch selection items' }, { status: 500 });
    }

    return NextResponse.json({
      selection: {
        ...selection,
        items: items || [],
      },
    });
  } catch (error) {
    console.error('Error in GET /api/selections/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
