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

export async function checkRateLimit(identifier: string, limiterOrKey: Ratelimit | 'search' | 'ask') {
  let limiter: Ratelimit | null = null;
  if (typeof limiterOrKey === 'string') {
    limiter = limiterOrKey === 'search' ? searchRateLimiter : askRateLimiter;
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

  const result = await limiter.limit(identifier);

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    current: result.limit - result.remaining,
    reset: new Date(result.reset),
  };
}
