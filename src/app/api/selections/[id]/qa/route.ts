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

    // Create QA session record
    const { data: qaSession, error: sessionError } = await supabase
      .from('qa_sessions')
      .insert({
        user_id: user.id,
        selection_id: selectionId,
        prompt: cleanedPrompt, // Store cleaned prompt
        status: 'processing',
        progress: 0,
      })
      .select('id')
      .single();

    if (sessionError || !qaSession) {
      console.error('Failed to create QA session:', sessionError);
      return NextResponse.json({ error: 'Failed to create QA session' }, { status: 500 });
    }

    try {
      await inngest.send({
        name: 'qa/process',
        data: {
          selectionId,
          userId: user.id,
          prompt: cleanedPrompt,
          resumeIds: resume_ids,
          qaSessionId: qaSession.id,
        },
      });
    } catch (inngestError) {
      console.error('Failed to send Inngest event:', inngestError);
      // Update session status to failed
      await supabase
        .from('qa_sessions')
        .update({ status: 'failed', error_message: 'Failed to queue Q&A job' })
        .eq('id', qaSession.id);

      return NextResponse.json({ error: 'Failed to queue Q&A job. Please try again.' }, { status: 500 });
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
