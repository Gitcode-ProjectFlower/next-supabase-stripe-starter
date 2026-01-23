import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockNextRequest } from '@/__tests__/utils/next-request-helper';
import { createMockCandidate, createMockUser } from '@/__tests__/utils/test-helpers';
import { GET, POST } from '@/app/api/selections/route';

// Create mock functions that can be reconfigured per test
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

// Mock dependencies
vi.mock('@/libs/supabase/supabase-server-client', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock('@/libs/ratelimit', () => ({
  searchRateLimiter: {
    limit: vi.fn().mockResolvedValue({
      success: true,
      remaining: 29,
    }),
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

describe('POST /api/selections', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockGetUser.mockResolvedValue({
      data: { user: createMockUser() },
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

  it('should create selection with valid data', async () => {
    mockRpc.mockResolvedValueOnce({
      data: 'test-selection-id',
      error: null,
    });

    const request = createMockNextRequest('http://localhost:3000/api/selections', {
      method: 'POST',
      body: {
        name: 'Test Selection',
        criteria: {
          regions: ['London'],
          sectors: ['technology'],
        },
        top_k: 10,
        items: [createMockCandidate({ doc_id: 'doc-1' }), createMockCandidate({ doc_id: 'doc-2' })],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('selection_id', 'test-selection-id');
    expect(data).toHaveProperty('item_count', 2);
    expect(data).toHaveProperty('expires_at');
  });

  it('should reject when items exceed plan cap', async () => {
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
  });

  it('should reject when top_k exceeds plan cap', async () => {
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
  });

  it('should handle database errors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
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
});

describe('GET /api/selections', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: createMockUser() },
      error: null,
    });
  });

  it('should return list of selections', async () => {
    const mockSelections = [
      {
        id: 'sel-1',
        name: 'Selection 1',
        item_count: 5,
        created_at: new Date().toISOString(),
      },
      {
        id: 'sel-2',
        name: 'Selection 2',
        item_count: 10,
        created_at: new Date().toISOString(),
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
    expect(data.selections[0]).toHaveProperty('id', 'sel-1');
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

  it('should handle database errors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const request = createMockNextRequest('http://localhost:3000/api/selections', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch selections');
  });
});
