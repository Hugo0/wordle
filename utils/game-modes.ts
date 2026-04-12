/**
 * Game mode definitions and configuration for Wordle Global.
 *
 * This module is the SINGLE SOURCE OF TRUTH for mode parameters.
 * Components should never hardcode board counts or guess limits.
 */

import type { BoardState, KeyState } from './types';

// =============================================================================
// Game Mode Types
// =============================================================================

export type GameMode =
    | 'classic'
    | 'dordle'
    | 'quordle'
    | 'octordle'
    | 'sedecordle'
    | 'duotrigordle'
    | 'unlimited'
    | 'speed'
    | 'semantic'
    | 'custom'
    | 'party';

export type PlayType = 'daily' | 'unlimited' | 'custom';

export type SocialMode = 'solo' | 'party';

// =============================================================================
// Mode Registry
// =============================================================================

export interface GameModeDefinition {
    /** Number of simultaneous boards */
    readonly boardCount: number;
    /** Maximum guesses allowed across all boards */
    readonly maxGuesses: number;
    /** Default play type for this mode */
    readonly defaultPlayType: PlayType;
    /** Which play types this mode supports */
    readonly supportedPlayTypes: readonly PlayType[];
    /** Whether a timer is part of the mode */
    readonly timed: boolean;
    /** Human-readable label (English) */
    readonly label: string;
    /** Short description for cards/tooltips */
    readonly description: string;
    /** Route suffix after /{lang}/ — empty string for classic */
    readonly routeSuffix: string;
    /** Whether this mode is playable (has a page) */
    readonly enabled: boolean;
    /** Badge text: 'NEW', 'BETA', 'SOON', or undefined */
    readonly badge?: string;
    /** PageShell max-width for this mode ('lg' for single-board, '2xl'+ for multi) */
    readonly shellMaxWidth?: 'lg' | '2xl' | '4xl' | '6xl' | 'full';
    /** If set, mode is only available for these language codes. */
    readonly languages?: readonly string[];
}

export const GAME_MODE_CONFIG: Readonly<Record<GameMode, GameModeDefinition>> = {
    classic: {
        boardCount: 1,
        maxGuesses: 6,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily', 'unlimited'],
        timed: false,
        label: 'Daily Puzzle',
        description: 'One word per day. 6 guesses. The classic.',
        routeSuffix: '',
        enabled: true,
    },
    unlimited: {
        // Legacy entry — Classic with playType='unlimited'. Kept for backward
        // compat (/en/unlimited route). The sidebar no longer shows this as a
        // separate mode; it's surfaced as Classic's unlimited play type.
        boardCount: 1,
        maxGuesses: 6,
        defaultPlayType: 'unlimited',
        supportedPlayTypes: ['unlimited'],
        timed: false,
        label: 'Unlimited',
        description: 'Random words, no limit. Play as much as you want.',
        routeSuffix: 'unlimited',
        enabled: true,
    },
    speed: {
        boardCount: 1,
        maxGuesses: 6,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily', 'unlimited'],
        timed: true,
        label: 'Speed Streak',
        description: 'Race the clock. Solve as many words as you can before time runs out.',
        routeSuffix: 'speed',
        enabled: true,
        badge: 'NEW',
    },
    dordle: {
        boardCount: 2,
        maxGuesses: 7,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily', 'unlimited'],
        timed: false,
        label: 'Dordle',
        description: '2 boards, 1 keyboard, 7 guesses.',
        routeSuffix: 'dordle',
        enabled: true,

        shellMaxWidth: '2xl',
    },
    quordle: {
        boardCount: 4,
        maxGuesses: 9,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily', 'unlimited'],
        timed: false,
        label: 'Quordle',
        description: '4 boards, 1 keyboard, 9 guesses.',
        routeSuffix: 'quordle',
        enabled: true,

        shellMaxWidth: '4xl',
    },
    octordle: {
        boardCount: 8,
        maxGuesses: 13,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily', 'unlimited'],
        timed: false,
        label: 'Octordle',
        description: '8 boards, 1 keyboard, 13 guesses.',
        routeSuffix: 'octordle',
        enabled: true,

        shellMaxWidth: 'full',
    },
    sedecordle: {
        boardCount: 16,
        maxGuesses: 21,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily', 'unlimited'],
        timed: false,
        label: 'Sedecordle',
        description: '16 boards, 1 keyboard, 21 guesses.',
        routeSuffix: 'sedecordle',
        enabled: true,

        shellMaxWidth: 'full',
    },
    duotrigordle: {
        boardCount: 32,
        maxGuesses: 37,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily', 'unlimited'],
        timed: false,
        label: 'Duotrigordle',
        description: '32 boards, 1 keyboard, 37 guesses.',
        routeSuffix: 'duotrigordle',
        enabled: true,

        shellMaxWidth: 'full',
    },
    semantic: {
        boardCount: 1,
        maxGuesses: 20,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily', 'unlimited'],
        timed: false,
        label: 'Semantic Explorer',
        description: 'Find words by meaning. Use compass hints in 20 guesses.',
        routeSuffix: 'semantic',
        enabled: true,
        badge: 'NEW',
        /** English-only for v1 (embeddings, targets, axes are all English). */
        languages: ['en'],
    },
    custom: {
        boardCount: 1,
        maxGuesses: 6,
        defaultPlayType: 'custom',
        supportedPlayTypes: ['custom'],
        timed: false,
        label: 'Custom Word',
        description: 'Pick a word, share a link. Challenge your friends.',
        routeSuffix: 'custom',
        enabled: false,
        badge: 'SOON',
    },
    party: {
        boardCount: 1,
        maxGuesses: 6,
        defaultPlayType: 'daily',
        supportedPlayTypes: ['daily'],
        timed: false,
        label: 'Party Mode',
        description: 'Play the same word with friends. See who solves it fastest.',
        routeSuffix: 'party',
        enabled: false,
        badge: 'SOON',
    },
} as const;

