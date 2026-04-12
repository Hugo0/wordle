/**
 * Game Store — Core Wordle game logic
 *
 * This is the main Pinia store that manages game state and logic.
 *
 * SSR-safe: all localStorage, document, and window access is guarded
 * behind `import.meta.client`.
 *
 * localStorage compatibility: The save format is backward-compatible with the
 * Flask-era frontend. Old saves lack the `tile_colors` field — when detected,
 * colors are derived from CSS class strings (see loadFromLocalStorage). Do not
 * change the save key format (language code from URL path) or remove the
 * tile_colors derivation without a migration path.
 */
import { ref, computed, watch, triggerRef } from 'vue';
import { pauseTracking, resetTracking } from '@vue/reactivity';
import { defineStore } from 'pinia';
import { useLanguageStore } from '~/stores/language';
import { useSettingsStore } from '~/stores/settings';
import { useStatsStore } from '~/stores/stats';
import {
    buildNormalizedWordMap,
    charsMatch,
    normalizeChar,
    normalizeWord,
} from '~/utils/diacritics';
import { toFinalForm } from '~/utils/positional';
import { splitWord } from '~/utils/graphemes';
import { calculateCommunityPercentile } from '~/utils/stats';
import { wordDetailPath } from '~/utils/wordUrls';
import {
    WORD_LENGTH,
    MAX_GUESSES,
    createBoardState,
    createKeyStates,
    rowToEmoji,
} from '~/utils/types';
import type { KeyState, TileColor, Notification, BoardState } from '~/utils/types';
import {
    createGameConfig,
    mergeKeyStates,
    buildSaveKey,
    buildStatsKey,
    GAME_MODE_CONFIG,
} from '~/utils/game-modes';
import type { GameConfig, GameMode } from '~/utils/game-modes';
import { computeRowColors } from '~/utils/game/colorAlgorithm';
import type { NormalizationContext } from '~/utils/game/colorAlgorithm';
import { animateRevealRow, animateKeyNudge } from '~/utils/game/useGameAnimations';
import {
    getOrCreateId,
    readLocal,
    writeLocal,
    readJson,
    writeJson,
    STORAGE_KEYS,
} from '~/utils/storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIN_WORDS = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'] as const;

// Tile border styling is handled by CSS in design-system.css via the `.tile` base class.
// These constants only carry semantic state classes — no visual Tailwind utilities.
const DEFAULT_TILE_CLASS = '';
const ACTIVE_TILE_CLASS = 'filled pop';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmptyNotification(): Notification {
    return {
        show: false,
        fading: false,
        message: '',
        top: 0,
        timeout: 0,
        fadeTimeout: 0,
        slideInterval: 0,
    };
}

