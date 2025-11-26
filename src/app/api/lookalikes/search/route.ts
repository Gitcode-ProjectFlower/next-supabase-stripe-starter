import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTopKLimit, validateFilterKeys } from '@/libs/facet-config';
import { checkRateLimit, searchRateLimiter } from '@/libs/ratelimit';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getUserPlan, maskFields } from '@/libs/user-plan';

const searchSchema = z.object({
  names: z.array(z.string()).min(0).max(4).optional(),
  lookalike_names: z.array(z.string()).min(0).max(4).optional(),
  sectors: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  experience_years: z.array(z.number()).optional(),
  filters: z.record(z.any()).optional(),
  top_k: z.number().int().min(1).max(5000),
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

    const rateLimitResult = await checkRateLimit(user.id, searchRateLimiter);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
          },
        }
      );
    }

    const body = await request.json();
    const validation = searchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      names,
      lookalike_names,
      sectors,
      regions,
      experience_years,
      filters: explicitFilters,
      top_k,
    } = validation.data;

    // Map frontend fields to backend expected structure
    const finalLookalikeNames = names || lookalike_names || [];

    // Construct filters object combining explicit filters and new specific fields
    const finalFilters = {
      ...(explicitFilters || {}),
      ...(sectors && sectors.length > 0 ? { sectors } : {}),
      ...(regions && regions.length > 0 ? { regions } : {}),
      ...(experience_years && experience_years.length > 0 ? { experience_years } : {}),
    };

    if (!validateFilterKeys(finalFilters)) {
      return NextResponse.json(
        { error: 'Invalid filter keys provided' },
        { status: 400 }
      );
    }

    const userPlan = await getUserPlan(user.id);
    const planLimit = getTopKLimit(userPlan || 'small');

    if (top_k > planLimit) {
      return NextResponse.json(
        {
          error: `Top-K limit exceeded for your plan. Maximum allowed: ${planLimit}`,
          plan: userPlan || 'free',
          limit: planLimit,
          requested: top_k,
        },
        { status: 403 }
      );
    }

    const haystackUrl =
      process.env.HAYSTACK_BASE_URL || 'http://localhost:8000';
    const haystackApiKey = process.env.HAYSTACK_API_KEY || '';

    const haystackResponse = await fetch(`${haystackUrl}/similarity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${haystackApiKey}`,
      },
      body: JSON.stringify({
        lookalike_names: finalLookalikeNames,
        filters: finalFilters,
        top_k,
        collection: 'en',
      }),
    });

    if (!haystackResponse.ok) {
      throw new Error(`Haystack API error: ${haystackResponse.statusText}`);
    }

    const haystackData = await haystackResponse.json();
    const results = haystackData.results || [];

    const maskedResults = maskFields(results, userPlan);

    const preview = maskedResults.slice(0, 3);
    const total = maskedResults.length;

    return NextResponse.json({
      success: true,
      data: {
        preview,
        total,
        plan: userPlan || 'free',
        limit: planLimit,
      },
    });

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
