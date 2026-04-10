/**
 * In-memory rate limiter for API endpoints.
 *
 * Tracks requests per IP with a sliding window. No external dependencies.
 * Sufficient for single-server deployments (Render). For multi-server,
 * replace with Redis-backed limiter.
 */
import type { H3Event } from 'h3';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
        for (const [key, entry] of store) {
            if (now > entry.resetAt) store.delete(key);
        }
    }
}, 5 * 60 * 1000);

function getClientIp(event: H3Event): string {
    return (
        getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
        getRequestHeader(event, 'x-real-ip') ||
        'unknown'
    );
}

/**
 * Check rate limit for a given scope + IP.
 * Throws 429 if limit exceeded.
 *
 * @param event - H3 event
 * @param scope - Namespace (e.g., 'auth:login', 'auth:register')
 * @param maxRequests - Max requests in the window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(
    event: H3Event,
    scope: string,
    maxRequests: number,
    windowMs: number
): void {
    if (!stores.has(scope)) stores.set(scope, new Map());
    const store = stores.get(scope)!;

    const ip = getClientIp(event);
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return;
    }

    entry.count++;
    if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        setResponseHeader(event, 'Retry-After', String(retryAfter));
        throw createError({
            statusCode: 429,
            message: 'Too many requests. Please try again later.',
        });
    }
}
