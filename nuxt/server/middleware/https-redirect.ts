/**
 * HTTP → HTTPS redirect (non-localhost).
 */
export default defineEventHandler((event) => {
    const url = getRequestURL(event);
    if (
        url.protocol === 'http:' &&
        !url.hostname.includes('localhost') &&
        !url.hostname.includes('127.0.0')
    ) {
        return sendRedirect(event, url.href.replace('http:', 'https:'), 301);
    }
});
