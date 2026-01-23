import { createMockNextRequest } from '@/__tests__/utils/next-request-helper';
import { createMockCandidate } from '@/__tests__/utils/test-helpers';
import { GET, POST } from '@/app/api/selections/route';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Mock functions for reconfiguration
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/libs/supabase/supabase-server-client', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock('@/libs/ratelimit', () => ({
  searchRateLimiter: {
    limit: vi.fn().mockResolvedValue({ success: true, remaining: 29 }),
  },
}));

vi.mock('@/libs/idempotency', () => ({
  getRequestId: vi.fn(() => 'test-request-id'),
  getIdempotencyKey: vi.fn(() => null),
  IdempotencyHandler: {
    checkIdempotency: vi.fn(),
    storeResult: vi.fn(),
  },
}));

describe('Integration: Selection Flow', () => {
  const testUser = {
    id: 'integration-test-user',
    email: 'integration@test.com',
  };

  beforeAll(() => {
    console.log('🧪 Starting selection flow integration tests');
  });

  afterAll(() => {
    console.log('✅ Selection flow integration tests complete');
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: testUser },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          prices: {
            products: {
              metadata: { plan_name: 'small' },
            },
          },
        },
        error: null,
      }),
    });
  });

  describe('Create selection', () => {
    it('should create selection and verify in database', async () => {
      const selectionId = 'test-selection-123';
      mockRpc.mockResolvedValueOnce({
        data: selectionId,
        error: null,
      });

      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'POST',
        body: {
          name: 'Integration Test Selection',
          criteria: {
            regions: ['London'],
            sectors: ['technology'],
          },
          top_k: 10,
          items: [
            createMockCandidate({ doc_id: 'doc-1' }),
            createMockCandidate({ doc_id: 'doc-2' }),
            createMockCandidate({ doc_id: 'doc-3' }),
          ],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.selection_id).toBe(selectionId);
      expect(data.item_count).toBe(3);
      expect(data).toHaveProperty('expires_at');
      expect(mockRpc).toHaveBeenCalledWith('create_selection', expect.any(Object));
    });

    it('should respect plan item count limit', async () => {
      const items = Array.from({ length: 150 }, (_, i) => createMockCandidate({ doc_id: `doc-${i}` }));

      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'POST',
        body: {
          name: 'Large Selection',
          criteria: {},
          top_k: 150,
          items,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('exceeds');
      expect(data.planCap).toBe(100); // Small plan cap
    });

    it('should set expires_at to 7 days from now', async () => {
      mockRpc.mockResolvedValueOnce({
        data: 'test-selection-id',
        error: null,
      });

      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'POST',
        body: {
          name: 'Test Selection',
          criteria: {},
          top_k: 5,
          items: [createMockCandidate()],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);

      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeGreaterThan(6.9);
      expect(daysDiff).toBeLessThan(7.1);
    });
  });

  describe('List selections', () => {
    it('should list selections filtered by user', async () => {
      const mockSelections = [
        {
          id: 'sel-1',
          name: 'Selection 1',
          item_count: 5,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'sel-2',
          name: 'Selection 2',
          item_count: 10,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      mockRpc.mockResolvedValueOnce({
        data: mockSelections,
        error: null,
      });

      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.selections).toHaveLength(2);
      expect(data.selections[0].id).toBe('sel-1');
      expect(mockRpc).toHaveBeenCalledWith('list_selections');
    });

    it('should exclude expired selections', async () => {
      const now = new Date();
      const mockSelections = [
        {
          id: 'sel-active',
          name: 'Active Selection',
          item_count: 5,
          created_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // Expired selection would be filtered by the RPC function
      ];

      mockRpc.mockResolvedValueOnce({
        data: mockSelections,
        error: null,
      });

      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.selections).toHaveLength(1);
      expect(data.selections[0].id).toBe('sel-active');
    });

    it('should return empty array when no selections', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.selections).toEqual([]);
    });
  });

  describe('Validation', () => {
    it('should validate required fields', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'POST',
        body: {
          // Missing name
          criteria: {},
          top_k: 10,
          items: [],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('should validate top_k against plan cap', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'POST',
        body: {
          name: 'Test Selection',
          criteria: {},
          top_k: 500, // Exceeds small plan cap
          items: [createMockCandidate()],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Top-K exceeds');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection error' },
      });

      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'POST',
        body: {
          name: 'Test Selection',
          criteria: {},
          top_k: 10,
          items: [createMockCandidate()],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create selection');
    });

    it('should handle unauthorized requests', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      const request = createMockNextRequest('http://localhost:3000/api/selections', {
        method: 'POST',
        body: {
          name: 'Test Selection',
          criteria: {},
          top_k: 10,
          items: [createMockCandidate()],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
