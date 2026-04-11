/**
 * useAnimatedNumber — smoothly tween a reactive number via rAF.
 *
 * Returns a readonly ref that chases the source ref. When the source changes,
 * the displayed value animates from its current value to the new target over
 * `duration` ms with an easing function. Used for rank counters, score
 * readouts, anywhere a number should feel alive instead of snapping.
 *
 * Safe to use across page navigations — the rAF loop is torn down on unmount.
 */

import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { easeOutCubic, type EasingFn } from '~/utils/easing';

export function useAnimatedNumber(
    source: Ref<number>,
    opts: { duration?: number; easing?: EasingFn } = {}
): Ref<number> {
    const duration = opts.duration ?? 700;
    const easing = opts.easing ?? easeOutCubic;

    const display = ref(source.value);
    let rafId: number | null = null;
    let from = source.value;
    let to = source.value;
    let startTime = 0;

    function tick(now: number) {
        const elapsed = now - startTime;
        const t = Math.max(0, Math.min(1, elapsed / duration));
        const eased = easing(t);
        display.value = from + (to - from) * eased;
        if (t < 1) {
            rafId = requestAnimationFrame(tick);
        } else {
            display.value = to;
            rafId = null;
        }
    }

    watch(source, (next) => {
        if (next === display.value) return;
        from = display.value;
        to = next;
        startTime = performance.now();
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);
    });

    onBeforeUnmount(() => {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    });

    return display;
}
