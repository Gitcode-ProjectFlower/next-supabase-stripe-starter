import { beforeEach,describe, expect, it, vi } from 'vitest';

import { createMockNextRequest } from '@/__tests__/utils/next-request-helper';
import { createMockFetchResponse,createMockHaystackResponse, createMockUser } from '@/__tests__/utils/test-helpers';
import { POST } from '@/app/api/lookalikes/search/route';

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

describe('POST /api/lookalikes/search', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return preview results for valid request', async () => {
        const mockHaystackData = createMockHaystackResponse(5);
        (global.fetch as any).mockResolvedValueOnce(
            createMockFetchResponse(mockHaystackData)
        );

        const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
            method: 'POST',
            body: {
                names: ['John Doe'],
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
        expect(data.data.total).toBe(5);
    });

    it('should handle empty names array', async () => {
        const mockHaystackData = createMockHaystackResponse(10);
        (global.fetch as any).mockResolvedValueOnce(
            createMockFetchResponse(mockHaystackData)
        );

        const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
            method: 'POST',
            body: {
                names: [],
                sectors: ['technology'],
                regions: ['London'],
                experience_years: [],
                top_k: 20,
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it('should reject request exceeding plan cap', async () => {
        const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
            method: 'POST',
            body: {
                names: ['John Doe'],
                sectors: [],
                regions: [],
                experience_years: [],
                top_k: 500, // Exceeds small plan cap of 100
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain('exceeded');
    });

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

    it('should apply field masking based on plan', async () => {
        const mockHaystackData = createMockHaystackResponse(3);
        (global.fetch as any).mockResolvedValueOnce(
            createMockFetchResponse(mockHaystackData)
        );

        const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
            method: 'POST',
            body: {
                names: ['John Doe'],
                sectors: [],
                regions: [],
                experience_years: [],
                top_k: 10,
            },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        // Small plan should not include email/phone
        data.data.preview.forEach((item: any) => {
            expect(item).not.toHaveProperty('email');
            expect(item).not.toHaveProperty('phone');
        });
    });

    it('should handle Haystack API errors', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });

        const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
            method: 'POST',
            body: {
                names: ['John Doe'],
                sectors: [],
                regions: [],
                experience_years: [],
                top_k: 10,
            },
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
    });

    it('should validate request body schema', async () => {
        const request = createMockNextRequest('http://localhost:3000/api/lookalikes/search', {
            method: 'POST',
            body: {
                // Missing top_k
                names: ['John Doe'],
            },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
    });
});
