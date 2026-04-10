/**
 * usePageDirection — tracks navigation direction (forward/back/lateral)
 * based on route depth. Used by app.vue for dynamic transition names
 * and by the View Transitions plugin for directional CSS animations.
 *
 * Depth map:
 *   /                              → 0  (home)
 *   /{lang}                        → 1  (game modes, archive, strategy)
 *   /stats, /accessibility         → 1
 *   /{lang}/word/{slug}            → 2  (word detail)
 *
 * Forward = deeper, Back = shallower, Lateral = same depth.
 */

import { ref } from 'vue';

export type PageDirection = 'forward' | 'back' | 'lateral';

export function getRouteDepth(path: string): number {
    const clean = path.replace(/\/$/, '') || '/';

    // Home
    if (clean === '/') return 0;

    // Word detail: /{lang}/word/{slug}
    if (/^\/[a-z]{2,5}\/word\//.test(clean)) return 2;

    // Everything else at /{lang}/... or /stats etc is depth 1
    return 1;
}

// Singleton reactive state — shared across middleware, app.vue, and plugins
const direction = ref<PageDirection>('lateral');

export function usePageDirection() {
    return { direction, getRouteDepth };
}
