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
import { createBoardState, createKeyStates, WORD_LENGTH } from '~/utils/types';

/**
 * @param dailyWords  If provided (daily mode), use these as target words instead
 *                    of random picks. Must have exactly `boardCount` words.
 */
export function useMultiBoardPage(
    mode: GameMode,
    wordList: string[],
    boardCount: number,
    dailyWords?: string[]
) {
    const game = useGameStore();
    const langStore = useLanguageStore();

    // Template ref for the multi-board layout component
    const multiBoardRef = ref<{ getBoardElForIndex: (i: number) => HTMLElement | null } | null>(
        null
    );

    /** Pick N distinct random words from the word list. */
    /** Pick N distinct random words without copying the entire word list. */
    function pickRandomWords(n: number): string[] {
        const words: string[] = [];
        const used = new Set<number>();
        while (words.length < n && used.size < wordList.length) {
            const idx = Math.floor(Math.random() * wordList.length);
            if (!used.has(idx)) {
                used.add(idx);
                words.push(wordList[idx]!);
            }
        }
        return words;
    }

    /** Start a fresh multi-board game.
     *  Daily: uses dailyWords from server (deterministic, same for everyone).
     *  Unlimited: picks random words from the word list. */
    function startNewGame() {
        const words =
            dailyWords?.length === boardCount ? [...dailyWords] : pickRandomWords(boardCount);
        const cfg = createGameConfig(mode, langStore.languageCode, {
            wordLength: WORD_LENGTH,
            playType: dailyWords?.length === boardCount ? 'daily' : 'unlimited',
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

        for (const board of game.boards) {
            board.keyStates = createKeyStates(langStore.characters);
        }

        game.showTilesAllBoards();
        game.showStatsModal = false;
    }

    // Initialize boards synchronously so SSR/first render has correct board count.
    // For daily mode, try to restore a completed game from localStorage first
    // (same pattern as classic daily's loadFromLocalStorage).
    let restored = false;
    if (dailyWords?.length === boardCount && import.meta.client) {
        try {
            restored = game.loadMultiBoardFromLocalStorage(mode, dailyWords, 'daily');
        } catch {
            // Restoration failed — will start fresh below
        }
    }

    if (!restored && wordList.length > 0) {
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
