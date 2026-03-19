/**
 * PostHog reverse proxy — forwards /t/* to eu.i.posthog.com
 *
 * Defeats ad blockers by routing PostHog traffic through our own domain.
 * Preserves client IP for geolocation via x-forwarded-for.
 */
export default defineEventHandler(async (event) => {
    const path = event.context.params?.path || '';
    const url = getRequestURL(event);
    const search = url.search || '';

    // Reject oversized payloads (PostHog batches are typically <10KB)
    const contentLength = getHeader(event, 'content-length');
    if (contentLength && parseInt(contentLength, 10) > 1_000_000) {
        setResponseStatus(event, 413);
        return 'Payload too large';
    }

    const hostname = path.startsWith('static/') ? 'eu-assets.i.posthog.com' : 'eu.i.posthog.com';
    const targetUrl = `https://${hostname}/${path}${search}`;

    // Forward client IP for geolocation
    const clientIp = getHeader(event, 'x-forwarded-for') || getRequestIP(event);

    return proxyRequest(event, targetUrl, {
        headers: {
            host: hostname,
            ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
        },
    });
});
