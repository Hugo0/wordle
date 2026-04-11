/**
 * Global middleware that computes navigation direction before each route
 * change. Sets the singleton `direction` ref from usePageDirection so
 * app.vue can pick the right CSS transition name and the View Transitions
 * plugin can apply directional animations.
 */

import { usePageDirection, getRouteDepth } from '~/composables/usePageDirection';

export default defineNuxtRouteMiddleware((to, from) => {
    const { direction } = usePageDirection();
    const toDepth = getRouteDepth(to.path);
    const fromDepth = getRouteDepth(from.path);

    if (toDepth > fromDepth) {
        direction.value = 'forward';
    } else if (toDepth < fromDepth) {
        direction.value = 'back';
    } else {
        direction.value = 'lateral';
    }
});