/** Display order for mode lists (sidebar, homepage, picker).
 *  'unlimited' is excluded — it's Classic's unlimited play type, not a
 *  standalone mode. The sidebar shows it as a sub-item under Classic. */
export const GAME_MODE_ORDER: readonly GameMode[] = [
    'classic',
    'speed',
    'dordle',
    'quordle',
    'octordle',
    'sedecordle',
    'duotrigordle',
    'semantic',
    'custom',
    'party',
] as const;

// =============================================================================
// Game Config
// =============================================================================

export interface GameConfig {
    readonly mode: GameMode;
    readonly playType: PlayType;
    readonly social: SocialMode;
    readonly language: string;
    readonly wordLength: number;
    readonly boardCount: number;
    readonly maxGuesses: number;
    readonly timed: boolean;
    readonly dayIndex?: number;
    readonly customWord?: string;
}

/**
 * Create a GameConfig from mode + language.
 * Derived fields (boardCount, maxGuesses) stay consistent with the mode definition.
 */
export function createGameConfig(
    mode: GameMode,
    language: string,
    overrides?: Partial<
        Pick<GameConfig, 'playType' | 'social' | 'wordLength' | 'dayIndex' | 'customWord'>
    >
): GameConfig {
    const modeDef = GAME_MODE_CONFIG[mode];
    return Object.freeze({
        mode,
        playType: overrides?.playType ?? modeDef.defaultPlayType,
        social: overrides?.social ?? 'solo',
        language,
        wordLength: overrides?.wordLength ?? 5,
        boardCount: modeDef.boardCount,
        maxGuesses: modeDef.maxGuesses,
        timed: modeDef.timed,
        dayIndex: overrides?.dayIndex,
        customWord: overrides?.customWord,
    });
}

// =============================================================================
// Multi-Board Keyboard Merging
// =============================================================================

const KEY_STATE_PRIORITY: Record<KeyState, number> = {
    '': 0,
    'key-incorrect': 1,
    'key-semicorrect': 2,
    'key-correct': 3,
};

/**
 * Merge keyboard states from multiple boards into a single display state.
 * Priority: correct > semicorrect > incorrect > unused.
 * For single-board modes, returns the board's own keyStates directly.
 */
