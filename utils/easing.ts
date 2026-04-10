/**
 * Shared easing functions. Keep this file tiny and dependency-free so
 * anything in composables, components, or server can import without
 * pulling in Vue or framework runtime.
 */

export type EasingFn = (t: number) => number;

/** Decelerating cubic. Default "feels natural" easing for UI motion. */
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);

/** Overshoot bounce used for scale-in pops (new dots, new-best hero). */
export const easeOutBack: EasingFn = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Linear interpolation between a and b at parameter t. */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
