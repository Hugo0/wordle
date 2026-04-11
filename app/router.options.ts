/**
 * Custom scroll behavior — preserve scroll position when navigating between
 * word pages (/en/word/dog → /en/word/cat) since the page component stays
 * mounted (same key). All other navigations scroll to top as default.
 */
import type { RouterConfig } from '@nuxt/schema';

export default <RouterConfig>{
    scrollBehavior(to, from, savedPosition) {
        // Browser back/forward: restore saved position
        if (savedPosition) return savedPosition;

        // Word page → word page (same component, different slug):
        // preserve current scroll so the graph stays visible.
        const isWordPage = (path: string) => /^\/[a-z]{2,5}\/word\//.test(path);
        if (isWordPage(to.path) && isWordPage(from.path)) {
            return false; // don't scroll
        }

        // Everything else: scroll to top
        return { top: 0 };
    },
};
