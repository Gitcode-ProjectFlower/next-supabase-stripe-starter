import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIdempotencyKey, getRequestId, IdempotencyHandler } from '@/libs/idempotency';
import { getTopKLimit } from '@/libs/plan-config';
import { parseSq1Score } from '@/libs/qa-output-schemas';
import { checkRateLimit } from '@/libs/ratelimit';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getUserPlan } from '@/libs/user-plan';

const followUpSchema = z.object({
  scores: z.array(z.number().int().min(1).max(5)).min(1).max(5),
  sourceQaSessionId: z.string().uuid(),
});

function extractScore(answerText: string | null): number | null {
  if (!answerText) return null;
  try {
    const parsed = JSON.parse(answerText) as Record<string, unknown>;
    return parseSq1Score(parsed['SCORE_VALUE']);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: selectionId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: selectionData, error: selectionError } = await supabase
      .from('selections')
      .select('id, user_id, name, criteria_json')
      .eq('id', selectionId)
      .single();

    const selection = selectionData as any;

    if (selectionError || !selection) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 });
    }
    if (selection.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestId = getRequestId(request);

    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const { exists, result } = await IdempotencyHandler.checkIdempotency(idempotencyKey, user.id);
      if (exists) {
        return NextResponse.json(result, {
          headers: { 'X-Request-ID': requestId, 'X-Idempotency-Replay': 'true' },
        });
      }
    }

    const rateLimitResult = await checkRateLimit(user.id, 'search');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const validation = followUpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }
    const { scores, sourceQaSessionId } = validation.data;
    const scoreSet = new Set(scores);

    const { data: sessionData, error: sessionError } = await supabase
      .from('qa_sessions')
      .select('id, prompt, form_input, input_snapshot, created_at, completed_at, standard_question_id, status')
      .eq('id', sourceQaSessionId)
      .eq('selection_id', selectionId)
      .eq('user_id', user.id)
      .single();

    const session = sessionData as any;

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Source analysis not found' }, { status: 404 });
    }
    if (session.standard_question_id !== '1' || session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Source analysis must be a completed Sales Priority Score run' },
        { status: 400 }
      );
    }

    const { data: answers, error: answersError } = await supabase
      .from('qa_answers')
      .select('doc_id, name, email, city, answer, status, error_message')
      .eq('session_id', sourceQaSessionId)
      .eq('status', 'success');

    if (answersError) {
      return NextResponse.json({ error: 'Failed to read source results' }, { status: 500 });
    }

    const matchedDocIds = new Set(
      (answers || [])
        .filter((a: any) => {
          const score = extractScore(a.answer);
          return score !== null && scoreSet.has(score);
        })
        .map((a: any) => a.doc_id)
    );

    if (matchedDocIds.size === 0) {
      return NextResponse.json({ error: 'No companies match the selected scores' }, { status: 400 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('selection_items')
      .select('*')
      .eq('selection_id', selectionId)
      .in('doc_id', [...matchedDocIds]);

    if (itemsError || !items || items.length === 0) {
      return NextResponse.json({ error: 'Failed to read selection companies' }, { status: 500 });
    }

    const plan = await getUserPlan(user.id);
    const topKLimit = getTopKLimit(plan);
    if (items.length > topKLimit) {
      return NextResponse.json(
        { error: 'Number of items exceeds your plan limit', plan, planCap: topKLimit, itemCount: items.length },
        { status: 400 }
      );
    }

    const newItems = ((items as any[]) || []).map((item: any) => {
      const { id, selection_id, created_at, ...rest } = item;
      void id;
      void selection_id;
      void created_at;
      return rest;
    });

    // @ts-ignore - Supabase RPC type inference issue
    const { data: newSelectionId, error: rpcError } = await supabase.rpc('create_selection', {
      p_name: `${selection.name} – High Priority`,
      p_criteria_json: selection.criteria_json,
      p_items: newItems,
    });

    if (rpcError || !newSelectionId) {
      return NextResponse.json({ error: 'Failed to create selection', details: rpcError?.message }, { status: 500 });
    }

    const { data: newSessionData, error: newSessionError } = await supabase
      .from('qa_sessions')
      // @ts-ignore - Supabase client type inference issue with insert queries
      .insert({
        user_id: user.id,
        selection_id: newSelectionId,
        prompt: session.prompt,
        status: 'completed',
        progress: 100,
        standard_question_id: '1',
        form_input: session.form_input,
        input_snapshot: session.input_snapshot,
        created_at: session.created_at,
        completed_at: session.completed_at,
      })
      .select('id')
      .single();

    const newSession = newSessionData as { id: string } | null;
    if (newSessionError || !newSession) {
      return NextResponse.json(
        { error: 'Selection created but failed to copy analysis', newSelectionId },
        { status: 500 }
      );
    }

    const answersToCopy = ((answers as any[]) || [])
      .filter((a: any) => matchedDocIds.has(a.doc_id))
      .map((a: any) => {
        return {
          session_id: newSession.id,
          doc_id: String(a.doc_id),
          name: String(a.name ?? ''),
          email: String(a.email ?? ''),
          city: a.city ? String(a.city) : null,
          answer: a.answer ? String(a.answer) : null,
          status: String(a.status ?? 'success'),
          error_message: a.error_message ? String(a.error_message) : null,
        };
      });

    if (answersToCopy.length > 0) {
      const { error: copyAnswersError } = await supabase
        .from('qa_answers')
        // @ts-ignore - Supabase client type inference issue with insert queries
        .insert(answersToCopy);
      if (copyAnswersError) {
        return NextResponse.json(
          { error: 'Selection created but failed to copy results', newSelectionId },
          { status: 500 }
        );
      }
    }

    const { data: standardRuns } = await supabase
      .from('qa_standard_runs')
      .select('*')
      .eq('session_id', sourceQaSessionId);

    if (standardRuns && (standardRuns as any[]).length > 0) {
      const run = (standardRuns as any[])[0];
      await supabase
        .from('qa_standard_runs')
        // @ts-ignore - Supabase client type inference issue with insert queries
        .insert({
          session_id: newSession.id,
          user_id: user.id,
          selection_id: newSelectionId,
          sq_id: '1',
          form_input: run.form_input ?? null,
          status: 'completed',
          total_count: answersToCopy.length,
          success_count: answersToCopy.length,
          prompt_version: run.prompt_version ?? null,
          schema_version: run.schema_version ?? null,
          validation_status: run.validation_status ?? null,
          completed_at: new Date().toISOString(),
        });
    }

    const responseData = { newSelectionId, itemCount: newItems.length, copiedAnswers: answersToCopy.length };
    if (idempotencyKey) {
      await IdempotencyHandler.storeResult(idempotencyKey, user.id, responseData);
    }

    return NextResponse.json(responseData, {
      status: 201,
      headers: { 'X-Request-ID': requestId },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create follow-up selection' },
      { status: 500 }
    );
  }
}
