import { NextRequest, NextResponse } from 'next/server';

import { inngest } from '@/libs/inngest/client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getUserPlan } from '@/libs/user-plan';
import { checkUsageLimit, logUsage } from '@/libs/usage-tracking';

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

        // Get user plan
        const userPlan = await getUserPlan(user.id);
        const itemCount = selection.item_count || 0;

        // Check usage limit before allowing export
        const usageCheck = await checkUsageLimit(
            user.id,
            'record_download',
            itemCount,
            userPlan
        );

        if (!usageCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'CAP_REACHED',
                    type: 'download_limit',
                    message: 'You have reached your monthly download limit. Upgrade to continue.',
                    current: usageCheck.current,
                    limit: usageCheck.limit,
                    remaining: usageCheck.remaining,
                },
                { status: 403 }
            );
        }

        // Log usage (will be counted when export completes)
        await logUsage(user.id, 'record_download', itemCount);

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
            usage: {
                current: usageCheck.current + itemCount,
                limit: usageCheck.limit,
                remaining: usageCheck.remaining - itemCount,
            },
        });
    } catch (error) {
        console.error('Export trigger error:', error);
        return NextResponse.json(
            { error: 'Failed to start export job' },
            { status: 500 }
        );
    }
}
