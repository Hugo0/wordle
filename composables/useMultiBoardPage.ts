/**
 * Shared composable for multi-board mode pages (Dordle, Tridle, Quordle).
 *
 * Handles multi-board–specific concerns only:
 *   - Multi-board game initialization (create boards from random words)
 *   - "Play Again" reset for free-play (arcade) modes
 *   - Template ref for MultiBoardLayout
 *   - Board DOM ref wiring for per-board animations
 *
 * Common page setup (sidebar, keyboard handler, settings/stats init) is
 * handled by `useGamePage`, which MUST be called before this composable.
 */
import { createGameConfig } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';
import { createBoardState, WORD_LENGTH } from '~/utils/types';
import type { KeyState } from '~/utils/types';

export function useMultiBoardPage(mode: GameMode, wordList: string[], boardCount: number) {
    const game = useGameStore();
    const langStore = useLanguageStore();

    // Template ref for the multi-board layout component
    const multiBoardRef = ref<{ getBoardElForIndex: (i: number) => HTMLElement | null } | null>(
        null
    );

    /** Pick N distinct random words from the word list. */
    function pickRandomWords(n: number): string[] {
        const words: string[] = [];
        const available = [...wordList];
        for (let i = 0; i < n && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            words.push(available[idx]!);
            available.splice(idx, 1);
        }
        return words;
    }

    /** Start a fresh multi-board game with random words. */
    function startNewGame() {
        const words = pickRandomWords(boardCount);
        const cfg = createGameConfig(mode, langStore.languageCode, {
            wordLength: WORD_LENGTH,
        });
        game.gameConfig = cfg;
        game.boards = words.map((word, i) =>
            createBoardState(i, word, cfg.maxGuesses, cfg.wordLength)
        );
        game.activeBoardIndex = 0;
        game.gameOver = false;
        game.gameWon = false;
        game.boardDefinitions = [];
        game.initKeyClasses();

        // Initialize keyStates on all boards
        for (const board of game.boards) {
            const keys: Record<string, KeyState> = {};
            for (const char of langStore.characters) {
                keys[char] = '';
            }
            keys['⟹'] = '';
            keys['ENTER'] = '';
            keys['DEL'] = '';
            keys['⌫'] = '';
            board.keyStates = keys;
        }

        game.showTilesAllBoards();
        game.showStatsModal = false;
    }

    // Initialize boards synchronously so SSR/first render has correct board count.
    // This prevents the flash of a single-board layout before hydration.
    if (wordList.length > 0) {
        try {
            startNewGame();
        } catch {
            // Initialization failed silently
        }
    }

    // Client-side setup — wire multi-board DOM refs (needs DOM, so onMounted)
    onMounted(() => {
        game.setBoardElForIndex((index: number) => {
            return multiBoardRef.value?.getBoardElForIndex(index) ?? null;
        });
        game.setBoardEl(() => multiBoardRef.value?.getBoardElForIndex(0) ?? null);
    });

    return {
        multiBoardRef,
        startNewGame,
    };
}
