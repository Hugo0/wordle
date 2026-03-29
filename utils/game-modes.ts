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
    | 'semantic';

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
    /** Whether a timer is part of the mode */
    readonly timed: boolean;
    /** Human-readable label */
    readonly label: string;
    /** PageShell max-width for this mode ('lg' for single-board, '2xl'+ for multi) */
    readonly shellMaxWidth?: 'lg' | '2xl' | '4xl' | '6xl' | 'full';
}

export const GAME_MODE_CONFIG: Readonly<Record<GameMode, GameModeDefinition>> = {
    classic: {
        boardCount: 1,
        maxGuesses: 6,
        defaultPlayType: 'daily',
        timed: false,
        label: 'Classic',
    },
    dordle: {
        boardCount: 2,
        maxGuesses: 7,
        defaultPlayType: 'unlimited',
        timed: false,
        label: 'Dordle',
        shellMaxWidth: '2xl',
    },
    quordle: {
        boardCount: 4,
        maxGuesses: 9,
        defaultPlayType: 'unlimited',
        timed: false,
        label: 'Quordle',
        shellMaxWidth: '4xl',
    },
    octordle: {
        boardCount: 8,
        maxGuesses: 13,
        defaultPlayType: 'unlimited',
        timed: false,
        label: 'Octordle',
        shellMaxWidth: 'full',
    },
    sedecordle: {
        boardCount: 16,
        maxGuesses: 21,
        defaultPlayType: 'unlimited',
        timed: false,
        label: 'Sedecordle',
        shellMaxWidth: 'full',
    },
    duotrigordle: {
        boardCount: 32,
        maxGuesses: 37,
        defaultPlayType: 'unlimited',
        timed: false,
        label: 'Duotrigordle',
        shellMaxWidth: 'full',
    },
    unlimited: {
        boardCount: 1,
        maxGuesses: 6,
        defaultPlayType: 'unlimited',
        timed: false,
        label: 'Unlimited',
    },
    speed: {
        boardCount: 1,
        maxGuesses: 6,
        defaultPlayType: 'unlimited',
        timed: true,
        label: 'Speed Streak',
    },
    semantic: {
        boardCount: 1,
        maxGuesses: 10,
        defaultPlayType: 'daily',
        timed: false,
        label: 'Semantic Explorer',
    },
} as const;

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
 * Classic daily: just the language code (backward compatible with existing saves).
 * Other modes: "{lang}_{mode}".
 */
export function buildSaveKey(config: GameConfig): string {
    if (config.mode === 'classic' && config.playType === 'daily') {
        return config.language;
    }
    return `${config.language}_${config.mode}`;
}

/**
 * Build a stats key for storing/retrieving game results.
 * Classic 5-letter: "{lang}" (backward compatible).
 * Non-classic: "{lang}_{mode}".
 * Non-standard word length: "{lang}_{mode}_{wordLength}".
 */
export function buildStatsKey(config: GameConfig): string {
    if (config.mode === 'classic' && config.wordLength === 5) {
        return config.language;
    }
    if (config.wordLength !== 5) {
        return `${config.language}_${config.mode}_${config.wordLength}`;
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