export function mergeKeyStates(
    boards: readonly Pick<BoardState, 'keyStates'>[]
): Record<string, KeyState> {
    if (boards.length === 1) return boards[0]!.keyStates;

    const merged: Record<string, KeyState> = {};

    for (const board of boards) {
        for (const [key, state] of Object.entries(board.keyStates)) {
            const current = merged[key] ?? '';
            if (KEY_STATE_PRIORITY[state] > KEY_STATE_PRIORITY[current]) {
                merged[key] = state;
            }
        }
    }

    return merged;
}

// =============================================================================
// Persistence Keys
// =============================================================================

/**
 * Build the localStorage key for saving game state.
 *
 * Key format is backward-compatible: existing combinations keep their
 * existing keys. Only NEW combinations (daily multi-board, unlimited
 * semantic, etc.) get new keys.
 *
 *   Classic daily:          "{lang}"           (backward compat)
 *   Classic unlimited:      "{lang}_unlimited" (backward compat)
 *   Other mode daily:       "{lang}_{mode}_daily"   (NEW)
 *   Other mode unlimited:   "{lang}_{mode}"         (backward compat)
 */
export function buildSaveKey(config: GameConfig): string {
    // Classic daily: bare lang code (Flask-era backward compat)
    if (config.mode === 'classic' && config.playType === 'daily') {
        return config.language;
    }
    // Classic unlimited: legacy key format
    if (config.mode === 'classic' && config.playType === 'unlimited') {
        return `${config.language}_unlimited`;
    }
    // The standalone 'unlimited' mode entry uses the same key as classic unlimited
    if (config.mode === 'unlimited') {
        return `${config.language}_unlimited`;
    }
    // Non-classic daily: append _daily suffix (new — no collision with existing keys)
    if (config.playType === 'daily') {
        return `${config.language}_${config.mode}_daily`;
    }
    // Non-classic unlimited: existing format
    return `${config.language}_${config.mode}`;
}

/**
 * Build a stats key for storing/retrieving game results.
 *
 * Same backward-compat logic as buildSaveKey — existing key patterns
 * are preserved, new daily multi-board combos get new keys.
 *
 *   Classic 5-letter (any playType): "{lang}"
 *   Legacy 'unlimited' mode:        "{lang}"
 *   Other mode daily:               "{lang}_{mode}_daily"
 *   Other mode unlimited:           "{lang}_{mode}"
 *   Non-5-letter daily:             "{lang}_{mode}_{wordLength}_daily"
 *   Non-5-letter unlimited:         "{lang}_{mode}_{wordLength}"
 */
export function buildStatsKey(config: GameConfig): string {
    // Classic 5-letter: bare lang code regardless of playType (backward compat —
    // before this refactor both daily and unlimited shared the same stats bucket)
    if (config.mode === 'classic' && config.wordLength === 5) {
        return config.language;
    }
    // Legacy 'unlimited' mode entry maps to same key as classic
    if (config.mode === 'unlimited') {
        return config.language;
    }
    // Non-5-letter modes: length goes before the optional _daily suffix so
    // isDailyStatsKey's endsWith('_daily') check works correctly
    if (config.wordLength !== 5) {
        const base = `${config.language}_${config.mode}_${config.wordLength}`;
        return config.playType === 'daily' ? `${base}_daily` : base;
    }
    if (config.playType === 'daily') {
        return `${config.language}_${config.mode}_daily`;
    }
    return `${config.language}_${config.mode}`;
}

/**
 * Inverse of buildStatsKey: true if the key was produced for classic daily 5-letter mode.
 * Classic keys are bare language codes (no underscore). Non-classic keys always contain one.
 */
export function isClassicDailyStatsKey(key: string): boolean {
    return !key.includes('_');
}

/**
 * True if the stats key represents a daily play type — either classic daily
 * (bare lang code like "en") or a non-classic daily (ends with "_daily"
 * like "en_dordle_daily"). Used for product-wide streak calculation.
 *
 * Unlimited keys ("en_unlimited", "en_dordle") do NOT match.
 */
export function isDailyStatsKey(key: string): boolean {
    // Bare language code = classic daily (backward compat)
    if (!key.includes('_')) return true;
    // Explicit _daily suffix = non-classic daily
    if (key.endsWith('_daily')) return true;
    return false;
}
