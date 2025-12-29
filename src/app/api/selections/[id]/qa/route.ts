import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { inngest } from '@/libs/inngest/client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { checkUsageLimit, logUsage } from '@/libs/usage-tracking';
import { getUserPlan } from '@/libs/user-plan';

const qaRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  resume_ids: z.array(z.string()).optional().default([]),
});

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

    const body = await request.json();
    const validation = qaRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { prompt, resume_ids } = validation.data;

    // Additional validation: ensure prompt is not just whitespace
    const cleanedPrompt = prompt.trim();
    if (!cleanedPrompt || cleanedPrompt.length === 0) {
      return NextResponse.json({ error: 'Prompt cannot be empty or contain only whitespace' }, { status: 400 });
    }

    // Calculate AI calls: each resume counts as 1 AI call
    const aiCallCount = resume_ids.length > 0 ? resume_ids.length : selection.item_count || 1;

    // Get user plan
    const userPlan = await getUserPlan(user.id);

    // Check usage limit before allowing Q&A
    const usageCheck = await checkUsageLimit(user.id, 'ai_question', aiCallCount, userPlan);

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

    // Create QA session record in Supabase
    const { data: qaSession, error: sessionError } = await supabase
      .from('qa_sessions')
      .insert({
        user_id: user.id,
        selection_id: selectionId,
        prompt: cleanedPrompt,
        status: 'processing',
        progress: 0,
      })
      .select('id')
      .single();

    if (sessionError || !qaSession) {
      console.error('Failed to create QA session:', sessionError);
      return NextResponse.json({ error: 'Failed to create QA session' }, { status: 500 });
    }

    // Trigger Inngest background job to:
    // 1. Fetch selection items from Supabase
    // 2. Make Haystack API calls to get Q&A answers
    // 3. Save answers to qa_answers table in Supabase
    // 4. Update qa_session status to 'completed' when done
    try {
      const hasEventKey = !!process.env.INNGEST_EVENT_KEY;
      const hasSigningKey = !!process.env.INNGEST_SIGNING_KEY;
      const nodeEnv = process.env.NODE_ENV;

      console.log('[QA API] Sending Inngest event:', {
        eventName: 'qa/process',
        selectionId,
        qaSessionId: qaSession.id,
        promptLength: cleanedPrompt.length,
        hasEventKey,
        hasSigningKey,
        nodeEnv,
        inngestId: inngest.id,
      });

      const result = await inngest.send({
        name: 'qa/process',
        data: {
          selectionId,
          userId: user.id,
          prompt: cleanedPrompt,
          resumeIds: resume_ids,
          qaSessionId: qaSession.id,
        },
      });

      console.log('[QA API] Inngest event sent successfully:', {
        ids: result?.ids,
        result,
      });
    } catch (inngestError) {
      const errorMessage =
        inngestError instanceof Error
          ? inngestError.message
          : 'Failed to queue Q&A job. Please check Inngest configuration.';

      console.error('[QA API] Failed to send Inngest event:', {
        error: errorMessage,
        stack: inngestError instanceof Error ? inngestError.stack : undefined,
        hasEventKey: !!process.env.INNGEST_EVENT_KEY,
        selectionId,
        qaSessionId: qaSession.id,
      });

      // Update session status to failed if we can't queue the job
      await supabase
        .from('qa_sessions')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', qaSession.id);

      return NextResponse.json(
        {
          error: 'Failed to queue Q&A job',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Q&A job started',
      selectionId,
      qaSessionId: qaSession.id,
      aiCallsUsed: aiCallCount,
      usage: {
        current: usageCheck.current + aiCallCount,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining - aiCallCount,
      },
    });
  } catch (error) {
    console.error('Q&A trigger error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to start Q&A job';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
