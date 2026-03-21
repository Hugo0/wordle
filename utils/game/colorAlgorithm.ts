/**
 * Pure color algorithm for Wordle tile coloring.
 *
 * Extracted from stores/game.ts to be independently testable and reusable
 * by both single-board and multi-board game loops.
 */

import type { TileColor, KeyState } from '../types';
import { splitWord } from '../graphemes';
import { toRegularForm } from '../positional';

/**
 * Base CSS class appended to every revealed tile.
 * Empty because design-system.css handles revealed tile styling
 * via `.tile.correct`, `.tile.semicorrect`, `.tile.incorrect` selectors.
 */
const BASE_REVEALED_CLASS = '';

export interface ColorResult {
    /** Semantic colors for each tile in the row */
    colors: TileColor[];
    /** CSS classes for each tile in the row */
    classes: string[];
    /** Canonical tile content (with positional forms corrected) */
    tiles: string[];
    /** Per-tile keyboard key updates (for staggered reveal) */
    keyUpdates: Array<{ char: string; state: KeyState } | undefined>;
}

export interface NormalizationContext {
    /** Whether to split by grapheme clusters (e.g., Korean) */
    graphemeMode: boolean;
    /** Map from diacritic variants to normalized form */
    normalizeMap: Map<string, string>;
    /** Map from final forms to regular forms (Hebrew ך→כ, Greek ς→σ) */
    finalFormReverseMap: Map<string, string>;
}

/**
 * Fully normalize a character (positional variants + diacritics).
 * E.g., "ך" -> "כ" -> "כ", or "ä" -> "a".
 */
function fullNormalize(char: string, ctx: NormalizationContext): string {
    const positionalNorm = toRegularForm(char, ctx.finalFormReverseMap);
    return ctx.normalizeMap.get(positionalNorm) || positionalNorm;
}

/** Check if two characters match considering both normalizations. */
function fullCharsMatch(c1: string, c2: string, ctx: NormalizationContext): boolean {
    return fullNormalize(c1, ctx) === fullNormalize(c2, ctx);
}

/**
 * Compute tile colors for a single row against a target word.
 *
 * Implements standard Wordle rules:
 * - Pass 1: Mark exact position matches (correct/green)
 * - Pass 2: Mark present-but-wrong-position (semicorrect/yellow) and absent (incorrect/gray)
 * - Duplicate letters handled correctly: greens consume first, then yellows
 *
 * @param guessRow - Array of characters in the guess (one per tile)
 * @param targetWord - The target word to compare against
 * @param ctx - Normalization context for the current language
 * @returns ColorResult with colors, CSS classes, canonical tiles, and keyboard updates
 */
export function computeRowColors(
    guessRow: string[],
    targetWord: string,
    ctx: NormalizationContext
): ColorResult {
    const targetChars = splitWord(targetWord, ctx.graphemeMode);
    const wordLength = guessRow.length;

    // Count characters in target using fully normalized forms
    const charCounts: Record<string, number> = {};
    for (const char of targetChars) {
        const normalizedChar = fullNormalize(char, ctx);
        charCounts[normalizedChar] = (charCounts[normalizedChar] || 0) + 1;
    }

    // Initialize result arrays
    const colors: TileColor[] = new Array(wordLength).fill('empty');
    const classes: string[] = new Array(wordLength).fill('');
    const tiles: string[] = [...guessRow];
    const keyUpdates: Array<{ char: string; state: KeyState } | undefined> = new Array(
        wordLength
    ).fill(undefined);

    // First pass: mark correct positions
    for (let i = 0; i < wordLength; i++) {
        const guessChar = guessRow[i];
        const targetChar = targetChars[i];
        if (guessChar && targetChar && fullCharsMatch(guessChar, targetChar, ctx)) {
            colors[i] = 'correct';
            classes[i] = BASE_REVEALED_CLASS ? `correct ${BASE_REVEALED_CLASS}` : 'correct';
            // Keep the user's typed character — don't replace with target's form.
            // Replacing would leak diacritic info (e.g., typing "perro" showing "ó"
            // reveals the target has an accent before the puzzle is solved).
            // Whole-word auto-correction (e.g., "borde" → "börde") is handled
            // separately in the game store after checkWord().
            keyUpdates[i] = { char: guessChar, state: 'key-correct' as KeyState };
            const normalizedChar = fullNormalize(guessChar, ctx);
            const count = charCounts[normalizedChar];
            if (count !== undefined) charCounts[normalizedChar] = count - 1;
        }
    }

    // Second pass: mark semi-correct and incorrect
    for (let i = 0; i < wordLength; i++) {
        const guessChar = guessRow[i];
        if (!guessChar || colors[i] === 'correct') continue;

        const normalizedGuess = fullNormalize(guessChar, ctx);
        const count = charCounts[normalizedGuess];
        const targetHasChar = targetChars.some((tc) => fullCharsMatch(guessChar, tc, ctx));

        if (targetHasChar && count !== undefined && count > 0) {
            colors[i] = 'semicorrect';
            classes[i] = BASE_REVEALED_CLASS ? `semicorrect ${BASE_REVEALED_CLASS}` : 'semicorrect';
            keyUpdates[i] = { char: guessChar, state: 'key-semicorrect' as KeyState };
            charCounts[normalizedGuess] = count - 1;
        } else {
            colors[i] = 'incorrect';
            classes[i] = BASE_REVEALED_CLASS ? `incorrect ${BASE_REVEALED_CLASS}` : 'incorrect';
            keyUpdates[i] = { char: guessChar, state: 'key-incorrect' as KeyState };
        }
    }

    return { colors, classes, tiles, keyUpdates };
}
