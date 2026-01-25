/**
 * Positional character normalization for languages with context-dependent letter forms.
 *
 * Some languages have letters that change form based on their position in a word:
 * - Hebrew: 5 letters have "sofit" (final) forms used only at word end
 * - Greek: sigma has a final form (ς) used only at word end
 *
 * This module provides utilities to:
 * 1. Auto-convert regular forms to final forms when at word end
 * 2. Normalize both forms for matching purposes
 */

export interface PositionalConfig {
    /**
     * Map of regular form to final form.
     * Example for Hebrew: { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" }
     * Example for Greek: { "σ": "ς" }
     */
    final_form_map?: Record<string, string>;
}

/**
 * Build a reverse map from final forms to regular forms.
 * Used for normalization when comparing guesses to answers.
 */
export function buildFinalFormReverseMap(config: PositionalConfig): Map<string, string> {
    const map = new Map<string, string>();
    if (!config.final_form_map) return map;

    for (const [regular, final] of Object.entries(config.final_form_map)) {
        map.set(final, regular);
    }
    return map;
}

/**
 * Convert a character to its final form if it's at the end of a word.
 * Returns the final form if applicable, otherwise returns the character unchanged.
 *
 * @param char - The character to potentially convert
 * @param isAtEnd - Whether this character is at the end of the word
 * @param config - The positional configuration for the language
 */
export function toFinalForm(char: string, isAtEnd: boolean, config: PositionalConfig): string {
    if (!isAtEnd || !config.final_form_map) return char;
    return config.final_form_map[char] || char;
}

/**
 * Convert a character from its final form back to regular form.
 * Used when a character is no longer at the end (user typed more letters).
 *
 * @param char - The character to potentially convert back
 * @param reverseMap - Map from final forms to regular forms
 */
export function toRegularForm(char: string, reverseMap: Map<string, string>): string {
    return reverseMap.get(char) || char;
}

/**
 * Apply positional normalization to an entire word.
 * Ensures final forms are used correctly at word end.
 *
 * @param word - The word to normalize
 * @param config - The positional configuration
 */
export function normalizePositional(word: string, config: PositionalConfig): string {
    if (!config.final_form_map || word.length === 0) return word;

    const chars = [...word];
    const lastIdx = chars.length - 1;
    const reverseMap = buildFinalFormReverseMap(config);

    // Convert all characters except the last to regular form
    for (let i = 0; i < lastIdx; i++) {
        chars[i] = toRegularForm(chars[i]!, reverseMap);
    }

    // Convert the last character to final form if applicable
    chars[lastIdx] = toFinalForm(chars[lastIdx]!, true, config);

    return chars.join('');
}

/**
 * Normalize a character for matching purposes.
 * Both regular and final forms normalize to the same value.
 *
 * @param char - The character to normalize
 * @param reverseMap - Map from final forms to regular forms
 */
export function normalizePositionalChar(char: string, reverseMap: Map<string, string>): string {
    // Final forms normalize to their regular form
    return reverseMap.get(char) || char;
}

/**
 * Check if two characters match, considering positional variants.
 * This is used for color calculation - a regular כ should match final ך.
 */
export function positionalCharsMatch(
    char1: string,
    char2: string,
    reverseMap: Map<string, string>
): boolean {
    const norm1 = normalizePositionalChar(char1, reverseMap);
    const norm2 = normalizePositionalChar(char2, reverseMap);
    return norm1 === norm2;
}
