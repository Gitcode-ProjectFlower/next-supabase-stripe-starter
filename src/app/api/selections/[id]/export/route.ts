import { NextRequest, NextResponse } from 'next/server';

import { inngest } from '@/libs/inngest/client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: selectionId } = await params;
        const supabase = await createSupabaseServerClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: selection, error: selectionError } = await supabase
            .from('selections')
            .select('id, user_id')
            .eq('id', selectionId)
            .single();

        if (selectionError || !selection) {
            return NextResponse.json({ error: 'Selection not found' }, { status: 404 });
        }

        if (selection.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await inngest.send({
            name: 'lookalikes/export',
            data: {
                selectionId,
                userId: user.id,
            },
        });

        return NextResponse.json({
            message: 'Export job started',
            selectionId,
        });
    } catch (error) {
        console.error('Export trigger error:', error);
        return NextResponse.json(
            { error: 'Failed to start export job' },
            { status: 500 }
        );
    }
}
