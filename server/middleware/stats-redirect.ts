/**
 * 301 redirect: /stats → /profile
 *
 * Preserves bookmarks and SEO equity from the old /stats URL.
 * Hash fragments (e.g. #statistics) are preserved client-side by the browser.
 */
export default defineEventHandler((event) => {
    const url = getRequestURL(event);
    if (url.pathname === '/stats') {
        return sendRedirect(event, `/profile${url.search}`, 301);
    }
});
