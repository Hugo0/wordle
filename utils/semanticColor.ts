/**
 * Semantic Explorer color gradient — shared by the proximity meter,
 * guess-list scores, and map dots so all three agree visually.
 *
 * The gradient matches the 4 stops used by the proximity bar CSS:
 *   0%  muted (gray)   → 30% orange → 50% semicorrect → 90% correct.
 *
 * Both SemanticMap.vue (canvas) and Vue templates call sampleGradient()
 * with a resolved `SemanticGradient` built from CSS tokens on mount.
 */

import { lerp } from '~/utils/easing';

type RGB = [number, number, number];
type Stop = { pos: number; rgb: RGB };
export type SemanticGradient = Stop[];

function hexToRgb(hex: string): RGB {
    const h = hex.replace('#', '').trim();
    const full =
        h.length === 3
            ? h
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToCss([r, g, b]: RGB): string {
    return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

export function buildSemanticGradient(tokens: {
    muted: string;
    semicorrect: string;
    correct: string;
}): SemanticGradient {
    return [
        { pos: 0.0, rgb: hexToRgb(tokens.muted) },
        { pos: 0.3, rgb: hexToRgb('#c96922') },
        { pos: 0.5, rgb: hexToRgb(tokens.semicorrect) },
        { pos: 0.9, rgb: hexToRgb(tokens.correct) },
    ];
}

/** Read design-system CSS tokens and build the gradient. Falls back to
 *  hardcoded defaults during SSR or when tokens aren't available. */
export function buildSemanticGradientFromCSS(): SemanticGradient {
    const fallback = { muted: '#8c8c8c', semicorrect: '#b8860b', correct: '#2d8544' };
    if (typeof document === 'undefined') return buildSemanticGradient(fallback);
    const s = getComputedStyle(document.documentElement);
    return buildSemanticGradient({
        muted: s.getPropertyValue('--color-muted').trim() || fallback.muted,
        semicorrect: s.getPropertyValue('--color-semicorrect').trim() || fallback.semicorrect,
        correct: s.getPropertyValue('--color-correct').trim() || fallback.correct,
    });
}

export function sampleGradient(similarity: number, stops: SemanticGradient): string {
    const x = Math.max(0, Math.min(1, similarity));
    if (x <= stops[0]!.pos) return rgbToCss(stops[0]!.rgb);
    const last = stops[stops.length - 1]!;
    if (x >= last.pos) return rgbToCss(last.rgb);
    for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i]!;
        const b = stops[i + 1]!;
        if (x >= a.pos && x <= b.pos) {
            const t = (x - a.pos) / (b.pos - a.pos);
            return rgbToCss([
                lerp(a.rgb[0], b.rgb[0], t),
                lerp(a.rgb[1], b.rgb[1], t),
                lerp(a.rgb[2], b.rgb[2], t),
            ]);
        }
    }
    return rgbToCss(last.rgb);
}
