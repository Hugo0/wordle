/**
 * FLIP expand/collapse animation composable.
 *
 * Animates an element between its natural layout position and a CSS-defined
 * final state (e.g. fixed fullscreen overlay) using the FLIP technique.
 *
 * Both expand and collapse are animated: expand scales up from origin,
 * collapse reverses back. No visibility:hidden flicker — the element stays
 * visible throughout, with the FLIP inversion applied as the first frame.
 *
 * Usage:
 *   const { isExpanded, elRef, toggle, collapse } = useFlipExpand();
 *   // Template: <div ref="elRef" :class="{ 'my-expanded': isExpanded }">
 */

export interface FlipExpandOptions {
    /** Animation duration in ms. Default: 350 */
    duration?: number;
    /** CSS easing. Default: cubic-bezier(0.22, 1, 0.36, 1) (decelerate) */
    easing?: string;
    /** Starting opacity for expand. Default: 0.85 */
    fromOpacity?: number;
}

export function useFlipExpand(options: FlipExpandOptions = {}) {
    const {
        duration = 350,
        easing = 'cubic-bezier(0.22, 1, 0.36, 1)',
        fromOpacity = 0.85,
    } = options;

    const isExpanded = ref(false);
    const elRef = ref<HTMLElement | null>(null);
    let currentAnimation: Animation | null = null;

    function flipAnimate(first: DOMRect, last: DOMRect, reverse: boolean) {
        const el = elRef.value;
        if (!el) return;

        const dx = first.left + first.width / 2 - (last.left + last.width / 2);
        const dy = first.top + first.height / 2 - (last.top + last.height / 2);
        const scale = first.width / Math.max(last.width, 1);

        el.style.transformOrigin = 'center center';
        currentAnimation?.cancel();

        const fromFrame = {
            transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
            opacity: fromOpacity,
        };
        const toFrame = {
            transform: 'translate(0, 0) scale(1)',
            opacity: 1,
        };

        const frames = reverse ? [toFrame, fromFrame] : [fromFrame, toFrame];
        const dur = reverse ? Math.round(duration * 0.75) : duration;

        // fill: 'none' instead of 'forwards' — with 'forwards' the last
        // keyframe's transform persists after the animation ends, distorting
        // the element's natural layout when collapsing back to normal flow.
        currentAnimation = el.animate(frames, { duration: dur, easing, fill: 'none' });
        currentAnimation.onfinish = () => {
            currentAnimation = null;
            el.style.transformOrigin = '';
            // Ensure no residual transform from the animation
            el.style.transform = '';
        };
    }

    function expand() {
        const el = elRef.value;
        if (!el || isExpanded.value) return;

        currentAnimation?.cancel();
        const first = el.getBoundingClientRect();
        isExpanded.value = true;

        // Double-rAF after Vue flush: ensures the browser has fully laid
        // out the element in its final (expanded) position.
        nextTick(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!elRef.value) return;
                    const last = elRef.value.getBoundingClientRect();
                    flipAnimate(first, last, false);
                });
            });
        });
    }

    function collapse() {
        const el = elRef.value;
        if (!el || !isExpanded.value) return;

        currentAnimation?.cancel();
        const first = el.getBoundingClientRect();
        isExpanded.value = false;

        nextTick(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!elRef.value) return;
                    const last = elRef.value.getBoundingClientRect();
                    // Reverse: animate from expanded position back to collapsed
                    flipAnimate(first, last, true);
                });
            });
        });
    }

    function toggle() {
        if (isExpanded.value) collapse();
        else expand();
    }

    return { isExpanded, elRef, expand, collapse, toggle };
}
