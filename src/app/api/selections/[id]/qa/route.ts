import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { inngest } from '@/libs/inngest/client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const qaRequestSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required'),
});

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

        const body = await request.json();
        const validation = qaRequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400 }
            );
        }

        const { prompt } = validation.data;

        await inngest.send({
            name: 'qa/process',
            data: {
                selectionId,
                userId: user.id,
                prompt,
            },
        });

        return NextResponse.json({
            message: 'Q&A job started',
            selectionId,
        });
    } catch (error) {
        console.error('Q&A trigger error:', error);
        return NextResponse.json(
            { error: 'Failed to start Q&A job' },
            { status: 500 }
        );
    }
}
