/**
 * Grapheme cluster utilities for languages where one visual character
 * spans multiple Unicode codepoints (e.g., Hindi/Devanagari aksharas).
 *
 * Uses Intl.Segmenter (ES2022) — supported in Chrome 87+, Firefox 104+, Safari 15.4+.
 */

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Split a word into characters, respecting grapheme mode.
 * When grapheme_mode is enabled, returns grapheme clusters.
 * Otherwise returns individual codepoints (default behavior).
 */
export function splitWord(word: string, graphemeMode: boolean): string[] {
    if (!graphemeMode) return [...word];
    return [...segmenter.segment(word)].map((s) => s.segment);
}
