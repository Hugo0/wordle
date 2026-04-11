/**
 * View Transitions expand/collapse composable.
 *
 * Uses the View Transitions API (document.startViewTransition) to smoothly
 * animate between collapsed and expanded states. The browser captures
 * old/new snapshots and crossfades at the compositor level — no FLIP math,
 * no getBoundingClientRect, no timing races with double-rAF.
 *
 * The element being expanded must have `view-transition-name` set via CSS
 * (e.g., `view-transition-name: meaning-map` on the content wrapper).
 *
 * Fallback: browsers without View Transitions API get an instant toggle.
 *
 * Usage:
 *   const { isExpanded, elRef, toggle, collapse } = useFlipExpand();
 *   // Template: <div ref="elRef" :class="{ 'my-expanded': isExpanded }">
 */

export interface FlipExpandOptions {
    /** Animation duration in ms (used in CSS, not JS). Default: 300 */
    duration?: number;
}

export function useFlipExpand(_options: FlipExpandOptions = {}) {
    const isExpanded = ref(false);
    const elRef = ref<HTMLElement | null>(null);

    function expand() {
        if (isExpanded.value) return;
        const vt = (document as any).startViewTransition;
        if (vt) {
            vt.call(document, () => {
                isExpanded.value = true;
            });
        } else {
            isExpanded.value = true;
        }
    }

    function collapse() {
        if (!isExpanded.value) return;
        const vt = (document as any).startViewTransition;
        if (vt) {
            vt.call(document, () => {
                isExpanded.value = false;
            });
        } else {
            isExpanded.value = false;
        }
    }

    function toggle() {
        if (isExpanded.value) collapse();
        else expand();
    }

    return { isExpanded, elRef, expand, collapse, toggle };
}
