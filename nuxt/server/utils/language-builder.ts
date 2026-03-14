/**
 * Language builder — port of the Language class from webapp/app.py.
 *
 * Builds the complete language data object for a game session, including:
 * - Daily word selection
 * - Keyboard layout selection and diacritic hints
 * - Character filtering
 * - Timezone offset calculation
 */

import { loadAllData } from './data-loader';
import { getTodaysIdx, getWordForDay } from './word-selection';
import type { LanguageConfig, KeyboardConfig, KeyboardLayout, GameData } from '~/utils/types';

export interface LanguageSession {
    languageCode: string;
    config: LanguageConfig;
    wordList: string[];
    wordListSupplement: string[];
    characters: string[];
    dailyWord: string;
    todaysIdx: number;
    timezoneOffset: number;
    keyboard: string[][];
    keyboardLayouts: Record<string, KeyboardLayout>;
    keyboardLayoutName: string;
    keyboardLayoutLabel: string;
    keyDiacriticHints: Record<string, { text: string; above: boolean }>;
}

/**
 * Build a complete language session for serving a game page.
 */
export function buildLanguageSession(
    langCode: string,
    requestedLayout?: string | null,
): LanguageSession {
    const data = loadAllData();
    const config = data.configs[langCode]!;
    const wordList = data.wordLists[langCode]!;
    const wordListSupplement = data.supplements[langCode]!;

    // Timezone
    const timezone = config.timezone || 'UTC';
    let timezoneOffset = 0;
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'shortOffset',
        });
        const parts = formatter.formatToParts(new Date());
        const tzPart = parts.find((p) => p.type === 'timeZoneName');
        if (tzPart) {
            // Parse "GMT+2", "GMT-5:30", "GMT" etc.
            const match = tzPart.value.match(/GMT([+-]?\d+(?::(\d+))?)?/);
            if (match) {
                const hours = parseInt(match[1] || '0', 10);
                const minutes = parseInt(match[2] || '0', 10);
                timezoneOffset = hours + (hours >= 0 ? minutes : -minutes) / 60;
            }
        }
    } catch {
        timezoneOffset = 0;
    }

    const todaysIdx = getTodaysIdx(timezone);
    const dailyWord = getWordForDay(langCode, todaysIdx);

    // Filter characters to only those used in word list
    const usedChars = new Set<string>();
    for (const word of wordList) {
        for (const char of word) usedChars.add(char);
    }
    const characters = data.characters[langCode]!.filter((c) => usedChars.has(c));

    // Keyboard
    const keyboardConfig = data.keyboards[langCode] || { default: null, layouts: {} };
    const keyboardLayouts = buildKeyboardLayouts(keyboardConfig, characters);
    const keyboardLayoutName = selectKeyboardLayout(
        keyboardLayouts,
        requestedLayout || null,
        keyboardConfig.default,
    );
    const layoutMeta = keyboardLayouts[keyboardLayoutName]!;
    const keyboard = layoutMeta.rows;
    const keyboardLayoutLabel = layoutMeta.label;

    // Diacritic hints
    const keyDiacriticHints = buildKeyDiacriticHints(config, keyboard);

    return {
        languageCode: langCode,
        config,
        wordList,
        wordListSupplement,
        characters,
        dailyWord,
        todaysIdx,
        timezoneOffset,
        keyboard,
        keyboardLayouts,
        keyboardLayoutName,
        keyboardLayoutLabel,
        keyDiacriticHints,
    };
}

// ---------------------------------------------------------------------------
// Keyboard helpers
// ---------------------------------------------------------------------------

function buildKeyboardLayouts(
    keyboardConfig: KeyboardConfig,
    characters: string[],
): Record<string, KeyboardLayout> {
    const layouts: Record<string, KeyboardLayout> = {};
    for (const [name, meta] of Object.entries(keyboardConfig.layouts)) {
        layouts[name] = {
            label: meta.label || name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            rows: meta.rows || [],
        };
    }

    if (Object.keys(layouts).length === 0) {
        layouts['alphabetical'] = {
            label: 'Alphabetical',
            rows: generateAlphabeticalKeyboard(characters),
        };
    }

    return layouts;
}

function selectKeyboardLayout(
    layouts: Record<string, KeyboardLayout>,
    requested: string | null,
    defaultLayout: string | null,
): string {
    if (requested && requested in layouts) return requested;
    if (defaultLayout && defaultLayout in layouts) return defaultLayout;
    return Object.keys(layouts)[0]!;
}

function generateAlphabeticalKeyboard(characters: string[]): string[][] {
    const keyboard: string[][] = [];
    for (let i = 0; i < characters.length; i++) {
        if (i % 10 === 0) keyboard.push([]);
        keyboard[keyboard.length - 1]!.push(characters[i]!);
    }
    if (keyboard.length === 0) return keyboard;

    // Add Enter and Backspace
    keyboard[keyboard.length - 1]!.splice(0, 0, '⇨');
    keyboard[keyboard.length - 1]!.push('⌫');

    // Deal with bottom row being too crammed
    if (keyboard.length >= 2 && keyboard[keyboard.length - 1]!.length === 11) {
        const popped = keyboard[keyboard.length - 1]!.splice(1, 1)[0]!;
        keyboard[keyboard.length - 2]!.splice(-1, 0, popped);
    }
    if (keyboard.length >= 3 && keyboard[keyboard.length - 1]!.length === 12) {
        const popped1 = keyboard[keyboard.length - 2]!.splice(0, 1)[0]!;
        keyboard[keyboard.length - 3]!.splice(-1, 0, popped1);
        const popped2 = keyboard[keyboard.length - 1]!.splice(2, 1)[0]!;
        keyboard[keyboard.length - 2]!.splice(-1, 0, popped2);
        const popped3 = keyboard[keyboard.length - 1]!.splice(2, 1)[0]!;
        keyboard[keyboard.length - 2]!.splice(-1, 0, popped3);
    }

    return keyboard;
}

function buildKeyDiacriticHints(
    config: LanguageConfig,
    keyboard: string[][],
): Record<string, { text: string; above: boolean }> {
    const diacriticMap = config.diacritic_map;
    if (!diacriticMap) return {};

    const keyboardKeys = new Set<string>();
    for (const row of keyboard) {
        for (const key of row) keyboardKeys.add(key.toLowerCase());
    }

    const hints: Record<string, { text: string; above: boolean }> = {};
    for (const [baseChar, variants] of Object.entries(diacriticMap)) {
        if (keyboardKeys.has(baseChar.toLowerCase())) {
            const numVariants = variants.length;
            let hintStr = variants.slice(0, 5).join('');
            if (numVariants > 5) hintStr += '…';
            hints[baseChar.toLowerCase()] = {
                text: hintStr,
                above: numVariants >= 4,
            };
        }
    }
    return hints;
}
