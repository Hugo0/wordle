/**
 * 301 redirect: /{lang}/words → /{lang}/archive
 *
 * Preserves SEO equity from the old /words URL (already indexed by Google).
 * Query params (e.g. ?page=2) are forwarded.
 */
export default defineEventHandler((event) => {
    const url = getRequestURL(event);
    const match = url.pathname.match(/^\/([a-z]{2,3}(?:-[a-z]+)?)\/words$/);
    if (match) {
        return sendRedirect(event, `/${match[1]}/archive${url.search}`, 301);
    }
});
