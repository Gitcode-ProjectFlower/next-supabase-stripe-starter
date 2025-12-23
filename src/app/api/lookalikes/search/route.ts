import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTopKLimit, validateFilterKeys } from '@/libs/facet-config';
import { checkRateLimit, searchRateLimiter } from '@/libs/ratelimit';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getAnonymousPlan, getUserPlan, maskFields } from '@/libs/user-plan';

const searchSchema = z.object({
  names: z.array(z.string()).min(0).max(4).optional(),
  lookalike_names: z.array(z.string()).min(0).max(4).optional(),
  sectors: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  // Hierarchical sector filters
  sector_level1: z.array(z.string()).optional(),
  sector_level2: z.array(z.string()).optional(),
  sector_level3: z.array(z.string()).optional(),
  // Hierarchical region filters
  region_level1: z.array(z.string()).optional(),
  region_level2: z.array(z.string()).optional(),
  region_level3: z.array(z.string()).optional(),
  region_level4: z.array(z.string()).optional(),
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

    const isAnonymous = !user || authError;

    if (!isAnonymous) {
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
    }

    const body = await request.json();

    // Debug: Log what we received from frontend
    console.log('[API] Received request body:', {
      raw: body,
      formatted: JSON.stringify(body, null, 2),
    });

    const validation = searchSchema.safeParse(body);

    if (!validation.success) {
      console.error('[API] Validation failed:', validation.error.errors);
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
      sector_level1,
      sector_level2,
      sector_level3,
      region_level1,
      region_level2,
      region_level3,
      region_level4,
      experience_years,
      filters: explicitFilters,
      top_k,
    } = validation.data;

    // Debug: Log validated data
    console.log('[API] Validated data:', {
      names,
      sectors,
      regions,
      experience_years,
      top_k,
    });

    // Map frontend fields to backend expected structure
    const finalLookalikeNames = names || lookalike_names || [];

    // Validate filter keys if explicit filters are provided
    if (explicitFilters && Object.keys(explicitFilters).length > 0) {
      if (!validateFilterKeys(explicitFilters)) {
        return NextResponse.json({ error: 'Invalid filter keys provided' }, { status: 400 });
      }
    }

    const userPlan = isAnonymous ? getAnonymousPlan() : await getUserPlan(user.id);
    const planLimit = getTopKLimit(userPlan);

    const effectiveTopK = isAnonymous ? Math.min(top_k, 3) : top_k;

    if (top_k > planLimit) {
      return NextResponse.json(
        {
          error: `Top-K limit exceeded for your plan. Maximum allowed: ${planLimit}`,
          plan: userPlan || 'anonymous',
          limit: planLimit,
          requested: top_k,
        },
        { status: 403 }
      );
    }

    const haystackUrl = process.env.HAYSTACK_BASE_URL || 'http://localhost:8000';
    const haystackApiKey = process.env.HAYSTACK_API_KEY || '';

    // Build Haystack payload matching curl examples (filters at top level, not nested)
    // Per curl-filter-tests.md: sectors, regions, experience_years are top-level fields
    // NEW: Support hierarchical filters (sector_level1, sector_level2, etc.)
    const haystackPayload: Record<string, any> = {
      names: finalLookalikeNames,
      top_k: effectiveTopK,
    };

    // Add hierarchical sector filters (preferred method)
    if (sector_level1 && sector_level1.length > 0) {
      haystackPayload.sector_level1 = sector_level1;
    }
    if (sector_level2 && sector_level2.length > 0) {
      haystackPayload.sector_level2 = sector_level2;
    }
    if (sector_level3 && sector_level3.length > 0) {
      haystackPayload.sector_level3 = sector_level3;
    }

    // Add hierarchical region filters (preferred method)
    if (region_level1 && region_level1.length > 0) {
      haystackPayload.region_level1 = region_level1;
    }
    if (region_level2 && region_level2.length > 0) {
      haystackPayload.region_level2 = region_level2;
    }
    if (region_level3 && region_level3.length > 0) {
      haystackPayload.region_level3 = region_level3;
    }
    if (region_level4 && region_level4.length > 0) {
      haystackPayload.region_level4 = region_level4;
    }

    // Legacy support: flat sectors/regions arrays (for backward compatibility)
    // Only use if hierarchical filters are not provided
    if (!sector_level1 && !sector_level2 && !sector_level3) {
      if (sectors && sectors.length > 0) {
        haystackPayload.sectors = sectors;
      }
    }
    if (!region_level1 && !region_level2 && !region_level3 && !region_level4) {
      if (regions && regions.length > 0) {
        haystackPayload.regions = regions;
      }
    }

    if (experience_years && experience_years.length > 0) {
      haystackPayload.experience_years = experience_years;
    }

    // Merge any explicit filters (for backward compatibility)
    if (explicitFilters && Object.keys(explicitFilters).length > 0) {
      Object.assign(haystackPayload, explicitFilters);
    }

    // Debug: Log exact payload being sent to Haystack backend
    console.log('[Haystack API] Request:', {
      url: `${haystackUrl}/similarity`,
      method: 'POST',
      payload: haystackPayload,
      formatted: JSON.stringify(haystackPayload, null, 2),
    });

    const haystackResponse = await fetch(`${haystackUrl}/similarity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(haystackApiKey ? { 'X-API-Key': haystackApiKey } : {}),
      },
      body: JSON.stringify(haystackPayload),
    });

    if (!haystackResponse.ok) {
      throw new Error(`Haystack API error: ${haystackResponse.statusText}`);
    }

    const haystackData = await haystackResponse.json();
    console.log('[Haystack API] Response:', haystackData);

    const results = haystackData.results || [];

    const limitedResults = isAnonymous ? results.slice(0, 3) : results;
    
    // Don't mask here - return full data. Frontend will mask for display only.
    // This ensures all data is available when saving selections.
    // Masking should only happen in the UI for display purposes, not in the API response.

    return NextResponse.json({
      success: true,
      data: {
        preview: limitedResults, // Return full data, not masked
        total: isAnonymous ? limitedResults.length : limitedResults.length,
        plan: userPlan || 'anonymous',
        limit: planLimit,
        isAnonymous,
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
