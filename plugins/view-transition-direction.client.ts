/**
 * Client plugin: syncs the navigation direction from usePageDirection
 * into a `data-page-direction` attribute on <html> right before the
 * View Transitions API captures the new snapshot.
 *
 * The CSS selectors `html[data-page-direction="forward"]::view-transition-*`
 * read this attribute to apply the correct directional animation.
 *
 * Only runs client-side (`.client.ts` suffix). No-op when View
 * Transitions aren't supported (the hook simply won't fire).
 */

import { usePageDirection } from '~/composables/usePageDirection';

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.hook('page:view-transition:start', () => {
        const { direction } = usePageDirection();
        document.documentElement.dataset.pageDirection = direction.value;
    });
});
