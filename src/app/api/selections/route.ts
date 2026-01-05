import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIdempotencyKey, getRequestId, IdempotencyHandler } from '@/libs/idempotency';
import { getTopKLimit } from '@/libs/plan-config';
import { searchRateLimiter } from '@/libs/ratelimit';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { logUsage } from '@/libs/usage-tracking';
import { getUserPlan } from '@/libs/user-plan';

const createSelectionSchema = z.object({
  name: z.string().min(1, 'Selection name is required').max(100),
  criteria: z.object({
    names: z.array(z.string()).max(4).optional(),
    regions: z.array(z.string()).optional(),
    sectors: z.array(z.string()).optional(),
    experience_years: z.array(z.number()).optional(),
  }),
  top_k: z.number().int().min(1),
  items: z.array(
    z.object({
      doc_id: z.string(),
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      city: z.string().optional(),
      street: z.string().optional(),
      sectors: z.array(z.string()).optional(),
      experience_years: z.number().optional(),
      similarity: z.number().min(0).max(1),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = getRequestId(request);

    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const { exists, result } = await IdempotencyHandler.checkIdempotency(idempotencyKey, user.id);

      if (exists) {
        return NextResponse.json(result, {
          headers: {
            'X-Request-ID': requestId,
            'X-Idempotency-Replay': 'true',
          },
        });
      }
    }

    const identifier = user.id;
    const { success, remaining } = await searchRateLimiter.limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
            'X-Request-ID': requestId,
          },
        }
      );
    }

    const body = await request.json();
    const validatedData = createSelectionSchema.parse(body);

    const plan = await getUserPlan(user.id);
    const topKLimit = getTopKLimit(plan);

    if (validatedData.top_k > topKLimit) {
      return NextResponse.json(
        {
          error: 'Top-K exceeds your plan limit',
          plan,
          planCap: topKLimit,
          requested: validatedData.top_k,
        },
        { status: 400 }
      );
    }

    if (validatedData.items.length > topKLimit) {
      return NextResponse.json(
        {
          error: 'Number of items exceeds your plan limit',
          plan,
          planCap: topKLimit,
          itemCount: validatedData.items.length,
        },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // @ts-ignore - Supabase RPC type inference issue
    const { data: selectionId, error: rpcError } = await supabase.rpc('create_selection', {
      p_name: validatedData.name,
      p_criteria_json: validatedData.criteria,
      p_items: validatedData.items,
    });

    if (rpcError) {
      console.error('Error creating selection:', rpcError);
      return NextResponse.json({ error: 'Failed to create selection', details: rpcError.message }, { status: 500 });
    }

    // Log selection creation to usage_log
    try {
      await logUsage(user.id, 'selection_created', 1);
    } catch (error) {
      // Log error but don't fail the selection creation
      console.error('[Selections API] Failed to log selection creation:', error);
    }

    const responseData = {
      selection_id: selectionId,
      item_count: validatedData.items.length,
      expires_at: expiresAt.toISOString(),
      plan,
    };

    if (idempotencyKey) {
      await IdempotencyHandler.storeResult(idempotencyKey, user.id, responseData);
    }

    return NextResponse.json(responseData, {
      status: 201,
      headers: {
        'X-RateLimit-Remaining': remaining.toString(),
        'X-Request-ID': requestId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }

    console.error('Error in POST /api/selections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: selections, error: rpcError } = await supabase.rpc('list_selections');

    if (rpcError) {
      console.error('Error fetching selections:', rpcError);
      return NextResponse.json({ error: 'Failed to fetch selections', details: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({
      selections: selections || [],
    });
  } catch (error) {
    console.error('Error in GET /api/selections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
