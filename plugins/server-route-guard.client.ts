/**
 * Server Route Guard (client-only)
 *
 * Safety net for stale service workers or PWA caches that accidentally
 * serve the SPA shell for server-only routes (/auth/*, /api/*).
 * Forces a full page navigation to the server instead of a 404 in the
 * client-side Vue router.
 */
export default defineNuxtPlugin(() => {
    const router = useRouter();

    router.beforeEach((to) => {
        const path = to.fullPath;
        if (path.startsWith('/auth/') || path.startsWith('/api/')) {
            // Force full server navigation — bypass the SPA router
            window.location.href = path;
            return false;
        }
    });
});
