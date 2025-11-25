import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export class IdempotencyHandler {
    private static readonly TTL_SECONDS = 86400;

    static async checkIdempotency(
        idempotencyKey: string,
        userId: string
    ): Promise<{ exists: boolean; result?: any }> {
        const key = `idempotency:${userId}:${idempotencyKey}`;

        try {
            const cached = await redis.get(key);

            if (cached) {
                return { exists: true, result: cached };
            }

            return { exists: false };
        } catch (error) {
            console.error('Error checking idempotency:', error);
            return { exists: false };
        }
    }

    static async storeResult(
        idempotencyKey: string,
        userId: string,
        result: any
    ): Promise<void> {
        const key = `idempotency:${userId}:${idempotencyKey}`;

        try {
            await redis.setex(key, this.TTL_SECONDS, JSON.stringify(result));
        } catch (error) {
            console.error('Error storing idempotency result:', error);
        }
    }

    static generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
}

export function getIdempotencyKey(request: Request): string | null {
    return request.headers.get('idempotency-key') ||
        request.headers.get('x-idempotency-key');
}

export function getRequestId(request: Request): string {
    return request.headers.get('x-request-id') ||
        IdempotencyHandler.generateRequestId();
}
