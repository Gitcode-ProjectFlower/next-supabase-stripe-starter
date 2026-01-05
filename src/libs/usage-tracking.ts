import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { PLAN_CONFIGS, UserPlan } from './user-plan';

export type UsageAction = 'record_download' | 'ai_question' | 'selection_created';

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}

export interface UsageStats {
  downloads: number;
  ai_calls: number;
  period_start: string;
  period_end: string;
}

/**
 * Log usage for a user
 * @param userId - User ID
 * @param action - Type of action (record_download, ai_question, or selection_created)
 * @param count - Number of records/calls/selections
 */
export async function logUsage(userId: string, action: UsageAction, count: number): Promise<void> {
  const supabase = await createSupabaseServerClient();

  console.log('[Usage Tracking] Logging usage:', {
    userId,
    action,
    count,
  });

  const { data: insertData, error } = await supabase
    .from('usage_log')
    // @ts-expect-error - Supabase browser client has TypeScript inference issue with insert queries
    .insert({
      user_id: userId,
      action,
      count,
    })
    .select('id')
    .single();

  const data = insertData as { id: string } | null;

  if (error) {
    console.error('[Usage Tracking] Failed to log usage:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
      action,
      count,
    });
    throw new Error(`Failed to log usage: ${error.message}`);
  }

  console.log('[Usage Tracking] Usage logged successfully:', {
    logId: data?.id,
    userId,
    action,
    count,
  });
}

/**
 * Check if user can perform action without exceeding their plan limit
 * @param userId - User ID
 * @param action - Type of action
 * @param count - Number of records/calls to add
 * @param plan - User's plan
 * @returns Object with allowed status, current usage, and limit
 */
export async function checkUsageLimit(
  userId: string,
  action: UsageAction,
  count: number,
  plan: UserPlan
): Promise<UsageCheckResult> {
  const supabase = await createSupabaseServerClient();

  // Check for unlimited usage override via environment variable OR development mode
  if (
    process.env.NODE_ENV === 'development' ||
    (action === 'ai_question' && process.env.UNLIMITED_AI_USAGE === 'true')
  ) {
    // Get current usage just for reporting
    // @ts-expect-error - Supabase RPC type inference issue
    const { data: rawStats } = await supabase.rpc('get_usage_stats', {
      p_user_id: userId,
    });
    const stats = rawStats as unknown as UsageStats;
    const current = action === 'record_download' ? stats?.downloads || 0 : stats?.ai_calls || 0;

    return {
      allowed: true,
      current,
      limit: 999999,
      remaining: 999999,
    };
  }

  const effectivePlan = plan || 'free_tier';
  const planConfig = PLAN_CONFIGS[effectivePlan];

  if (!planConfig) {
    console.error(`[Usage Tracking] Unknown plan: ${effectivePlan}`);
    // Fail closed - deny if plan is unknown
    return { allowed: false, current: 0, limit: 0, remaining: 0 };
  }

  // selection_created doesn't have a limit (unlimited selections)
  // Only record_download and ai_question have limits
  if (action === 'selection_created') {
    return { allowed: true, current: 0, limit: 999999, remaining: 999999 };
  }

  const limit = action === 'record_download' ? planConfig.maxDownloadsPer30Days : planConfig.maxAiCallsPer30Days;

  // Check if user can perform action
  // @ts-expect-error - Supabase RPC type inference issue
  const { data: canProceed, error: checkError } = await supabase.rpc('check_usage_limit', {
    p_user_id: userId,
    p_action: action,
    p_count: count,
    p_limit: limit,
  });

  if (checkError) {
    console.error('[Usage Tracking] Failed to check usage limit:', checkError);
    // Fail closed - deny if we can't check
    return { allowed: false, current: 0, limit, remaining: 0 };
  }

  // Get current usage for response
  // @ts-expect-error - Supabase RPC type inference issue
  const { data: rawStats, error: statsError } = await supabase.rpc('get_usage_stats', {
    p_user_id: userId,
  });

  if (statsError) {
    console.error('[Usage Tracking] Failed to get usage stats:', statsError);
  }

  const stats = rawStats as unknown as UsageStats;

  const current = action === 'record_download' ? stats?.downloads || 0 : stats?.ai_calls || 0;

  const remaining = Math.max(0, limit - current);

  return {
    allowed: canProceed as boolean,
    current,
    limit,
    remaining,
  };
}

/**
 * Get usage statistics for a user (rolling 30 days)
 * @param userId - User ID
 * @returns Usage statistics
 */
export async function getUsageStats(userId: string): Promise<UsageStats | null> {
  const supabase = await createSupabaseServerClient();

  // @ts-expect-error - Supabase RPC type inference issue
  const { data, error } = await supabase.rpc('get_usage_stats', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[Usage Tracking] Failed to get usage stats:', error);
    return null;
  }

  return data as unknown as UsageStats;
}
