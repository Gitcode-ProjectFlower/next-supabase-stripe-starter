import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

if (!hasRedis) {
  console.warn(
    '[RateLimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing — rate limiting will be disabled'
  );
}

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const searchRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
      prefix: 'ratelimit:search',
    })
  : null;

export const askRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:ask',
    })
  : null;

export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

export const contactRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:contact',
    })
  : null;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function checkRateLimit(
  identifier: string,
  limiterOrKey: Ratelimit | 'search' | 'ask' | 'auth' | 'contact'
) {
  let limiter: Ratelimit | null = null;
  if (typeof limiterOrKey === 'string') {
    limiter =
      limiterOrKey === 'search'
        ? searchRateLimiter
        : limiterOrKey === 'ask'
        ? askRateLimiter
        : limiterOrKey === 'auth'
        ? authRateLimiter
        : contactRateLimiter;
  } else {
    limiter = limiterOrKey;
  }

  if (!limiter) {
    // If no limiter (e.g. Redis missing), allow everything
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      current: 0,
      reset: new Date(),
    };
  }

  let result;
  try {
    result = await limiter.limit(identifier);
  } catch (error) {
    // Redis blip (DNS, network, expired instance) must not 500 the product:
    // fail open like the no-Redis case above, but loudly.
    console.error('[RateLimit] Redis request failed, allowing request:', error);
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      current: 0,
      reset: new Date(),
    };
  }

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    current: result.limit - result.remaining,
    reset: new Date(result.reset),
  };
}
