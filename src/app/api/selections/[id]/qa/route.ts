import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { inngest } from '@/libs/inngest/client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getUserPlan } from '@/libs/user-plan';
import { checkUsageLimit, logUsage } from '@/libs/usage-tracking';

const qaRequestSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required'),
    resume_ids: z.array(z.string()).optional().default([]),
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
            .select('id, user_id, item_count')
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

        const { prompt, resume_ids } = validation.data;

        // Calculate AI calls: each resume counts as 1 AI call
        const aiCallCount = resume_ids.length > 0 ? resume_ids.length : selection.item_count || 1;

        // Get user plan
        const userPlan = await getUserPlan(user.id);

        // Check usage limit before allowing Q&A
        const usageCheck = await checkUsageLimit(
            user.id,
            'ai_question',
            aiCallCount,
            userPlan
        );

        if (!usageCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'CAP_REACHED',
                    type: 'ai_limit',
                    message: 'You have reached your monthly AI question limit. Upgrade to continue.',
                    current: usageCheck.current,
                    limit: usageCheck.limit,
                    remaining: usageCheck.remaining,
                },
                { status: 403 }
            );
        }

        // Log usage
        await logUsage(user.id, 'ai_question', aiCallCount);

        await inngest.send({
            name: 'qa/process',
            data: {
                selectionId,
                userId: user.id,
                prompt,
                resumeIds: resume_ids,
            },
        });

        return NextResponse.json({
            message: 'Q&A job started',
            selectionId,
            aiCallsUsed: aiCallCount,
            usage: {
                current: usageCheck.current + aiCallCount,
                limit: usageCheck.limit,
                remaining: usageCheck.remaining - aiCallCount,
            },
        });
    } catch (error) {
        console.error('Q&A trigger error:', error);
        return NextResponse.json(
            { error: 'Failed to start Q&A job' },
            { status: 500 }
        );
    }
}
