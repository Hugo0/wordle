/**
 * useAutoHeight — smoothly tween an element's height when its content changes.
 *
 * Watches the element via ResizeObserver. When the intrinsic height changes,
 * pins the element at the old height and animates to the new one via WAAPI.
 * After the animation, the fixed height is removed so the element flows
 * naturally again.
 *
 * Usage:
 *   const { elRef } = useAutoHeight();
 *   // Template: <div ref="elRef">...dynamic content...</div>
 *
 * The element MUST have `overflow: clip` (or hidden) during animation to
 * prevent content from visually overflowing while height is constrained.
 * The composable applies this automatically during the tween.
 */

import { onMounted, onUnmounted, ref, type Ref } from 'vue';

export interface AutoHeightOptions {
    /** Animation duration in ms. Default: 250 */
    duration?: number;
    /** CSS easing. Default: cubic-bezier(0.22, 1, 0.36, 1) */
    easing?: string;
    /** Minimum height change (px) to trigger animation. Prevents micro-jitter. Default: 4 */
    threshold?: number;
}

export function useAutoHeight(options: AutoHeightOptions = {}): { elRef: Ref<HTMLElement | null> } {
    const {
        duration = 250,
        easing = 'cubic-bezier(0.22, 1, 0.36, 1)',
        threshold = 4,
    } = options;

    const elRef = ref<HTMLElement | null>(null);
    let observer: ResizeObserver | null = null;
    let lastHeight = 0;
    let animating = false;

    function onResize(entries: ResizeObserverEntry[]) {
        const entry = entries[0];
        if (!entry || !elRef.value) return;

        const newHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

        // Skip if we're mid-animation (we set height explicitly, which
        // re-triggers ResizeObserver — ignore those echoes).
        if (animating) return;

        // Skip tiny changes
        if (Math.abs(newHeight - lastHeight) < threshold) {
            lastHeight = newHeight;
            return;
        }

        // First observation — just record, don't animate
        if (lastHeight === 0) {
            lastHeight = newHeight;
            return;
        }

        const oldHeight = lastHeight;
        lastHeight = newHeight;

        const el = elRef.value;
        animating = true;

        // Pin at old height + clip overflow
        el.style.height = `${oldHeight}px`;
        el.style.overflow = 'clip';

        // Tween to new height
        const anim = el.animate(
            [{ height: `${oldHeight}px` }, { height: `${newHeight}px` }],
            { duration, easing, fill: 'forwards' }
        );

        anim.onfinish = () => {
            // Release — let the element flow naturally
            el.style.height = '';
            el.style.overflow = '';
            animating = false;
        };
    }

    onMounted(() => {
        if (!elRef.value) return;
        observer = new ResizeObserver(onResize);
        observer.observe(elRef.value);
    });

    onUnmounted(() => {
        observer?.disconnect();
        observer = null;
    });

    return { elRef };
}
