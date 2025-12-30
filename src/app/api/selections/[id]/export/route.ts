import { NextRequest, NextResponse } from 'next/server';

import { inngest } from '@/libs/inngest/client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { checkUsageLimit, logUsage } from '@/libs/usage-tracking';
import { getUserPlan } from '@/libs/user-plan';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Validate that selection has items before allowing export
    if (itemCount === 0) {
      return NextResponse.json(
        {
          error: 'Cannot export empty selection',
          message: 'This selection has no candidates. Please add candidates to the selection before exporting.',
        },
        { status: 400 }
      );
    }

    // Check usage limit before allowing export
    const usageCheck = await checkUsageLimit(user.id, 'record_download', itemCount, userPlan);

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

    // Trigger Inngest background job to generate and upload CSV
    try {
      const hasEventKey = !!process.env.INNGEST_EVENT_KEY;
      const hasSigningKey = !!process.env.INNGEST_SIGNING_KEY;
      const nodeEnv = process.env.NODE_ENV;

      console.log('[Export API] Sending Inngest event:', {
        eventName: 'lookalikes/export',
        selectionId,
        userId: user.id,
        hasEventKey,
        hasSigningKey,
        nodeEnv,
        inngestId: inngest.id,
      });

      const result = await inngest.send({
        name: 'lookalikes/export',
        data: {
          selectionId,
          userId: user.id,
        },
      });

      console.log('[Export API] Inngest event sent successfully:', {
        ids: result?.ids,
        result,
      });
    } catch (inngestError) {
      console.error('[Export API] Failed to send Inngest event:', {
        error: inngestError instanceof Error ? inngestError.message : String(inngestError),
        stack: inngestError instanceof Error ? inngestError.stack : undefined,
        hasEventKey: !!process.env.INNGEST_EVENT_KEY,
        selectionId,
      });

      // Provide more helpful error message
      const errorMessage =
        inngestError instanceof Error
          ? inngestError.message
          : 'Failed to queue export job. Please check Inngest configuration.';

      return NextResponse.json(
        {
          error: 'Failed to queue export job',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

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
    console.error('[Export API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start export job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
