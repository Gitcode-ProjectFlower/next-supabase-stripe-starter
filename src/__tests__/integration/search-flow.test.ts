import { createMockNextRequest } from '@/__tests__/utils/next-request-helper';
import { createMockFetchResponse, createMockHaystackResponse, createMockUser } from '@/__tests__/utils/test-helpers';
import { POST } from '@/app/api/lookalikes/search/route';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/libs/supabase/supabase-server-client', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      }),
    },
    from: vi.fn(() => ({
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
    })),
  })),
}));

vi.mock('@/libs/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 30,
    remaining: 29,
    reset: new Date(Date.now() + 60000),
  }),
  searchRateLimiter: {},
  askRateLimiter: {},
}));

// Mock global fetch
global.fetch = vi.fn();

describe('Integration: Search Flow', () => {
  beforeAll(async () => {
    // Setup: Could initialize test database here if using real DB
    console.log('🧪 Starting search flow integration tests');
  });

  afterAll(async () => {
    // Cleanup: Clean up test data
    console.log('✅ Search flow integration tests complete');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for successful Haystack response
    (global.fetch as any).mockResolvedValue(createMockFetchResponse(createMockHaystackResponse(10)));
  });

  describe('Search with names', () => {
    it('should return preview results for valid search', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: ['John Doe', 'Jane Smith'],
          sectors: [],
          regions: [],
          experience_years: [],
          top_k: 10,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('preview');
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('plan');
      expect(data.data).toHaveProperty('limit');
    });

    it('should handle multiple names correctly', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: ['Alice Johnson', 'Bob Williams', 'Charlie Brown'],
          sectors: [],
          regions: [],
          experience_years: [],
          top_k: 20,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.preview)).toBe(true);
    });
  });

  describe('Search with filters only', () => {
    it('should return filtered results without names', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: [],
          sectors: ['technology', 'finance'],
          regions: ['London', 'Manchester'],
          experience_years: [],
          top_k: 50,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preview).toBeDefined();
    });

    it('should handle single filter correctly', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: [],
          sectors: ['healthcare'],
          regions: [],
          experience_years: [],
          top_k: 25,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle experience years filter', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: [],
          sectors: [],
          regions: [],
          experience_years: [5, 10, 15],
          top_k: 30,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Plan cap enforcement', () => {
    it('should enforce small plan cap (100)', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: [],
          sectors: [],
          regions: [],
          experience_years: [],
          top_k: 150, // Exceeds small plan limit
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('exceeded');
    });

    it('should allow requests within plan cap', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: [],
          sectors: [],
          regions: [],
          experience_years: [],
          top_k: 50, // Within small plan limit
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Field masking by plan', () => {
    it('should mask sensitive fields for small plan', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: ['Test User'],
          sectors: [],
          regions: [],
          experience_years: [],
          top_k: 5,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Small plan should not include email/phone
      if (data.data.preview.length > 0) {
        const firstResult = data.data.preview[0];
        expect(firstResult).not.toHaveProperty('email');
        expect(firstResult).not.toHaveProperty('phone');
        expect(firstResult).toHaveProperty('name');
        expect(firstResult).toHaveProperty('city');
      }
    });

    it('should always include doc_id in results', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: ['Test User'],
          sectors: [],
          regions: [],
          experience_years: [],
          top_k: 3,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.data.preview.length > 0) {
        data.data.preview.forEach((result: any) => {
          expect(result).toHaveProperty('doc_id');
        });
      }
    });
  });

  describe('Empty search', () => {
    it('should return all candidates up to top_k for empty search', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: [],
          sectors: [],
          regions: [],
          experience_years: [],
          top_k: 20,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preview).toBeDefined();
      expect(data.data.total).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should reject invalid filter keys', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: [],
          sectors: [],
          regions: [],
          experience_years: [],
          filters: {
            invalid_key: ['value'],
          },
          top_k: 10,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid filter keys');
    });

    it('should validate required fields', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
        method: 'POST',
        body: {
          names: [],
          // Missing top_k
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
