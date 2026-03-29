/**
 * Redirect trailing-slash URLs to non-trailing-slash with 301.
 * Prevents duplicate indexing in Google Search Console.
 * e.g. /en/unlimited/ → /en/unlimited
 */
export default defineEventHandler((event) => {
    const url = getRequestURL(event);
    // Skip root path, API routes, and non-trailing-slash URLs
    if (url.pathname === '/' || url.pathname.startsWith('/api/') || !url.pathname.endsWith('/')) {
        return;
    }
    const cleanPath = url.pathname.slice(0, -1) + url.search;
    return sendRedirect(event, cleanPath, 301);
});
