import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserPlan } from '../plan-config';
import { PLAN_CONFIGS } from '../plan-config';
import { createSupabaseServerClient } from '../supabase/supabase-server-client';
import { checkUsageLimit, getUsageStats, logUsage } from '../usage-tracking';

// Mock Supabase client
vi.mock('../supabase/supabase-server-client', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Verify PLAN_CONFIGS is available (it should be since user-plan re-exports it)
// This is just for debugging - the actual import happens in usage-tracking.ts
if (!PLAN_CONFIGS) {
  console.error('PLAN_CONFIGS is not available in test environment');
}

describe('Usage Tracking', () => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    // Reset mocks for each test
    mockSupabase.rpc.mockReset();
    mockSupabase.from.mockReset();
  });

  describe('logUsage', () => {
    it('should successfully log usage for record_download action', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(logUsage('user-123', 'record_download', 5)).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_log');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'record_download',
        count: 5,
      });
    });

    it('should successfully log usage for ai_question action', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(logUsage('user-123', 'ai_question', 1)).resolves.not.toThrow();

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'ai_question',
        count: 1,
      });
    });

    it('should throw error when database insert fails', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(logUsage('user-123', 'record_download', 5)).rejects.toThrow('Failed to log usage');
    });
  });

  describe('checkUsageLimit', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
      // Reset environment
      delete process.env.NODE_ENV;
      delete process.env.UNLIMITED_AI_USAGE;
    });

    it('should allow action when within limit for free_tier plan', async () => {
      const plan: UserPlan = 'free_tier';
      const limit = PLAN_CONFIGS[plan].maxDownloadsPer30Days;
      const currentUsage = 50;

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null }) // check_usage_limit
        .mockResolvedValueOnce({
          // get_usage_stats
          data: {
            downloads: currentUsage,
            ai_calls: 0,
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString(),
          },
          error: null,
        });

      const result = await checkUsageLimit(mockUserId, 'record_download', 10, plan);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(currentUsage);
      expect(result.limit).toBe(limit);
      expect(result.remaining).toBe(limit - currentUsage);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_usage_limit', {
        p_user_id: mockUserId,
        p_action: 'record_download',
        p_count: 10,
        p_limit: limit,
      });
    });

    it('should deny action when exceeding limit for small plan', async () => {
      const plan: UserPlan = 'small';
      const limit = PLAN_CONFIGS[plan].maxDownloadsPer30Days;
      const currentUsage = limit - 5; // 5 away from limit

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: false, error: null }) // check_usage_limit returns false
        .mockResolvedValueOnce({
          data: {
            downloads: currentUsage,
            ai_calls: 0,
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString(),
          },
          error: null,
        });

      const result = await checkUsageLimit(mockUserId, 'record_download', 10, plan);

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(currentUsage);
      expect(result.limit).toBe(limit);
      expect(result.remaining).toBe(Math.max(0, limit - currentUsage));
    });

    it('should allow unlimited usage in development mode', async () => {
      process.env.NODE_ENV = 'development';

      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          downloads: 100,
          ai_calls: 50,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
        },
        error: null,
      });

      const result = await checkUsageLimit(mockUserId, 'record_download', 1000, 'free_tier');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(999999);
      expect(result.remaining).toBe(999999);
    });

    it('should allow unlimited AI usage when UNLIMITED_AI_USAGE is set', async () => {
      process.env.UNLIMITED_AI_USAGE = 'true';

      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          downloads: 0,
          ai_calls: 100,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
        },
        error: null,
      });

      const result = await checkUsageLimit(mockUserId, 'ai_question', 1000, 'free_tier');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(999999);
    });

    it('should handle unknown plan by denying access (fail closed)', async () => {
      const unknownPlan = 'unknown_plan' as UserPlan;

      const result = await checkUsageLimit(mockUserId, 'record_download', 10, unknownPlan);

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(0);
      expect(result.remaining).toBe(0);
    });

    it('should handle database errors by denying access (fail closed)', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await checkUsageLimit(mockUserId, 'record_download', 10, 'free_tier');

      expect(result.allowed).toBe(false);
    });

    it('should correctly calculate remaining for different plans', async () => {
      const plans: UserPlan[] = ['free_tier', 'small', 'medium', 'large'];

      for (const plan of plans) {
        if (!plan) continue;
        const limit = PLAN_CONFIGS[plan].maxDownloadsPer30Days;
        const currentUsage = Math.floor(limit * 0.5); // 50% usage

        mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({
          data: {
            downloads: currentUsage,
            ai_calls: 0,
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString(),
          },
          error: null,
        });

        const result = await checkUsageLimit(mockUserId, 'record_download', 1, plan);

        expect(result.remaining).toBe(limit - currentUsage);
      }
    });

    it('should handle AI calls limit correctly', async () => {
      const plan: UserPlan = 'free_tier';
      const limit = PLAN_CONFIGS[plan].maxAiCallsPer30Days;

      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({
        data: {
          downloads: 0,
          ai_calls: 2,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
        },
        error: null,
      });

      const result = await checkUsageLimit(mockUserId, 'ai_question', 1, plan);

      expect(result.current).toBe(2);
      expect(result.limit).toBe(limit);
      expect(result.remaining).toBe(limit - 2);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics for a user', async () => {
      const mockStats = {
        downloads: 45,
        ai_calls: 3,
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockStats,
        error: null,
      });

      const result = await getUsageStats('user-123');

      expect(result).toEqual(mockStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_usage_stats', {
        p_user_id: 'user-123',
      });
    });

    it('should return null when database query fails', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getUsageStats('user-123');

      expect(result).toBeNull();
    });

    it('should return zero stats for new user with no usage', async () => {
      const mockStats = {
        downloads: 0,
        ai_calls: 0,
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockStats,
        error: null,
      });

      const result = await getUsageStats('new-user-123');

      expect(result).toEqual(mockStats);
      expect(result?.downloads).toBe(0);
      expect(result?.ai_calls).toBe(0);
    });
  });
});
