/**
 * Diacritic normalization utilities for hybrid accent handling.
 *
 * This module enables users to type simplified characters (e.g., "borde")
 * that match words with diacritics (e.g., "börde").
 *
 * IMPORTANT: Some languages treat diacritics as DISTINCT letters that should
 * NOT be normalized. These languages should NOT have a diacritic_map in their
 * language_config.json:
 * - Norwegian (nb/nn): æ, ø, å
 * - Swedish (sv): ä, ö
 * - Danish (da): æ, ø, å
 * - Finnish (fi): ä, ö
 * - Polish (pl): ą, ę, ł, ń, etc.
 * - Turkish (tr): ı vs i (dotless vs dotted)
 * - Icelandic (is): þ, ð, etc.
 */

export interface DiacriticConfig {
    diacritic_map?: Record<string, string[]>;
}

/**
 * Build a reverse lookup map from diacritics to base characters.
 * Example: { "a": ["ä", "á"] } → Map { "ä" → "a", "á" → "a" }
 */
export function buildNormalizeMap(config: DiacriticConfig): Map<string, string> {
    const map = new Map<string, string>();
    if (!config.diacritic_map) return map;

    for (const [base, variants] of Object.entries(config.diacritic_map)) {
        for (const variant of variants) {
            map.set(variant, base);
        }
    }
    return map;
}

/**
 * Normalize a single character using the normalize map.
 * Returns the base character if the input is a diacritic variant,
 * otherwise returns the character unchanged.
 */
export function normalizeChar(char: string, normalizeMap: Map<string, string>): string {
    return normalizeMap.get(char) || char;
}

/**
 * Normalize an entire word by normalizing each character.
 */
export function normalizeWord(word: string, normalizeMap: Map<string, string>): string {
    return [...word].map((c) => normalizeChar(c, normalizeMap)).join('');
}

/**
 * Check if two characters match, considering diacritic equivalence.
 * Used for color comparison in the game logic.
 */
export function charsMatch(
    guessChar: string,
    targetChar: string,
    normalizeMap: Map<string, string>
): boolean {
    return normalizeChar(guessChar, normalizeMap) === normalizeChar(targetChar, normalizeMap);
}

/**
 * Build a normalized word lookup map.
 * Maps normalized forms to their canonical (original) forms.
 * First word in the list wins in case of conflicts.
 */
export function buildNormalizedWordMap(
    wordList: string[],
    normalizeMap: Map<string, string>
): Map<string, string> {
    const map = new Map<string, string>();
    for (const word of wordList) {
        const normalized = normalizeWord(word, normalizeMap);
        // First word wins (in case of conflicts)
        if (!map.has(normalized)) {
            map.set(normalized, word);
        }
    }
    return map;
}