/** Type for saved game state in localStorage */
interface SavedGameState {
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
// Store
// ---------------------------------------------------------------------------

export const useGameStore = defineStore('game', () => {
    // =======================================================================
    // Analytics (auto-imported composable)
    // =======================================================================

    const analytics = useAnalytics();

    // =======================================================================
    // Multi-Board Architecture
    // =======================================================================

    const gameConfig = ref<GameConfig>(
        createGameConfig('classic', 'en', { wordLength: WORD_LENGTH })
    );
    /** True when a game page is mounted (set by useGamePage). */
    const gameActive = ref(false);
    const boards = ref<BoardState[]>([createBoardState(0, '', MAX_GUESSES, WORD_LENGTH)]);
    const activeBoardIndex = ref(0);

    // Keep PostHog game_mode super property in sync with gameConfig changes
    watch(
        () => gameConfig.value.mode,
        (mode) => {
            analytics.registerGameMode(mode);
        }
    );

    // =======================================================================
    // Computed Proxies — backward-compatible access to boards[activeBoardIndex]
    //
    // All existing components read game.tiles, game.activeRow, etc.
    // These proxies delegate to the active board so nothing breaks.
    // =======================================================================

    const tiles = computed({
        get: () => boards.value[activeBoardIndex.value]!.tiles,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.tiles = v;
        },
    });
    const tileColors = computed({
        get: () => boards.value[activeBoardIndex.value]!.tileColors,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.tileColors = v;
        },
    });
    const tileClasses = computed({
        get: () => boards.value[activeBoardIndex.value]!.tileClasses,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.tileClasses = v;
        },
    });
    const tilesVisual = computed({
        get: () => boards.value[activeBoardIndex.value]!.tilesVisual,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.tilesVisual = v;
        },
    });
    const tileClassesVisual = computed({
        get: () => boards.value[activeBoardIndex.value]!.tileClassesVisual,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.tileClassesVisual = v;
        },
    });
    const activeRow = computed({
        get: () => boards.value[activeBoardIndex.value]!.activeRow,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.activeRow = v;
        },
    });
    const activeCell = computed({
        get: () => boards.value[activeBoardIndex.value]!.activeCell,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.activeCell = v;
        },
    });
    const fullWordInputted = computed({
        get: () => boards.value[activeBoardIndex.value]!.fullWordInputted,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.fullWordInputted = v;
        },
    });
    const emojiBoard = computed({
        get: () => boards.value[activeBoardIndex.value]!.emojiBoard,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.emojiBoard = v;
        },
    });
    const attempts = computed({
        get: () => boards.value[activeBoardIndex.value]!.attempts,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.attempts = v;
        },
    });
    const pendingKeyUpdates = computed({
        get: () => boards.value[activeBoardIndex.value]!.pendingKeyUpdates,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.pendingKeyUpdates = v;
        },
    });
    // keyClasses proxies to keyStates (renamed in BoardState for clarity)
    const keyClasses = computed({
        get: () => boards.value[activeBoardIndex.value]!.keyStates,
        set: (v) => {
            boards.value[activeBoardIndex.value]!.keyStates = v;
        },
    });

    // =======================================================================
    // Top-Level State (not per-board)
    // =======================================================================

    const gameOver = ref(false);
    const gameLost = computed(() => gameOver.value && !gameWon.value);
    const gameWon = ref(false);

    const animating = ref(false);
    const shakingRow = ref(-1);

    const showHelpModal = ref(false);
    const showStatsModal = ref(false);
    const showOptionsModal = ref(false);
    const showStreakModal = ref(false);

    // Debug: override streak count for visual testing (set via debug.streak.set())
    const debugStreakOverride = ref<number | null>(null);

    // Effective streak: respects debug override, used by PageShell and StreakModal
    const effectiveStreak = computed(() => {
        if (debugStreakOverride.value !== null) return debugStreakOverride.value;
        const statsStore = useStatsStore();
        return statsStore.totalStats.current_overall_streak;
    });

    const notification = ref<Notification>(makeEmptyNotification());

    const timeUntilNextDay = ref('');

    const communityPercentile = ref<number | null>(null);
    const communityIsTopScore = ref(false);
    const communityTotal = ref(0);
    const communityStatsLink = ref<string | null>(null);

    const shareButtonState = ref<'idle' | 'success'>('idle');

    /** Screen reader announcement — updated after each guess reveal. */
    const srAnnouncement = ref('');

    // Definition & word image for stats modal display
    const todayDefinition = ref<{
        word: string;
        definition: string;
        partOfSpeech?: string;
        url?: string;
    } | null>(null);
    const todayImageUrl = ref<string | null>(null);
    const todayImageLoading = ref(false);
    const todayDefinitionLoading = ref(false);

    // Multi-board definitions (dordle/tridle/quordle) — one per board
    const boardDefinitions = ref<
        Array<{ word: string; definition: string; partOfSpeech?: string } | null>
    >([]);
    const boardDefinitionsLoading = ref(false);

    const allowAnyWord = ref(false);

    const maxDifficultyUsed = ref(0);

    // =======================================================================
    // Speed Streak State
    // =======================================================================

    // Speed Streak arcade state
    const SPEED_INITIAL_TIME = 300_000; // 5 minutes
    const SPEED_FAIL_PENALTY = 30_000; // -30s on fail
    const SPEED_RAMP_INTERVAL = 3; // every 3 words, timer ticks faster
    const SPEED_BONUS_TABLE = [0, 60_000, 50_000, 40_000, 30_000, 20_000, 10_000]; // index = guesses used

    const speedState = ref<{
        active: boolean;
        timeRemaining: number;
        totalTime: number;
        wordsSolved: number;
        wordsFailed: number;
        totalGuesses: number;
        solvedWords: Array<{ word: string; guesses: number; timeMs: number; points: number }>;
        failedWords: string[];
        wordStartTime: number;
        countdownPhase: 'idle' | 'countdown' | 'playing' | 'finished';
        score: number;
        combo: number;
        maxCombo: number;
        tickSpeed: number; // multiplier: 1.0, 1.2, 1.5, 2.0
        lastTimeDelta: number; // +/- ms from last event (for UI flash feedback)
        lastEvent: 'none' | 'solve' | 'fail' | 'milestone';
        urgencyLevel: number; // 0=calm, 1=warm, 2=hot, 3=critical
        // Arcade event queue — consumed by SpeedOverlay component
        arcadeEvents: Array<{
            id: number;
            type: 'solve' | 'fail' | 'milestone' | 'combo';
            word?: string;
            guesses?: number;
            points?: number;
            bonus?: number; // time bonus in ms
            penalty?: number; // time penalty in ms
            combo?: number;
            milestone?: number;
            label?: string;
            emoji?: string;
        }>;
        lastMissedWord: string; // word that was in progress when time ran out
    }>({
        active: false,
        timeRemaining: SPEED_INITIAL_TIME,
        totalTime: SPEED_INITIAL_TIME,
        wordsSolved: 0,
        wordsFailed: 0,
        totalGuesses: 0,
        solvedWords: [],
        failedWords: [],
        wordStartTime: 0,
        countdownPhase: 'idle',
        score: 0,
        combo: 0,
        maxCombo: 0,
        tickSpeed: 1.0,
        lastTimeDelta: 0,
        lastEvent: 'none',
        urgencyLevel: 0,
        arcadeEvents: [],
        lastMissedWord: '',
    });

    let _arcadeEventId = 0;

    const SOLVE_REACTIONS = [
        '', // 0 guesses (impossible)
        '🤯 GENIUS',
        '⚡ BRILLIANT',
        '🔥 GREAT',
        '✓ NICE',
        '😅 CLOSE',
        '😤 PHEW',
    ];

    function pushArcadeEvent(event: (typeof speedState.value.arcadeEvents)[number]) {
        speedState.value.arcadeEvents.push(event);
        // Auto-remove after 2.5s to prevent memory leak
        const id = event.id;
        setTimeout(() => {
            speedState.value.arcadeEvents = speedState.value.arcadeEvents.filter(
                (e) => e.id !== id
            );
        }, 2500);
    }

    let _speedTimerInterval: ReturnType<typeof setInterval> | null = null;
    let _speedWordList: string[] = [];

    // =======================================================================
    // Multi-Board Computed Helpers
    // =======================================================================

    const isMultiBoard = computed(() => gameConfig.value.boardCount > 1);

    const mergedKeyStates = computed(() => {
        if (!isMultiBoard.value) return keyClasses.value;
        return mergeKeyStates(boards.value);
    });

    // =======================================================================
    // DOM refs (set by game page via setBoardEl/setKeyboardEl)
    // =======================================================================

    let _getBoardEl: (() => HTMLElement | null) | null = null;
    let _getKeyboardEl: (() => HTMLElement | null) | null = null;
    let _getBoardElForIndex: ((index: number) => HTMLElement | null) | null = null;

    function setBoardEl(getter: () => HTMLElement | null): void {
        _getBoardEl = getter;
    }

    function setKeyboardEl(getter: () => HTMLElement | null): void {
        _getKeyboardEl = getter;
    }

    function setBoardElForIndex(getter: (index: number) => HTMLElement | null): void {
        _getBoardElForIndex = getter;
    }

    // =======================================================================
    // Timing state for analytics (module-level equivalent)
    // =======================================================================

    let gameStartTime = 0;
    let lastGuessTime = 0;
    let firstGuessFired = false;

    // =======================================================================
    // Internal (non-exposed) state
    // =======================================================================

    /** Cached normalized word maps — built lazily on first use. */
    let _normalizedWordMap: Map<string, string> | null = null;

    // =======================================================================
    // Private helpers
    // =======================================================================

    /** Get or build the normalized word map for the main word list. */
    function getNormalizedWordMap(): Map<string, string> {
        if (_normalizedWordMap) return _normalizedWordMap;
        const lang = useLanguageStore();
        _normalizedWordMap = buildNormalizedWordMap(lang.wordList, lang.normalizeMap);
        return _normalizedWordMap;
    }

    // =======================================================================
    // Actions
    // =======================================================================

    /**
     * Initialize key classes from the character list.
     * Call after the language store has been populated.
     */
    function initKeyClasses(): void {
        const lang = useLanguageStore();
        keyClasses.value = createKeyStates(lang.characters);
    }

    /**
     * Reset cached normalized word maps.
     * Call when language data changes (e.g., on language switch).
     */
    function resetCaches(): void {
        _normalizedWordMap = null;
    }

    /**
     * Initialize analytics timing state. Call on game start.
     */
    function initTimingState(): void {
        gameStartTime = Date.now();
        lastGuessTime = Date.now();
        firstGuessFired = false;
    }

    // ---- Character input ----

    /** Add a character to the current active cell. */
    function addChar(char: string): void {
        const lang = useLanguageStore();
        const isLastPosition = activeCell.value === WORD_LENGTH - 1;
        const displayChar = toFinalForm(char, isLastPosition, lang.config ?? {});
        const cellIdx = activeCell.value;
        const rowIdx = activeRow.value;

        if (isMultiBoard.value) {
            // Pause reactive tracking so Vue doesn't fire per-board updates.
            // All 32 boards mutated, then one triggerRef at the end.
            const newCell = Math.min(activeCell.value + 1, WORD_LENGTH);
            const isFull = newCell === WORD_LENGTH;
            pauseTracking();
            for (const board of boards.value) {
                if (board.solved) continue;
                const row = board.tiles[rowIdx];
                const rowClasses = board.tileClasses[rowIdx];
                if (row && rowClasses) {
                    row[cellIdx] = displayChar;
                    rowClasses[cellIdx] = ACTIVE_TILE_CLASS;
                    if (board.tileColors[rowIdx]) board.tileColors[rowIdx]![cellIdx] = 'active';
                }
                board.activeCell = newCell;
                board.fullWordInputted = isFull;
            }
            resetTracking();
            triggerRef(boards);
        } else {
            // Single-board: write via proxy (classic, unlimited, speed)
            const row = tiles.value[rowIdx];
            const rowClasses = tileClasses.value[rowIdx];
            if (row && rowClasses) {
                row.splice(cellIdx, 1, displayChar);
                rowClasses.splice(cellIdx, 1, ACTIVE_TILE_CLASS);
                tileColors.value[rowIdx]?.splice(cellIdx, 1, 'active');
            }
            activeCell.value = Math.min(activeCell.value + 1, WORD_LENGTH);
            if (activeCell.value === WORD_LENGTH) fullWordInputted.value = true;
        }
    }

    // ---- Word validation ----

    /**
     * Check if a word is valid and return its canonical form (with diacritics).
     * Returns the canonical word if valid, null if not in the word list.
     */
    function checkWord(word: string): string | null {
        if (allowAnyWord.value) return word;

        const lang = useLanguageStore();

        // Always prefer the canonical (accented) dictionary form.
        // The in-game keyboard can't type accents, so "agito" should display
        // as "agitó" if that's the dictionary spelling.
        const normalized = normalizeWord(word, lang.normalizeMap);
        const canonical = getNormalizedWordMap().get(normalized);
        if (canonical) return canonical;

        // Fallback: exact match for words not covered by normalization
        if (lang.wordListSet.has(word)) return word;

        return null;
    }

    // ---- Color algorithm ----

    /** Build NormalizationContext from current language store. */
    function getNormalizationContext(): NormalizationContext {
        const lang = useLanguageStore();
        return {
            graphemeMode: lang.graphemeMode,
            normalizeMap: lang.normalizeMap,
            finalFormReverseMap: lang.finalFormReverseMap,
        };
    }

    /** Update tile colors for the current row (single-board). Delegates to updateColorsForBoard. */
    function updateColors(): void {
        const board = boards.value[activeBoardIndex.value]!;
        updateColorsForBoard(board, board.activeRow);
        // Sync the pendingKeyUpdates proxy (updateColorsForBoard writes to the board directly)
        pendingKeyUpdates.value = board.pendingKeyUpdates;
    }

    /** Update tile colors for a specific board at a specific row. */
    function updateColorsForBoard(board: BoardState, rowIndex: number): void {
        const ctx = getNormalizationContext();
        const guessRow = board.tiles[rowIndex];
        if (!guessRow) return;

        const targetWord = board.targetWord || useLanguageStore().todaysWord;
        const result = computeRowColors(guessRow, targetWord, ctx);

        // Use splice for Vue reactivity (direct index assignment may not trigger updates)
        for (let i = 0; i < result.colors.length; i++) {
            board.tileColors[rowIndex]?.splice(i, 1, result.colors[i]!);
            board.tileClasses[rowIndex]?.splice(i, 1, result.classes[i]!);
            board.tiles[rowIndex]?.splice(i, 1, result.tiles[i]!);
        }
        board.pendingKeyUpdates = result.keyUpdates;
    }

    // ---- Keyboard color ----

    /**
     * Update keyboard key color, respecting priority (correct > semicorrect > incorrect).
     * Also updates equivalent diacritical characters.
     */
    function updateKeyColor(
        char: string,
        newState: KeyState,
        keys: Record<string, KeyState>
    ): void {
        const lang = useLanguageStore();

        const updateSingleKey = (key: string, state: KeyState) => {
            const current = keys[key];
            if (current === 'key-correct') {
                if (state === 'key-correct') _nudgeKey(key, 'key-pulse');
                return;
            }
            if (current === 'key-semicorrect' && state === 'key-incorrect') {
                _nudgeKey(key, 'key-shake');
                return;
            }
            if (current === 'key-incorrect' && state === 'key-incorrect') {
                _nudgeKey(key, 'key-shake');
                return;
            }
            keys[key] = state;
        };

        updateSingleKey(char, newState);

        // Also update equivalent diacritical characters
        const normalizedChar = lang.normalizeMap.get(char) || char;

        for (const [diacritic, base] of lang.normalizeMap.entries()) {
            if (base === normalizedChar) {
                updateSingleKey(diacritic, newState);
            }
        }

        if (lang.normalizeMap.has(char)) {
            updateSingleKey(normalizedChar, newState);
        }

        // Also update positional variants (final ↔ regular forms)
        // Hebrew: כ↔ך, מ↔ם, נ↔ן, פ↔ף, צ↔ץ. Greek: σ↔ς.
        const finalFormMap = lang.config?.final_form_map;
        if (finalFormMap) {
            const finalForm = finalFormMap[char];
            if (finalForm) updateSingleKey(finalForm, newState);
            const regularForm = lang.finalFormReverseMap.get(char);
            if (regularForm) updateSingleKey(regularForm, newState);
        }
    }

    // ---- Input handling ----

    /** Handle virtual keyboard click with haptic feedback. */
    function keyClick(key: string): void {
        if (import.meta.client) {
            const { haptic } = useHaptics();
            haptic();
        }
        keyDown({ key } as KeyboardEvent);
    }

    /** Main input handler for both physical and virtual keyboard events. */
    function keyDown(event: KeyboardEvent | { key: string }): void {
        if (animating.value) return;

        // Physical keyboard → character mapping (bypasses IME for Korean, etc.)
        let rawKey = event.key;
        const lang = useLanguageStore();
        const physicalKeyMap = lang.config?.physical_key_map;
        if (physicalKeyMap && 'code' in event && event instanceof KeyboardEvent) {
            const code = event.shiftKey ? `Shift${event.code}` : event.code;
            const mapped = physicalKeyMap[code];
            if (mapped) {
                event.preventDefault();
                rawKey = mapped;
            }
        }

        // Normalize to lowercase for letter keys (Caps Lock, mobile keyboards)
        const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;

        if (key === 'Escape') {
            showHelpModal.value = false;
            showStatsModal.value = false;
            showOptionsModal.value = false;
            return;
        }

        if (gameOver.value) return;

        const settings = useSettingsStore();

        if (['Enter', '⇨', '⟹', 'ENTER'].includes(key)) {
            if (!fullWordInputted.value) {
                shakeRow(activeRow.value);
                showNotification(
                    lang.config?.text?.notification_partial_word ?? 'Please enter a full word'
                );
                return;
            }

            const row = tiles.value[activeRow.value];
            const typedWord = row ? row.join('').toLowerCase() : '';
            const canonicalWord = checkWord(typedWord);

            if (canonicalWord) {
                // Hard mode validation (disabled for multi-board — contradictions between boards)
                if (settings.hardMode && !isMultiBoard.value) {
                    const hardModeError = checkHardMode(canonicalWord);
                    if (hardModeError) {
                        if (import.meta.client) {
                            const { haptic } = useHaptics();
                            haptic.error();
                        }
                        shakeRow(activeRow.value);
                        showNotification(hardModeError);
                        return;
                    }
                }

                if (import.meta.client) {
                    const { haptic } = useHaptics();
                    haptic.confirm();
                }

                // Analytics: frustration reset on valid word
                analytics.onValidWord();

                // Track first guess delay (time from page load to first interaction)
                if (!firstGuessFired && gameStartTime) {
                    const delaySeconds = Math.floor((Date.now() - gameStartTime) / 1000);
                    analytics.trackFirstGuessDelay(lang.languageCode, delaySeconds);
                    firstGuessFired = true;
                }

                lastGuessTime = Date.now();

                // Update tiles to show canonical form (with diacritics)
                if (row && canonicalWord !== typedWord) {
                    const canonicalChars = splitWord(canonicalWord, lang.graphemeMode);
                    for (let i = 0; i < canonicalChars.length; i++) {
                        row.splice(i, 1, canonicalChars[i]);
                    }
                }

                // Multi-board: branch to dedicated game loop
                if (isMultiBoard.value) {
                    processMultiBoardGuess(canonicalWord);
                    return;
                }

                updateColors();

                // Track highest difficulty a guess was submitted at
                const currentDifficulty = settings.hardMode ? 2 : allowAnyWord.value ? 0 : 1;
                if (currentDifficulty > maxDifficultyUsed.value)
                    maxDifficultyUsed.value = currentDifficulty;

                const revealingRow = activeRow.value;
                activeRow.value++;
                activeCell.value = 0;
                fullWordInputted.value = false;
                animating.value = true;

                // Speed mode: faster animations. 8+ boards: skip animations entirely (too much jank).
                const bc = gameConfig.value.boardCount;
                const speedMult = gameConfig.value.mode === 'speed' ? 0.5 : bc >= 8 ? 2 : 1;
                revealRow(revealingRow, speedMult).then(() => {
                    showTiles();

                    // Announce guess result for screen readers
                    const rowTiles = tiles.value[revealingRow];
                    const rowColors = tileColors.value[revealingRow];
                    if (rowTiles && rowColors) {
                        const parts = rowTiles.map((letter, i) => {
                            const color = rowColors[i];
                            const state =
                                color === 'correct'
                                    ? 'correct'
                                    : color === 'semicorrect'
                                      ? 'present'
                                      : 'absent';
                            return `${letter} ${state}`;
                        });
                        srAnnouncement.value = `Row ${revealingRow + 1}: ${parts.join(', ')}`;
                    }

                    // Compare normalized forms for win detection
                    // Always use board's targetWord (not lang.todaysWord which is only the daily word)
                    const normalizedGuess = normalizeWord(canonicalWord, lang.normalizeMap);
                    const targetWord =
                        boards.value[activeBoardIndex.value]!.targetWord || lang.todaysWord;
                    const normalizedTarget = normalizeWord(targetWord, lang.normalizeMap);
                    if (normalizedGuess === normalizedTarget) {
                        if (gameConfig.value.mode === 'speed') {
                            handleSpeedWordSolved();
                        } else {
                            handleGameWon();
                        }
                    } else if (activeRow.value === gameConfig.value.maxGuesses) {
                        if (gameConfig.value.mode === 'speed') {
                            handleSpeedWordFailed();
                        } else {
                            handleGameLost();
                        }
                    }

                    if (gameConfig.value.mode !== 'speed') {
                        saveToLocalStorage();
                    }

                    // Set animating = false AFTER speed handlers (they may reset the board)
                    animating.value = false;
                });
            } else {
                if (import.meta.client) {
                    const { haptic } = useHaptics();
                    haptic.error();
                }
                shakeRow(activeRow.value);
                showNotification(
                    lang.config?.text?.notification_word_not_valid ?? 'Word is not valid'
                );

                // Track invalid word and update session frustration state
                analytics.trackInvalidWordAndUpdateState({
                    language: lang.languageCode,
                    attempt_number: activeRow.value + 1,
                    word: typedWord,
                });
                // guess_submit is in POSTHOG_SKIP_EVENTS — invalid count is
                // aggregated into game_complete via frustration state
            }
        } else if (['Backspace', 'Delete', '⌫'].includes(key) && activeCell.value > 0) {
            const rowIdx = activeRow.value;

            if (isMultiBoard.value) {
                const newCell = activeCell.value - 1;
                pauseTracking();
                for (const board of boards.value) {
                    if (board.solved) continue;
                    board.activeCell = newCell;
                    board.fullWordInputted = false;
                    const row = board.tiles[rowIdx];
                    const rowClasses = board.tileClasses[rowIdx];
                    if (row && rowClasses) {
                        row[newCell] = '';
                        rowClasses[newCell] = DEFAULT_TILE_CLASS;
                        if (board.tileColors[rowIdx]) board.tileColors[rowIdx]![newCell] = 'empty';
                    }
                }
                resetTracking();
                triggerRef(boards);
            } else {
                activeCell.value--;
                const cellIdx = activeCell.value;
                const row = tiles.value[rowIdx];
                const rowClasses = tileClasses.value[rowIdx];
                if (row && rowClasses) {
                    row.splice(cellIdx, 1, '');
                    rowClasses.splice(cellIdx, 1, DEFAULT_TILE_CLASS);
                    tileColors.value[rowIdx]?.splice(cellIdx, 1, 'empty');
                }
                fullWordInputted.value = false;
            }
            triggerRef(boards);
        } else if (!fullWordInputted.value && lang.acceptableCharacters.includes(key)) {
            addChar(key);
        }

        if (!animating.value) {
            if (isMultiBoard.value) {
                // Only sync the active row (not all rows) for typing performance
                const activeBoard = boards.value.find((b) => !b.solved);
                showTilesAllBoards(activeBoard?.activeRow);
                debouncedSaveMultiBoard();
            } else if (gameConfig.value.mode !== 'speed') {
                showTiles();
                saveToLocalStorage();
            } else {
                showTiles();
                // Speed mode: don't persist ephemeral game state
            }
        }
    }

    // ---- Visual sync ----

    /** Sync data layer to visual layer for the active board. Delegates to showTilesForBoard. */
    function showTiles(): void {
        showTilesForBoard(activeBoardIndex.value);
        triggerRef(boards);
    }

    // ---- Animations ----

    /** Staggered flip animation for a completed row. Delegates to revealRowForBoard. */
    function revealRow(rowIndex: number, speedMultiplier: number = 1): Promise<void> {
        return revealRowForBoard(activeBoardIndex.value, rowIndex, speedMultiplier);
    }

    /** Animate a keyboard key with a CSS animation class. */
    function _nudgeKey(char: string, animClass: string): void {
        if (!import.meta.client) return;
        // Skip key animations for multi-board modes (too many boards = visual noise)
        if (boards.value.length > 4) return;
        animateKeyNudge(_getKeyboardEl?.() ?? null, char, animClass);
    }

    /** Shake animation for an invalid input. */
    function shakeRow(rowIndex: number): void {
        shakingRow.value = rowIndex;
        if (import.meta.client) {
            setTimeout(() => {
                shakingRow.value = -1;
            }, 500);
        }
    }

    /** Win celebration bounce animation. */
    function bounceRow(rowIndex: number): void {
        if (!import.meta.client) return;
        const STAGGER = 150;
        const DURATION = 1000;
        const tileCount = WORD_LENGTH;

        for (let t = 0; t < tileCount; t++) {
            const visualIdx = t;
            setTimeout(() => {
                const currentClass = tileClassesVisual.value[rowIndex]?.[visualIdx] || '';
                tileClassesVisual.value[rowIndex]?.splice(
                    visualIdx,
                    1,
                    `${currentClass} tile-bounce`
                );
                setTimeout(() => {
                    tileClassesVisual.value[rowIndex]?.splice(visualIdx, 1, currentClass);
                }, DURATION);
            }, t * STAGGER);
        }
    }

    // ---- Game end handlers ----

    /**
     * Shared ceremony for completing a game session (classic or multi-board).
     * Sets game-over flags, plays haptics/sounds, persists stats, and shows the stats modal.
     */
    function completeGameSession(
        won: boolean,
        options: {
            attemptsValue: number | string;
            emojiBoardText: string;
            notification: string;
            notificationDuration?: number;
            modalDelay?: number;
            statsAttempts: number; // numeric attempts for stats (0 for losses)
        }
    ): void {
        const lang = useLanguageStore();
        const statsStore = useStatsStore();

        emojiBoard.value = options.emojiBoardText;
        attempts.value = String(options.attemptsValue);
        gameOver.value = true;
        gameWon.value = won;

        showNotification(options.notification, options.notificationDuration ?? 3);

        if (import.meta.client) {
            const { haptic } = useHaptics();
            const { sound } = useSounds();
            if (won) {
                haptic.success();
                sound.win();
            } else {
                haptic();
                sound.lose();
            }

            setTimeout(
                () => {
                    showStatsModal.value = true;
                },
                options.modalDelay ?? (won ? 2500 : 1800)
            );
        }

        // Speed mode is session-based — no persistent stats (tracked via finishSpeedSession)
        if (gameConfig.value.mode !== 'speed') {
            const statsKey = buildStatsKey(gameConfig.value);
            // Check if this is the user's first game ever (before saveResult increments the count)
            const totalGamesBefore = Object.values(statsStore.gameResults).reduce(
                (sum, results) => sum + results.length,
                0
            );
            statsStore.saveResult(statsKey, won, options.statsAttempts);
            statsStore.calculateStats(statsKey, gameConfig.value.maxGuesses);
            statsStore.calculateTotalStats();

            // Analytics — track game completion for ALL modes (classic, unlimited, dordle, tridle, quordle)
            const frustrationState = analytics.resetFrustrationState();
            const timeToComplete = gameStartTime
                ? Math.floor((Date.now() - gameStartTime) / 1000)
                : undefined;

            analytics.trackGameComplete({
                language: lang.languageCode,
                won,
                attempts: options.statsAttempts,
                streak_after: statsStore.stats.current_streak,
                game_mode: gameConfig.value.mode,
                play_type: gameConfig.value.playType,
                is_first_game: totalGamesBefore === 0,
                total_invalid_attempts: frustrationState.totalInvalidAttempts,
                max_consecutive_invalid: frustrationState.maxConsecutiveInvalid,
                had_frustration: frustrationState.hadFrustration,
                time_to_complete_seconds: timeToComplete,
            });

            if (won) {
                analytics.trackStreakMilestone(lang.languageCode, statsStore.stats.current_streak);
            }
        }
    }

    /** Handle a winning game (classic single-board, including unlimited). */
    function handleGameWon(): void {
        const lang = useLanguageStore();
        const statsStore = useStatsStore();
        const winWord = WIN_WORDS[activeRow.value - 1] || 'Phew';
        const targetWord = boards.value[0]?.targetWord || lang.todaysWord;

        completeGameSession(true, {
            attemptsValue: activeRow.value,
            emojiBoardText: getEmojiBoard(),
            notification: winWord,
            statsAttempts: activeRow.value,
        });

        // Win-specific: bounce animation
        if (import.meta.client) {
            setTimeout(() => {
                bounceRow(activeRow.value - 1);
            }, 300);
        }

        // Load definition/image for stats modal
        if (import.meta.client) {
            const dayIdx = gameConfig.value.playType === 'daily' ? lang.todaysIdx : undefined;
            loadDefinitionAndImage(targetWord, lang.languageCode, dayIdx);
        }

        submitWordStats(true, activeRow.value);

        // Show embed banner after game completion
        if (import.meta.client) {
            const { checkBanner } = useEmbed();
            setTimeout(() => checkBanner(), 2000);
        }
    }

    /** Handle a losing game (classic single-board, including unlimited). */
    function handleGameLost(): void {
        const lang = useLanguageStore();
        const statsStore = useStatsStore();
        const targetWord = boards.value[0]?.targetWord || lang.todaysWord;

        // Capture streak before it resets
        const previousStreak = statsStore.stats.current_streak;

        completeGameSession(false, {
            attemptsValue: 'X',
            emojiBoardText: getEmojiBoard(),
            notification: targetWord.toUpperCase(),
            notificationDuration: 12,
            statsAttempts: 0,
        });

        // Load definition/image for stats modal
        if (import.meta.client) {
            const dayIdx = gameConfig.value.playType === 'daily' ? lang.todaysIdx : undefined;
            loadDefinitionAndImage(targetWord, lang.languageCode, dayIdx);
        }

        submitWordStats(false, activeRow.value);

        // Analytics: track streak broken (if user had an active streak)
        if (previousStreak > 0) {
            const daysSinceLast =
                analytics.daysSince(readLocal('last_played_date') ?? undefined) ?? 0;
            analytics.trackStreakBroken(lang.languageCode, previousStreak, daysSinceLast);
        }

        // Show embed banner after game completion
        if (import.meta.client) {
            const { checkBanner } = useEmbed();
            setTimeout(() => checkBanner(), 2000);
        }
    }

    // ---- Notifications ----

    /** Show a toast notification with fade-out. */
    function showNotification(message: string, duration = 3): void {
        if (!import.meta.client) return;

        if (notification.value.show) {
            clearTimeout(notification.value.timeout);
            clearTimeout(notification.value.fadeTimeout);
            clearInterval(notification.value.slideInterval);
        }

        notification.value.show = true;
        notification.value.fading = false;
        notification.value.message = message;
        notification.value.top = 0;

        notification.value.timeout = window.setTimeout(() => {
            notification.value.fading = true;
            notification.value.fadeTimeout = window.setTimeout(() => {
                notification.value.show = false;
                notification.value.fading = false;
            }, 300);
        }, duration * 1000);

        notification.value.slideInterval = window.setInterval(() => {
            notification.value.top += 1;
            if (notification.value.top > 50) {
                clearInterval(notification.value.slideInterval);
            }
        }, 2);
    }

    // ---- Emoji board ----

    /** Generate the share emoji grid from tile colors. */
    function getEmojiBoard(): string {
        const settings = useSettingsStore();
        const rows: string[] = [];

        for (let i = 0; i < tileColors.value.length; i++) {
            const row = tileColors.value[i];
            if (!row) continue;
            const emoji = rowToEmoji(row, settings.highContrast);
            if (emoji === null) {
                attempts.value = String(i);
                return rows.join('\n');
            }
            rows.push(emoji);
            attempts.value = String(i + 1);
        }
        if (gameOver.value && !gameWon.value) attempts.value = 'X';
        return rows.join('\n');
    }

    /** Build the full share text including game title, number, and emoji board. */
    function getShareText(): string {
        const lang = useLanguageStore();
        const settings = useSettingsStore();
        const name = lang.config?.name_native || lang.config?.language_code || '';
        const hardModeFlag = settings.hardMode ? ' *' : '';
        const mode = gameConfig.value.mode;
        const isMultiBoard = GAME_MODE_CONFIG[mode].boardCount > 1;
        const gameName = isMultiBoard ? GAME_MODE_CONFIG[mode].label : 'Wordle';
        const header = `${gameName} ${name} #${lang.todaysIdx} — ${attempts.value}/${gameConfig.value.maxGuesses}${hardModeFlag}`;
        return emojiBoard.value ? `${header}\n\n${emojiBoard.value}` : header;
    }

    // ---- Persistence ----

    /** Save current game state to localStorage. */
    function saveToLocalStorage(): void {
        if (!import.meta.client) return;
        // Daily non-classic modes save under "{pageName}_daily" to avoid
        // colliding with unlimited saves under the bare pageName key.
        // Classic daily keeps bare pageName for backward compat.
        let pageName = window.location.pathname.split('/').pop() || 'home';
        if (gameConfig.value.playType === 'daily' && gameConfig.value.mode !== 'classic') {
            pageName = `${pageName}_daily`;
        }
        const data: SavedGameState = {
            tiles: tiles.value,
            tile_colors: tileColors.value,
            tile_classes: tileClasses.value,
            key_classes: keyClasses.value,
            active_row: activeRow.value,
            active_cell: activeCell.value,
            todays_word: useLanguageStore().todaysWord,
            game_over: gameOver.value,
            game_won: gameWon.value,
            emoji_board: emojiBoard.value,
            attempts: attempts.value,
            full_word_inputted: fullWordInputted.value,
        };
        writeJson(pageName, data);
    }

    /**
     * Reset board for a fresh game in a given mode.
     * Used by speed, unlimited, and other non-classic modes to start a new round.
     */
    function resetForMode(cfg: ReturnType<typeof createGameConfig>, targetWord?: string): void {
        gameConfig.value = cfg;
        boards.value = [createBoardState(0, targetWord || '', cfg.maxGuesses, cfg.wordLength)];
        activeBoardIndex.value = 0;
        gameOver.value = false;
        gameWon.value = false;
        initKeyClasses();
        showTiles();
    }

    /** Reset all game state to defaults. Called before loading a new language's game. */
    function resetGameState(): void {
        // Clean up speed timer if running
        if (_speedTimerInterval) {
            clearInterval(_speedTimerInterval);
            _speedTimerInterval = null;
        }

        // Reset board state via fresh BoardState
        const lang = useLanguageStore();
        const config = createGameConfig('classic', lang.languageCode || 'en', {
            wordLength: WORD_LENGTH,
            dayIndex: lang.todaysIdx,
        });
        gameConfig.value = config;
        boards.value = [
            createBoardState(0, lang.todaysWord || '', config.maxGuesses, config.wordLength),
        ];
        activeBoardIndex.value = 0;

        // Reset top-level state
        gameOver.value = false;
        gameWon.value = false;
        communityPercentile.value = null;
        communityIsTopScore.value = false;
        communityTotal.value = 0;
        communityStatsLink.value = null;
        shareButtonState.value = 'idle';
        srAnnouncement.value = '';
        todayDefinition.value = null;
        todayImageUrl.value = null;
        todayImageLoading.value = false;
        todayDefinitionLoading.value = false;
        maxDifficultyUsed.value = 0;
        notification.value = makeEmptyNotification();
    }

    /** Restore game state from localStorage. */
    function loadFromLocalStorage(): void {
        if (!import.meta.client) return;
        resetGameState();
        try {
            const lang = useLanguageStore();
            let pageName = window.location.pathname.split('/').pop() || 'home';
            if (gameConfig.value.playType === 'daily' && gameConfig.value.mode !== 'classic') {
                pageName = `${pageName}_daily`;
            }
            const data = readJson<SavedGameState>(pageName);
            if (data?.todays_word === lang.todaysWord) {
                tiles.value = data.tiles;
                tileClasses.value = data.tile_classes;
                keyClasses.value = data.key_classes;
                activeRow.value = data.active_row;
                activeCell.value = data.active_cell;
                gameOver.value = data.game_over;
                gameWon.value = data.game_won;
                emojiBoard.value = data.emoji_board;
                attempts.value = data.attempts;
                fullWordInputted.value = data.full_word_inputted;

                // Restore tileColors (backward-compatible with legacy saves without it)
                if (data.tile_colors) {
                    tileColors.value = data.tile_colors;
                } else {
                    // Derive from CSS classes for legacy saves
                    tileColors.value = data.tile_classes.map((row) =>
                        row.map((cls): TileColor => {
                            if (
                                cls.includes('correct') &&
                                !cls.includes('semicorrect') &&
                                !cls.includes('incorrect')
                            )
                                return 'correct';
                            if (cls.includes('semicorrect')) return 'semicorrect';
                            if (cls.includes('incorrect')) return 'incorrect';
                            if (cls.includes('pop') || cls.includes('filled')) return 'active';
                            return 'empty';
                        })
                    );
                }

                // Load definition/image if game was already completed
                if (data.game_over) {
                    const restoredWord = boards.value[0]?.targetWord || lang.todaysWord;
                    const dayIdx =
                        gameConfig.value.playType === 'daily' ? lang.todaysIdx : undefined;
                    loadDefinitionAndImage(restoredWord, lang.languageCode, dayIdx);
                }
            }
        } catch {
            // localStorage unavailable or corrupted data
        }
    }

    // ---- Countdown timer ----

    /** Calculate time remaining until midnight in the language's timezone. */
    function getTimeUntilNextDay(): string {
        const lang = useLanguageStore();
        const now = new Date();

        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const utcSeconds = now.getUTCSeconds();

        let localHours = utcHours + lang.timezoneOffset;
        if (localHours >= 24) localHours -= 24;
        if (localHours < 0) localHours += 24;

        const h = 23 - localHours;
        const m = 59 - utcMinutes;
        const s = 59 - utcSeconds;

        return `${h}h ${m}m ${s}s`;
    }

    function updateTimeUntilNextDay(): void {
        timeUntilNextDay.value = getTimeUntilNextDay();
    }

    // ---- Hard mode ----

    /**
     * Validate a guess against hard mode rules.
     * Returns an error message if invalid, or null if valid.
     */
    function checkHardMode(guess: string): string | null {
        const lang = useLanguageStore();
        const nMap = lang.normalizeMap;

        for (let r = 0; r < activeRow.value; r++) {
            const row = tiles.value[r];
            const colors = tileColors.value[r];
            if (!row || !colors) continue;

            for (let c = 0; c < row.length; c++) {
                const color = colors[c];
                const letter = row[c];
                if (!letter) continue;

                if (color === 'correct') {
                    if (!charsMatch(guess[c] || '', letter, nMap)) {
                        const tmpl =
                            lang.config?.text?.hard_mode_position ||
                            'Hard mode: {letter} must be in position {position}';
                        return tmpl
                            .replace('{letter}', letter.toUpperCase())
                            .replace('{position}', String(c + 1));
                    }
                } else if (color === 'semicorrect') {
                    const normalizedLetter = normalizeChar(letter, nMap).toLowerCase();
                    const guessHasLetter = [...guess].some(
                        (g) => normalizeChar(g, nMap).toLowerCase() === normalizedLetter
                    );
                    if (!guessHasLetter) {
                        const tmpl2 =
                            lang.config?.text?.hard_mode_contains ||
                            'Hard mode: guess must contain {letter}';
                        return tmpl2.replace('{letter}', letter.toUpperCase());
                    }
                }
            }
        }
        return null;
    }

    // ---- Tutorial ----

    /** Auto-show help modal on first visit for this language. */
    function maybeShowTutorial(): void {
        if (!import.meta.client) return;
        const lang = useLanguageStore();
        const langCode = lang.languageCode || 'unknown';
        const tutorialKey = `tutorial_shown_${langCode}`;
        if (readLocal(tutorialKey)) return;

        const pageName = window.location.pathname.split('/').pop() || 'home';
        if (readLocal(pageName)) return;

        showHelpModal.value = true;
        writeLocal(tutorialKey, 'true');
    }

    // ---- Community stats ----

    /** POST game result to the word stats API and update community percentile. */
    function submitWordStats(won: boolean, attemptsVal: number | string): void {
        if (!import.meta.client) return;
        const lang = useLanguageStore();
        const langCode = lang.languageCode;
        const dayIdx = lang.todaysIdx;
        if (!langCode || isNaN(dayIdx)) return;

        const clientId = getOrCreateId(STORAGE_KEYS.CLIENT_ID);

        try {
            $fetch(`/api/${langCode}/word-stats`, {
                method: 'POST',
                body: {
                    day_idx: dayIdx,
                    attempts: typeof attemptsVal === 'number' ? attemptsVal : 0,
                    won,
                    client_id: clientId,
                },
            })
                .then((stats: any) => {
                    if (!stats || !stats.total || !won) return;
                    const playerAttempts = typeof attemptsVal === 'number' ? attemptsVal : 7;
                    const result = calculateCommunityPercentile(playerAttempts, stats);
                    if (result !== null) {
                        communityPercentile.value = result.percentile;
                        communityIsTopScore.value = result.isTopScore;
                    }
                    communityTotal.value = stats.total;
                    communityStatsLink.value = lang.todaysWord
                        ? wordDetailPath(langCode, lang.todaysWord)
                        : `/${langCode}/word/${dayIdx}`;
                })
                .catch(() => {});
        } catch {
            // Ignore errors
        }
    }

    // ---- Definition & Image for Stats Modal ----

    /**
     * Load definition and image for a single-board game's stats modal.
     * Daily words use full 3-tier fetch (cached → LLM → kaikki).
     * Non-daily (unlimited) words use cache-only to avoid expensive LLM calls.
     */
    function loadDefinitionAndImage(word: string, langCode: string, dayIdx?: number): void {
        todayDefinitionLoading.value = true;
        todayImageLoading.value = true;
        todayDefinition.value = null; // clear previous to avoid showing stale definition

        const isDaily = gameConfig.value.playType === 'daily';
        const { fetchDefinition } = useDefinitions();

        fetchDefinition(word, langCode, { cacheOnly: !isDaily })
            .then((def) => {
                if (def.definition || def.definitionNative) {
                    todayDefinition.value = {
                        word: def.word,
                        definition: def.definitionNative || def.definition,
                        partOfSpeech: def.partOfSpeech,
                        url: wordDetailPath(langCode, word),
                    };
                }
            })
            .finally(() => {
                todayDefinitionLoading.value = false;
            });

        // Load word image — only for daily modes (images are pre-generated per day)
        if (isDaily && dayIdx != null) {
            const imgUrl = `/api/${langCode}/word-image/${encodeURIComponent(word)}?day_idx=${dayIdx}`;
            const img = new Image();
            img.onload = () => {
                todayImageUrl.value = imgUrl;
                todayImageLoading.value = false;
            };
            img.onerror = () => {
                todayImageLoading.value = false;
            };
            img.src = imgUrl;
        } else {
            todayImageUrl.value = null;
            todayImageLoading.value = false;
        }
    }

    /**
     * Load definitions for all boards in a multi-board game.
     * Multi-board modes are always free-play (unlimited), so use cache-only.
     */
    function loadDefinitionsForBoards(): void {
        if (!import.meta.client) return;
        const lang = useLanguageStore();
        const langCode = lang.languageCode;
        const words = boards.value.map((b) => b.targetWord);

        boardDefinitionsLoading.value = true;
        boardDefinitions.value = words.map(() => null);

        const { fetchDefinition } = useDefinitions();
        const promises = words.map((word, i) =>
            fetchDefinition(word, langCode, { cacheOnly: true }).then((def) => {
                if (def.definition || def.definitionNative) {
                    boardDefinitions.value[i] = {
                        word: def.word,
                        definition: def.definitionNative || def.definition,
                        partOfSpeech: def.partOfSpeech,
                    };
                }
            })
        );

        Promise.all(promises).finally(() => {
            boardDefinitionsLoading.value = false;
        });
    }

    // ---- Share ----

    /** Share results via useGameShare composable (single source of truth). */
    async function shareResults(): Promise<void> {
        if (!import.meta.client) return;

        const lang = useLanguageStore();
        const { shareResults: doShare } = useGameShare();

        await doShare({
            shareText: getShareText(),
            langCode: lang.languageCode,
            gameWon: gameWon.value,
            attempts: attempts.value,
            emojiBoard: emojiBoard.value,
            gameMode: gameConfig.value.mode,
            onNotify: (msg) => {
                // Use localized text if available, otherwise the default
                const localizedMsg = gameWon.value
                    ? lang.config?.text?.shared || lang.config?.text?.copied || msg
                    : lang.config?.text?.copied || msg;
                showNotification(localizedMsg);
            },
            onSuccess: () => {
                shareButtonState.value = 'success';
                setTimeout(() => {
                    shareButtonState.value = 'idle';
                }, 2000);
            },
            onAllFailed: (text) => showCopyFallbackModal(text),
        });
    }

    // Copy fallback modal — rendered by GameCopyFallbackModal component
    const copyFallbackText = ref<string | null>(null);

    function showCopyFallbackModal(text: string): void {
        copyFallbackText.value = text;
    }

    function closeCopyFallbackModal(): void {
        copyFallbackText.value = null;
    }

    // =======================================================================
    // Multi-Board Game Loop
    // =======================================================================

    /** Core multi-board guess handler — copies guess to all unsolved boards, colors, animates. */
    function processMultiBoardGuess(canonicalWord: string): void {
        const lang = useLanguageStore();
        // Use first UNSOLVED board's activeRow (not board[0] which may be solved/frozen)
        const unsolvedBoard = boards.value.find((b) => !b.solved);
        if (!unsolvedBoard) return;
        const rowIndex = unsolvedBoard.activeRow;
        const guessChars = splitWord(canonicalWord, lang.graphemeMode);
        const boardsToReveal: number[] = [];

        // 1. Copy typed letters to all unsolved boards and compute colors
        for (const board of boards.value) {
            if (board.solved) continue;

            // Copy guess characters to this board's tiles
            for (let i = 0; i < guessChars.length; i++) {
                board.tiles[rowIndex]?.splice(i, 1, guessChars[i]!);
            }

            // Compute colors for this board
            updateColorsForBoard(board, rowIndex);

            // Update per-board key states from pending updates
            for (const keyUpdate of board.pendingKeyUpdates) {
                if (keyUpdate) {
                    updateKeyColor(keyUpdate.char, keyUpdate.state, board.keyStates);
                }
            }

            boardsToReveal.push(board.boardIndex);
        }

        // Notify Vue that boards changed (deep property mutations on keyStates
        // don't trigger computed re-evaluation). triggerRef is O(1) vs the old
        // [...boards.value] which was O(n) and forced every board-dependent
        // computed across all 32 boards to re-evaluate.
        triggerRef(boards);

        // 2. Advance activeRow on ALL unsolved boards
        for (const board of boards.value) {
            if (board.solved) continue;
            board.activeRow++;
            board.activeCell = 0;
            board.fullWordInputted = false;
        }

        // Reset input state on the first unsolved board (for typing the next guess)
        const nextUnsolved = boards.value.find((b) => !b.solved);
        if (nextUnsolved) {
            nextUnsolved.activeCell = 0;
            nextUnsolved.fullWordInputted = false;
        }

        // 3. Animate all boards — no stagger for 5+ boards (too laggy)
        animating.value = true;
        const BOARD_STAGGER = boardsToReveal.length <= 4 ? 50 : 0;
        const revealPromises: Promise<void>[] = [];

        for (let i = 0; i < boardsToReveal.length; i++) {
            const boardIdx = boardsToReveal[i]!;
            const promise = new Promise<void>((resolve) => {
                if (BOARD_STAGGER > 0) {
                    setTimeout(() => {
                        revealRowForBoard(boardIdx, rowIndex).then(resolve);
                    }, i * BOARD_STAGGER);
                } else {
                    revealRowForBoard(boardIdx, rowIndex).then(resolve);
                }
            });
            revealPromises.push(promise);
        }

        Promise.all(revealPromises).then(() => {
            animating.value = false;
            showTilesAllBoards();
            checkMultiBoardCompletion(canonicalWord, rowIndex);

            // Keep activeBoardIndex pointing at an unsolved board so the
            // computed proxies (activeRow, activeCell, etc.) read/write
            // to a live board instead of a frozen solved one.
            const firstUnsolved = boards.value.findIndex((b) => !b.solved);
            if (firstUnsolved !== -1) {
                activeBoardIndex.value = firstUnsolved;
            }

            saveMultiBoardToLocalStorage();
        });
    }

    /** Staggered flip animation for a specific board at a specific row. */
    function revealRowForBoard(
        boardIndex: number,
        rowIndex: number,
        speedMultiplier: number = 1
    ): Promise<void> {
        if (!import.meta.client) {
            showTilesForBoard(boardIndex);
            return Promise.resolve();
        }

        const board = boards.value[boardIndex];
        if (!board) return Promise.resolve();

        // Try index-based getter first, fall back to single-board getter for the active board
        const boardEl =
            _getBoardElForIndex?.(boardIndex) ??
            (boardIndex === activeBoardIndex.value ? _getBoardEl?.() : null) ??
            null;
        const keys = board.keyStates;

        // 5+ boards or no DOM: instant update (no flip animation, no setTimeout cascade)
        if (boards.value.length > 4 || !boardEl) {
            for (let t = 0; t < (board.tiles[rowIndex]?.length ?? 5); t++) {
                const finalClass = board.tileClasses[rowIndex]?.[t] || '';
                board.tileClassesVisual[rowIndex]?.splice(t, 1, finalClass);
                const tileChar = board.tiles[rowIndex]?.[t] || '';
                board.tilesVisual[rowIndex]?.splice(t, 1, tileChar);
                const keyUpdate = board.pendingKeyUpdates[t];
                if (keyUpdate) updateKeyColor(keyUpdate.char, keyUpdate.state, keys);
            }
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            animateRevealRow(
                boardEl,
                rowIndex,
                {
                    onMidpoint(visualIdx) {
                        const finalClass = board.tileClasses[rowIndex]?.[visualIdx] || '';
                        board.tileClassesVisual[rowIndex]?.splice(visualIdx, 1, finalClass);
                        const tileChar = board.tiles[rowIndex]?.[visualIdx] || '';
                        board.tilesVisual[rowIndex]?.splice(visualIdx, 1, tileChar);
                        triggerRef(boards);

                        const keyUpdate = board.pendingKeyUpdates[visualIdx];
                        if (keyUpdate) {
                            updateKeyColor(keyUpdate.char, keyUpdate.state, keys);
                        }
                    },
                    onComplete: resolve,
                },
                speedMultiplier
            );
        });
    }

    /** Copy data layer to visual layer for one board. */
    /**
     * Sync data layer to visual layer for a board.
     * If onlyRow is specified, only sync that row (fast path for typing).
     */
    function showTilesForBoard(boardIndex: number, onlyRow?: number): void {
        const board = boards.value[boardIndex];
        if (!board) return;

        const maxRow =
            board.solved && board.solvedAtGuess != null ? board.solvedAtGuess : board.tiles.length;

        if (onlyRow !== undefined && onlyRow < maxRow) {
            const tilesRow = board.tiles[onlyRow];
            const classesRow = board.tileClasses[onlyRow];
            if (tilesRow && classesRow) {
                board.tilesVisual.splice(onlyRow, 1, [...tilesRow]);
                board.tileClassesVisual.splice(onlyRow, 1, [...classesRow]);
            }
            return;
        }

        for (let i = 0; i < maxRow; i++) {
            const tilesRow = board.tiles[i];
            const classesRow = board.tileClasses[i];
            if (!tilesRow || !classesRow) continue;
            board.tilesVisual.splice(i, 1, [...tilesRow]);
            board.tileClassesVisual.splice(i, 1, [...classesRow]);
        }
    }

    // Visible board indices — updated by IntersectionObserver in MultiBoardLayout
    const visibleBoardIndices = ref<Set<number> | null>(null);

    function setVisibleBoardIndices(indices: number[]): void {
        visibleBoardIndices.value = new Set(indices);
    }

    /** Sync visual layer for boards. If onlyRow specified, only sync visible + unsolved. */
    function showTilesAllBoards(onlyRow?: number): void {
        const visible = visibleBoardIndices.value;
        for (let i = 0; i < boards.value.length; i++) {
            if (onlyRow !== undefined && boards.value[i]?.solved) continue;
            if (onlyRow !== undefined && visible && visible.size > 0 && !visible.has(i)) continue;
            showTilesForBoard(i, onlyRow);
        }
        triggerRef(boards);
    }

    /** Check each unsolved board for a win, and check overall completion. */
    function checkMultiBoardCompletion(canonicalWord: string, revealedRow: number): void {
        const lang = useLanguageStore();
        const normalizedGuess = normalizeWord(canonicalWord, lang.normalizeMap);

        for (const board of boards.value) {
            if (board.solved) continue;

            const normalizedTarget = normalizeWord(board.targetWord, lang.normalizeMap);
            if (normalizedGuess === normalizedTarget) {
                board.solved = true;
                board.won = true;
                board.solvedAtGuess = revealedRow + 1;
                board.solvedAtTimestamp = Date.now();
            }
        }

        // Check overall game state
        const allSolved = boards.value.every((b) => b.solved);
        const maxGuesses = gameConfig.value.maxGuesses;
        const currentRow =
            boards.value.find((b) => !b.solved)?.activeRow ?? boards.value[0]!.activeRow;
        const outOfGuesses = currentRow >= maxGuesses;

        if (allSolved) {
            handleMultiBoardWon();
        } else if (outOfGuesses) {
            handleMultiBoardLost();
        }
    }

    /** Handle winning all boards in multi-board mode. */
    function handleMultiBoardWon(): void {
        const maxSolvedRow = Math.max(...boards.value.map((b) => b.solvedAtGuess ?? 0));
        const winWord = WIN_WORDS[maxSolvedRow - 1] || 'Phew';

        // Multi-board emoji grids are too large for sharing (32-board = wall of text).
        // Share text shows only the summary line (e.g. "Quordle #42 — 9/9").
        completeGameSession(true, {
            attemptsValue: maxSolvedRow,
            emojiBoardText: '',
            notification: winWord,
            statsAttempts: maxSolvedRow,
        });

        if (import.meta.client) loadDefinitionsForBoards();
    }

    /** Handle losing in multi-board mode — show unsolved target words. */
    function handleMultiBoardLost(): void {
        const unsolvedWords = boards.value
            .filter((b) => !b.solved)
            .map((b) => b.targetWord.toUpperCase())
            .join(', ');

        completeGameSession(false, {
            attemptsValue: 'X',
            emojiBoardText: '',
            notification: unsolvedWords,
            notificationDuration: 12,
            statsAttempts: 0,
        });

        if (import.meta.client) loadDefinitionsForBoards();
    }

    /** Save multi-board state to localStorage. */
    // Debounced save — avoids JSON.stringify of 32 boards on every keystroke.
    // Immediate save still happens on guess submission (processMultiBoardGuess).
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    function debouncedSaveMultiBoard(): void {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveMultiBoardToLocalStorage();
            saveTimer = null;
        }, 500);
    }

    function saveMultiBoardToLocalStorage(): void {
        if (!import.meta.client) return;
        const key = buildSaveKey(gameConfig.value);
        const data = {
            version: 2,
            mode: gameConfig.value.mode,
            active_row: boards.value[0]!.activeRow,
            game_over: gameOver.value,
            game_won: gameWon.value,
            boards: boards.value.map((board) => ({
                board_index: board.boardIndex,
                target_word: board.targetWord,
                tiles: board.tiles,
                tile_colors: board.tileColors,
                tile_classes: board.tileClasses,
                key_states: board.keyStates,
                solved: board.solved,
                won: board.won,
                solved_at_guess: board.solvedAtGuess,
                solved_at_timestamp: board.solvedAtTimestamp,
            })),
            emoji_board: emojiBoard.value,
            attempts: attempts.value,
        };
        writeJson(key, data);
    }

    /** Load multi-board state from localStorage. Returns true if restored. */
    function loadMultiBoardFromLocalStorage(
        mode: GameMode,
        targetWords: string[],
        playType?: PlayType
    ): boolean {
        if (!import.meta.client) return false;
        try {
            const lang = useLanguageStore();
            const cfg = createGameConfig(mode, lang.languageCode, {
                wordLength: WORD_LENGTH,
                dayIndex: lang.todaysIdx,
                playType: playType ?? gameConfig.value.playType,
            });
            const key = buildSaveKey(cfg);
            const data = readJson<any>(key);
            if (!data || data?.version !== 2) return false;
            if (!data.boards || data.boards.length !== targetWords.length) return false;

            // Validate target words match (ensures same day)
            for (let i = 0; i < targetWords.length; i++) {
                if (data.boards[i]?.target_word !== targetWords[i]) return false;
            }

            // Restore state
            gameConfig.value = cfg;
            boards.value = data.boards.map((saved: any, idx: number) => {
                const board = createBoardState(
                    idx,
                    saved.target_word,
                    cfg.maxGuesses,
                    cfg.wordLength
                );
                board.tiles = saved.tiles;
                board.tileColors = saved.tile_colors;
                board.tileClasses = saved.tile_classes;
                board.keyStates = saved.key_states || {};
                board.solved = saved.solved || false;
                board.won = saved.won || false;
                board.solvedAtGuess = saved.solved_at_guess ?? null;
                board.solvedAtTimestamp = saved.solved_at_timestamp ?? null;
                // Solved boards keep their frozen activeRow; unsolved boards get the shared row
                board.activeRow = board.solved
                    ? (board.solvedAtGuess ?? data.active_row)
                    : data.active_row;
                board.activeCell = 0;
                board.fullWordInputted = false;
                return board;
            });

            // Point activeBoardIndex at the first unsolved board (so computed
            // proxies read from a live board, not a frozen solved one).
            const firstUnsolvedIdx = boards.value.findIndex((b) => !b.solved);
            activeBoardIndex.value = firstUnsolvedIdx !== -1 ? firstUnsolvedIdx : 0;

            gameOver.value = data.game_over || false;
            gameWon.value = data.game_won || false;
            emojiBoard.value = data.emoji_board || '';
            attempts.value = data.attempts || '0';

            // Render restored tiles (same as classic's loadFromLocalStorage + showTiles)
            showTilesAllBoards();

            // Load definitions for completed multi-board games on restore
            if (data.game_over) {
                loadDefinitionsForBoards();
            }

            return true;
        } catch {
            return false;
        }
    }

    // =======================================================================
    // Speed Streak Methods
    // =======================================================================

    function pickSpeedWord(): string {
        const list = _speedWordList;
        if (list.length <= 1) return list[0] || '';
        const currentWord = boards.value[0]?.targetWord || '';
        let word: string;
        do {
            word = list[Math.floor(Math.random() * list.length)]!;
        } while (word === currentWord && list.length > 1);
        return word;
    }

    function speedTimerTick(): void {
        // Pressure ramp: timer ticks faster based on words solved
        const tickAmount = Math.round(100 * speedState.value.tickSpeed);
        speedState.value.timeRemaining -= tickAmount;

        if (speedState.value.timeRemaining <= 0) {
            speedState.value.timeRemaining = 0;
            finishSpeedSession();
            return;
        }

        // Update urgency level for background effects
        const tr = speedState.value.timeRemaining;
        speedState.value.urgencyLevel = tr > 60_000 ? 0 : tr > 30_000 ? 1 : tr > 10_000 ? 2 : 3;

        // Tick sound + haptic only in last 5 seconds
        if (tr <= 5_000 && tr % 1000 < tickAmount && import.meta.client) {
            const { sound } = useSounds();
            sound.tick();
            const { haptic } = useHaptics();
            haptic.confirm();
        }

        // Clear lastEvent after 600ms so UI flash resets
        if (speedState.value.lastEvent !== 'none') {
            setTimeout(() => {
                speedState.value.lastEvent = 'none';
            }, 600);
        }
    }

    function startSpeedSession(wordList: string[]): void {
        if (_speedTimerInterval) {
            clearInterval(_speedTimerInterval);
            _speedTimerInterval = null;
        }
        _speedWordList = wordList;
        speedState.value = {
            active: true,
            timeRemaining: SPEED_INITIAL_TIME,
            totalTime: SPEED_INITIAL_TIME,
            wordsSolved: 0,
            wordsFailed: 0,
            totalGuesses: 0,
            solvedWords: [],
            failedWords: [],
            wordStartTime: 0,
            countdownPhase: 'countdown',
            score: 0,
            combo: 0,
            maxCombo: 0,
            tickSpeed: 1.0,
            lastTimeDelta: 0,
            lastEvent: 'none',
            urgencyLevel: 0,
            arcadeEvents: [],
            lastMissedWord: '',
        };
        _arcadeEventId = 0;

        // Pick first word and set up the board
        const word = pickSpeedWord();
        const cfg = createGameConfig('speed', gameConfig.value.language, {
            wordLength: 5,
            playType: gameConfig.value.playType,
        });
        gameConfig.value = cfg;
        boards.value = [createBoardState(0, word, cfg.maxGuesses, cfg.wordLength)];
        activeBoardIndex.value = 0;
        gameOver.value = false;
        gameWon.value = false;
        initKeyClasses();
        showTiles();

        // 3-2-1-GO countdown then start playing
        setTimeout(() => {
            speedState.value.countdownPhase = 'playing';
            speedState.value.wordStartTime = Date.now();
            _speedTimerInterval = setInterval(() => speedTimerTick(), 100);
        }, 3000);
    }

    /** Pick a new speed word and reset the board for the next round. */
    function resetSpeedBoard(): void {
        const word = pickSpeedWord();
        const cfg = gameConfig.value;
        boards.value = [createBoardState(0, word, cfg.maxGuesses, cfg.wordLength)];
        activeBoardIndex.value = 0;
        initKeyClasses();
        showTiles();
        speedState.value.wordStartTime = Date.now();
        // Track each new round so we can count individual rounds within a session
        const lang = useLanguageStore();
        analytics.trackGameRoundStart(lang.languageCode, 'speed');
    }

    function handleSpeedWordSolved(): void {
        if (speedState.value.countdownPhase !== 'playing') return;
        const board = boards.value[activeBoardIndex.value]!;
        const guesses = board.activeRow;
        const timeMs = Date.now() - speedState.value.wordStartTime;

        // Combo tracking
        speedState.value.combo++;
        if (speedState.value.combo > speedState.value.maxCombo) {
            speedState.value.maxCombo = speedState.value.combo;
        }

        // Scoring: (7 - guesses) × 100 × combo multiplier (1.0, 1.5, 2.0, 2.5, 3.0 cap)
        const comboMultiplier = Math.min(1 + (speedState.value.combo - 1) * 0.5, 3.0);
        const basePoints = (7 - guesses) * 100;
        const points = Math.round(basePoints * comboMultiplier);
        speedState.value.score += points;

        speedState.value.solvedWords.push({ word: board.targetWord, guesses, timeMs, points });
        speedState.value.wordsSolved++;
        speedState.value.totalGuesses += guesses;

        // Time bonus based on guesses (1=+60s, 2=+50s, ... 6=+10s)
        const bonus = SPEED_BONUS_TABLE[Math.min(guesses, 6)] ?? 10_000;
        speedState.value.timeRemaining += bonus;
        speedState.value.lastTimeDelta = bonus;
        speedState.value.lastEvent = 'solve';

        // Pressure ramp: every SPEED_RAMP_INTERVAL words, tick faster
        const rampLevel = Math.floor(speedState.value.wordsSolved / SPEED_RAMP_INTERVAL);
        speedState.value.tickSpeed = Math.min(1.0 + rampLevel * 0.2, 2.5);

        // Push arcade events for UI
        pushArcadeEvent({
            id: ++_arcadeEventId,
            type: 'solve',
            word: board.targetWord,
            guesses,
            points,
            bonus,
            combo: speedState.value.combo,
            emoji: SOLVE_REACTIONS[Math.min(guesses, 6)],
        });

        // Milestone check (every 5 words)
        if (speedState.value.wordsSolved % 5 === 0) {
            speedState.value.lastEvent = 'milestone';
            pushArcadeEvent({
                id: ++_arcadeEventId,
                type: 'milestone',
                milestone: speedState.value.wordsSolved,
                label: `${speedState.value.wordsSolved} WORDS!`,
                emoji: '🏆',
            });
        }

        // Combo milestone at 3, 5, 10
        if ([3, 5, 10].includes(speedState.value.combo)) {
            pushArcadeEvent({
                id: ++_arcadeEventId,
                type: 'combo',
                combo: speedState.value.combo,
                label: `${speedState.value.combo}x COMBO`,
                emoji: '🔥',
            });
        }

        if (import.meta.client) {
            const { haptic } = useHaptics();
            const { sound } = useSounds();
            // Stronger haptic for better solves
            if (guesses <= 2) {
                haptic.success();
                haptic.success();
            } else {
                haptic.success();
            }
            sound.solveChime();
        }

        // Pick new word and reset board
        resetSpeedBoard();
    }

    function handleSpeedWordFailed(): void {
        if (speedState.value.countdownPhase !== 'playing') return;
        const board = boards.value[activeBoardIndex.value]!;
        speedState.value.failedWords.push(board.targetWord);
        speedState.value.wordsFailed++;
        speedState.value.totalGuesses += board.activeRow;

        // Break combo
        speedState.value.combo = 0;

        // Time penalty: -30s
        speedState.value.timeRemaining = Math.max(
            0,
            speedState.value.timeRemaining - SPEED_FAIL_PENALTY
        );
        speedState.value.lastTimeDelta = -SPEED_FAIL_PENALTY;
        speedState.value.lastEvent = 'fail';

        pushArcadeEvent({
            id: ++_arcadeEventId,
            type: 'fail',
            word: board.targetWord,
            penalty: SPEED_FAIL_PENALTY,
            label: board.targetWord.toUpperCase(),
            emoji: '💀',
        });

        if (speedState.value.timeRemaining <= 0) {
            finishSpeedSession();
            return;
        }

        if (import.meta.client) {
            const { haptic } = useHaptics();
            const { sound } = useSounds();
            haptic.error();
            haptic.error();
            sound.failBuzz();
        }

        // Show target word briefly
        showNotification(board.targetWord.toUpperCase(), 0.5);

        // Pick new word and reset board
        resetSpeedBoard();
    }

    function finishSpeedSession(): void {
        if (_speedTimerInterval) {
            clearInterval(_speedTimerInterval);
            _speedTimerInterval = null;
        }
        // Save the word that was in progress when time ran out
        const currentBoard = boards.value[activeBoardIndex.value];
        speedState.value.lastMissedWord = currentBoard?.targetWord || '';
        speedState.value.countdownPhase = 'finished';
        speedState.value.active = false;
        gameOver.value = true;

        if (import.meta.client) {
            const { sound } = useSounds();
            const { haptic } = useHaptics();
            sound.timeUp();
            haptic.error();
        }

        // Reset frustration counters so they don't leak into the next non-speed game
        analytics.resetFrustrationState();

        // Analytics: single game_complete with speed-specific extras
        const lang = useLanguageStore();
        const s = speedState.value;
        const totalSolveTimeMs = s.solvedWords.reduce((sum, w) => sum + w.timeMs, 0);
        analytics.trackGameComplete({
            language: lang.languageCode,
            won: false,
            attempts: s.totalGuesses,
            streak_after: 0,
            game_mode: 'speed',
            play_type: gameConfig.value.playType,
            time_to_complete_seconds: SPEED_INITIAL_TIME / 1000,
            words_solved: s.wordsSolved,
            words_failed: s.wordsFailed,
            score: s.score,
            max_combo: s.maxCombo,
            avg_time_per_word_seconds:
                s.wordsSolved > 0
                    ? Math.round((totalSolveTimeMs / s.wordsSolved / 1000) * 10) / 10
                    : 0,
        });

        // Persist the session so it shows up on /stats. Only record sessions
        // where the user actually played (≥1 guess) to avoid noise from users
        // who land in speed mode and immediately leave.
        if (lang.languageCode && s.totalGuesses > 0) {
            const statsStore = useStatsStore();
            statsStore.saveSpeedResult(lang.languageCode, {
                score: s.score,
                wordsSolved: s.wordsSolved,
                wordsFailed: s.wordsFailed,
                maxCombo: s.maxCombo,
                totalGuesses: s.totalGuesses,
            });
        }
    }

    function getSpeedShareText(): string {
        const lang = useLanguageStore();
        const name = lang.config?.name_native || lang.config?.language_code || '';
        const solved = speedState.value.wordsSolved;
        const avgGuesses = solved > 0 ? (speedState.value.totalGuesses / solved).toFixed(1) : '0';
        const avgTime =
            solved > 0
                ? (
                      speedState.value.solvedWords.reduce((s, w) => s + w.timeMs, 0) /
                      solved /
                      1000
                  ).toFixed(1)
                : '0';
        const score = speedState.value.score;
        const maxCombo = speedState.value.maxCombo;
        return `Wordle ${name} ⚡ Speed Streak\n🏆 ${solved} words · ${score.toLocaleString()} pts\n🔥 ${maxCombo}x max combo\nAvg: ${avgGuesses} guesses · ${avgTime}s/word`;
    }

    function resetSpeedState(): void {
        if (_speedTimerInterval) {
            clearInterval(_speedTimerInterval);
            _speedTimerInterval = null;
        }
        speedState.value = {
            active: false,
            timeRemaining: SPEED_INITIAL_TIME,
            totalTime: SPEED_INITIAL_TIME,
            wordsSolved: 0,
            wordsFailed: 0,
            totalGuesses: 0,
            solvedWords: [],
            failedWords: [],
            wordStartTime: 0,
            countdownPhase: 'idle',
            score: 0,
            combo: 0,
            maxCombo: 0,
            tickSpeed: 1.0,
            lastTimeDelta: 0,
            lastEvent: 'none',
            urgencyLevel: 0,
            arcadeEvents: [],
            lastMissedWord: '',
        };
        _arcadeEventId = 0;
        _speedWordList = [];
    }

    // =======================================================================
    // Return public API
    // =======================================================================

    return {
        // Multi-board architecture
        gameConfig,
        gameActive,
        boards,
        activeBoardIndex,
        isMultiBoard,
        mergedKeyStates,

        // State (computed proxies to active board)
        tiles,
        tileColors,
        tileClasses,
        tilesVisual,
        tileClassesVisual,
        activeRow,
        activeCell,
        fullWordInputted,
        gameOver,
        gameWon,
        attempts,
        keyClasses,
        pendingKeyUpdates,
        animating,
        shakingRow,
        showHelpModal,
        showStatsModal,
        showOptionsModal,
        showStreakModal,
        debugStreakOverride,
        effectiveStreak,
        notification,
        emojiBoard,
        timeUntilNextDay,
        communityPercentile,
        communityIsTopScore,
        communityTotal,
        communityStatsLink,
        shareButtonState,
        copyFallbackText,
        closeCopyFallbackModal,
        srAnnouncement,
        todayDefinition,
        todayImageUrl,
        todayImageLoading,
        todayDefinitionLoading,
        boardDefinitions,
        boardDefinitionsLoading,
        loadDefinitionsForBoards,
        allowAnyWord,
        maxDifficultyUsed,
        // hardMode is owned by settings store

        // Actions
        setBoardEl,
        setBoardElForIndex,
        setKeyboardEl,
        initKeyClasses,
        resetCaches,
        initTimingState,
        addChar,
        checkWord,
        updateColors,
        updateKeyColor,
        keyClick,
        keyDown,
        showTiles,
        showTilesForBoard,
        showTilesAllBoards,
        setVisibleBoardIndices,
        revealRow,
        shakeRow,
        bounceRow,
        handleGameWon,
        handleGameLost,
        showNotification,
        getEmojiBoard,
        getShareText,
        resetForMode,
        resetGameState,
        saveToLocalStorage,
        loadFromLocalStorage,
        loadMultiBoardFromLocalStorage,
        saveMultiBoardToLocalStorage,
        getTimeUntilNextDay,
        updateTimeUntilNextDay,
        checkHardMode,
        maybeShowTutorial,
        submitWordStats,
        shareResults,

        // Speed Streak
        speedState,
        startSpeedSession,
        finishSpeedSession,
        resetSpeedState,
        getSpeedShareText,
    };
});
