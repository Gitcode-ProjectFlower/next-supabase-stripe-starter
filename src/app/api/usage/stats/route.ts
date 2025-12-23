import { PLAN_CONFIGS } from '@/libs/plan-config';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getUsageStats } from '@/libs/usage-tracking';
import { getUserPlan } from '@/libs/user-plan';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user plan
    const userPlan = await getUserPlan(user.id);
    console.log(`[Usage Stats] User: ${user.id}, Plan: ${userPlan}`);

    // For authenticated users, default to free_tier if no plan is found
    // getUserPlan should return 'free_tier' for authenticated users without subscription
    const effectivePlan = userPlan || 'free_tier';
    const planConfig = PLAN_CONFIGS[effectivePlan];

    if (!planConfig) {
      console.error(`[Usage Stats] Unknown plan: ${effectivePlan}, defaulting to free_tier`);
      const fallbackPlan = PLAN_CONFIGS.free_tier;
      return NextResponse.json({
        downloads: 0,
        ai_calls: 0,
        downloadsLimit: fallbackPlan.maxDownloadsPer30Days,
        aiCallsLimit: fallbackPlan.maxAiCallsPer30Days,
        plan: 'free_tier',
      });
    }

    // Get usage stats
    const stats = await getUsageStats(user.id);
    console.log(`[Usage Stats] Stats:`, stats);

    return NextResponse.json({
      downloads: stats?.downloads || 0,
      ai_calls: stats?.ai_calls || 0,
      downloadsLimit: planConfig.maxDownloadsPer30Days,
      aiCallsLimit: planConfig.maxAiCallsPer30Days,
      plan: effectivePlan,
      period_start: stats?.period_start,
      period_end: stats?.period_end,
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 });
  }
}
