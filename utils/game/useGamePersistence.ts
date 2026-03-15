/**
 * Game state persistence composable.
 *
 * Handles saving/loading game state to localStorage with:
 * - Per-language game state (keyed by path segment)
 * - Backward compatibility with legacy saves (no tile_colors)
 * - Tutorial "shown" flags per language
 * - Safe SSR guards
 */
import { readJson, writeJson, readLocal, writeLocal } from '~/utils/storage';
import { useLanguageStore } from '~/stores/language';
import { WORD_LENGTH, MAX_GUESSES } from '~/utils/types';
import type { TileColor, KeyState } from '~/utils/types';

// ---------------------------------------------------------------------------
// Saved game shape
// ---------------------------------------------------------------------------

export interface SavedGameState {
    tiles: string[][];
    tile_colors?: TileColor[][]; // Added in Nuxt migration; absent in legacy saves
    tile_classes: string[][];
    key_classes: Record<string, KeyState>;
    active_row: number;
    active_cell: number;
    todays_word: string;
    game_over: boolean;
    game_won: boolean;
    emoji_board: string;
    attempts: string;
    full_word_inputted: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the localStorage key for the current game page. */
function getPageKey(): string {
    if (!import.meta.client) return 'unknown';
    return window.location.pathname.split('/').pop() || 'home';
}

/**
 * Derive TileColor grid from CSS class strings (for legacy saves
 * that don't have the tile_colors field).
 */
function deriveTileColorsFromClasses(tileClasses: string[][]): TileColor[][] {
    return tileClasses.map((row) =>
        row.map((cls): TileColor => {
            if (
                cls.includes('correct') &&
                !cls.includes('semicorrect') &&
                !cls.includes('incorrect')
            )
                return 'correct';
            if (cls.includes('semicorrect')) return 'semicorrect';
            if (cls.includes('incorrect')) return 'incorrect';
            if (cls.includes('pop') || cls.includes('border-neutral-500')) return 'active';
            return 'empty';
        })
    );
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useGamePersistence() {
    /** Save current game state to localStorage. */
    function saveGame(state: {
        tiles: string[][];
        tileColors: TileColor[][];
        tileClasses: string[][];
        keyClasses: Record<string, KeyState>;
        activeRow: number;
        activeCell: number;
        gameOver: boolean;
        gameWon: boolean;
        emojiBoard: string;
        attempts: string;
        fullWordInputted: boolean;
    }): void {
        if (!import.meta.client) return;
        const lang = useLanguageStore();
        const data: SavedGameState = {
            tiles: state.tiles,
            tile_colors: state.tileColors,
            tile_classes: state.tileClasses,
            key_classes: state.keyClasses,
            active_row: state.activeRow,
            active_cell: state.activeCell,
            todays_word: lang.todaysWord,
            game_over: state.gameOver,
            game_won: state.gameWon,
            emoji_board: state.emojiBoard,
            attempts: state.attempts,
            full_word_inputted: state.fullWordInputted,
        };
        writeJson(getPageKey(), data);
    }

    /**
     * Load game state from localStorage.
     * Returns null if no saved state, or if saved state is for a different day's word.
     * Handles legacy saves (without tile_colors) via CSS class derivation.
     */
    function loadGame(): SavedGameState | null {
        if (!import.meta.client) return null;
        const lang = useLanguageStore();
        const data = readJson<SavedGameState>(getPageKey());
        if (!data || data.todays_word !== lang.todaysWord) return null;

        // Backward compatibility: derive tile_colors from CSS classes if absent
        if (!data.tile_colors) {
            data.tile_colors = deriveTileColorsFromClasses(data.tile_classes);
        }

        return data;
    }

    /** Check if the tutorial has been shown for the current language. */
    function isTutorialShown(): boolean {
        if (!import.meta.client) return true;
        const lang = useLanguageStore();
        return readLocal(`tutorial_shown_${lang.languageCode}`) === 'true';
    }

    /** Mark the tutorial as shown for the current language. */
    function markTutorialShown(): void {
        const lang = useLanguageStore();
        writeLocal(`tutorial_shown_${lang.languageCode}`, 'true');
    }

    /** Check if there is any existing game state (for tutorial skip logic). */
    function hasExistingGameState(): boolean {
        if (!import.meta.client) return false;
        return readLocal(getPageKey()) !== null;
    }

    return {
        saveGame,
        loadGame,
        isTutorialShown,
        markTutorialShown,
        hasExistingGameState,
    };
}
