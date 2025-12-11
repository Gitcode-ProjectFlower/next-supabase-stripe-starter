import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getUserPlan, PLAN_CONFIGS } from '@/libs/user-plan';
import { getUsageStats } from '@/libs/usage-tracking';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user plan
        const userPlan = await getUserPlan(user.id);
        const effectivePlan = userPlan || 'free_tier';
        const planConfig = PLAN_CONFIGS[effectivePlan];

        // Get usage stats
        const stats = await getUsageStats(user.id);

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
        return NextResponse.json(
            { error: 'Failed to fetch usage stats' },
            { status: 500 }
        );
    }
}
