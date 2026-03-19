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

    const hostname = path.startsWith('static/') ? 'eu-assets.i.posthog.com' : 'eu.i.posthog.com';
    const targetUrl = `https://${hostname}/${path}${search}`;

    // Use server-observed IP only (ignore client x-forwarded-for to prevent spoofing)
    const clientIp = getRequestIP(event, { xForwardedFor: true });

    return proxyRequest(event, targetUrl, {
        headers: {
            host: hostname,
            ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
        },
    });
});
