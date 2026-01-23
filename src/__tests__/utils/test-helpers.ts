import { vi } from 'vitest';

/**
 * Mock Supabase user session
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  };
}

/**
 * Mock Supabase session
 */
export function createMockSession(user = createMockUser()) {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user,
  };
}

/**
 * Mock Haystack API response for similarity search
 */
export function createMockHaystackResponse(count = 3) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push({
      doc_id: `doc-${i}`,
      name: `Test Candidate ${i}`,
      email: `candidate${i}@example.com`,
      phone: `+44 7700 ${String(i).padStart(6, '0')}`,
      city: 'London',
      street: `${i} Test Street`,
      sectors: ['technology'],
      experience_years: 5 + i,
      similarity: 0.95 - i * 0.05,
    });
  }
  return {
    total: count,
    results,
  };
}

/**
 * Mock candidate data
 */
export function createMockCandidate(overrides = {}) {
  return {
    doc_id: 'test-doc-id',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+44 7700 123456',
    city: 'London',
    street: '123 Test Street',
    sectors: ['technology'],
    experience_years: 10,
    similarity: 0.95,
    ...overrides,
  };
}

/**
 * Mock selection data
 */
export function createMockSelection(overrides = {}) {
  return {
    id: 'test-selection-id',
    user_id: 'test-user-id',
    name: 'Test Selection',
    criteria_json: { regions: ['London'], sectors: ['technology'] },
    item_count: 5,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Mock fetch response
 */
export function createMockFetchResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  } as Response;
}

/**
 * Mock rate limiter
 */
export function createMockRateLimiter(shouldLimit = false) {
  return {
    limit: vi.fn().mockResolvedValue({
      success: !shouldLimit,
      limit: 30,
      remaining: shouldLimit ? 0 : 29,
      reset: Date.now() + 60000,
    }),
  };
}
