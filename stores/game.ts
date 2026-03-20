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
import { ref, computed } from 'vue';
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
import { toFinalForm, toRegularForm } from '~/utils/positional';
import { splitWord } from '~/utils/graphemes';
import { calculateCommunityPercentile } from '~/utils/stats';
import { WORD_LENGTH, MAX_GUESSES } from '~/utils/types';
import type { KeyState, TileColor, Notification } from '~/utils/types';
import { animateRevealRow, animateKeyNudge } from '~/utils/game/useGameAnimations';
import { getOrCreateId } from '~/utils/storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIN_WORDS = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'] as const;

const DEFAULT_TILE_CLASS = 'border-2 border-neutral-300';
const ACTIVE_TILE_CLASS =
    'text-2xl tiny:text-4xl uppercase font-bold select-none border-2 border-neutral-500 pop';
const BASE_REVEALED_CLASS = 'text-2xl tiny:text-4xl uppercase font-bold select-none text-white';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmptyGrid<T>(rows: number, cols: number, value: T): T[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

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
    // State
    // =======================================================================

    const tiles = ref<string[][]>(makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, ''));
    const tileColors = ref<TileColor[][]>(makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, 'empty'));
    const tileClasses = ref<string[][]>(
        makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, DEFAULT_TILE_CLASS)
    );
    const tilesVisual = ref<string[][]>(makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, ''));
    const tileClassesVisual = ref<string[][]>(
        makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, DEFAULT_TILE_CLASS)
    );

    const activeRow = ref(0);
    const activeCell = ref(0);
    const fullWordInputted = ref(false);

    const gameOver = ref(false);
    const gameLost = computed(() => gameOver.value && !gameWon.value);
    const gameWon = ref(false);
    const attempts = ref('0');

    const keyClasses = ref<Record<string, KeyState>>({});
    const pendingKeyUpdates = ref<Array<{ char: string; state: KeyState } | undefined>>([]);

    const animating = ref(false);
    const shakingRow = ref(-1);

    const showHelpModal = ref(false);
    const showStatsModal = ref(false);
    const showOptionsModal = ref(false);

    const notification = ref<Notification>(makeEmptyNotification());

    const emojiBoard = ref('');
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

    const allowAnyWord = ref(false);

    const maxDifficultyUsed = ref(0);

    // =======================================================================
    // DOM refs (set by game page via setBoardEl/setKeyboardEl)
    // =======================================================================

    let _getBoardEl: (() => HTMLElement | null) | null = null;
    let _getKeyboardEl: (() => HTMLElement | null) | null = null;

    function setBoardEl(getter: () => HTMLElement | null): void {
        _getBoardEl = getter;
    }

    function setKeyboardEl(getter: () => HTMLElement | null): void {
        _getKeyboardEl = getter;
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

    /**
     * Fully normalize a character (positional variants + diacritics).
     * E.g., "ך" -> "כ" -> "כ", or "ä" -> "a".
     */
    function fullNormalize(char: string): string {
        const lang = useLanguageStore();
        const positionalNorm = toRegularForm(char, lang.finalFormReverseMap);
        return lang.normalizeMap.get(positionalNorm) || positionalNorm;
    }

    /** Check if two characters match considering both normalizations. */
    function fullCharsMatch(c1: string, c2: string): boolean {
        return fullNormalize(c1) === fullNormalize(c2);
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
        const keys: Record<string, KeyState> = {};
        for (const char of lang.characters) {
            keys[char] = '';
        }
        keys['⟹'] = '';
        keys['ENTER'] = '';
        keys['DEL'] = '';
        keys['⌫'] = '';
        keyClasses.value = keys;
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
        const row = tiles.value[activeRow.value];
        const rowClasses = tileClasses.value[activeRow.value];
        if (row && rowClasses) {
            const isLastPosition = activeCell.value === WORD_LENGTH - 1;
            const displayChar = toFinalForm(char, isLastPosition, lang.config ?? {});
            row.splice(activeCell.value, 1, displayChar);
            rowClasses.splice(activeCell.value, 1, ACTIVE_TILE_CLASS);
            tileColors.value[activeRow.value]?.splice(activeCell.value, 1, 'active');
        }
        activeCell.value = Math.min(activeCell.value + 1, WORD_LENGTH);
        if (activeCell.value === WORD_LENGTH) {
            fullWordInputted.value = true;
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

        // Exact match — respect what the user typed (e.g., "lapiz" stays "lapiz")
        if (lang.wordListSet.has(word)) return word;

        // Normalized match — auto-correct to canonical form (e.g., "borde" → "börde")
        // Only triggers when the typed form isn't in the word list itself
        const normalized = normalizeWord(word, lang.normalizeMap);
        const canonical = getNormalizedWordMap().get(normalized);
        if (canonical) return canonical;

        return null;
    }

    // ---- Color algorithm ----

    /** Update tile colors for the current row based on Wordle rules. */
    function updateColors(): void {
        const lang = useLanguageStore();
        const targetWord = lang.todaysWord;

        // Split target word into characters (grapheme clusters or codepoints)
        const targetChars = splitWord(targetWord, lang.graphemeMode);

        // Count characters in target using fully normalized forms
        const charCounts: Record<string, number> = {};
        for (const char of targetChars) {
            const normalizedChar = fullNormalize(char);
            charCounts[normalizedChar] = (charCounts[normalizedChar] || 0) + 1;
        }

        const row = tiles.value[activeRow.value];
        const classes = tileClasses.value[activeRow.value];
        const colors = tileColors.value[activeRow.value];
        if (!row || !classes || !colors) return;

        // Store per-tile keyboard updates for staggered reveal
        pendingKeyUpdates.value = [];

        // First pass: mark correct positions
        for (let i = 0; i < row.length; i++) {
            const guessChar = row[i];
            const targetChar = targetChars[i];
            if (guessChar && targetChar && fullCharsMatch(guessChar, targetChar)) {
                colors.splice(i, 1, 'correct');
                classes.splice(i, 1, `correct ${BASE_REVEALED_CLASS}`);
                row.splice(i, 1, targetChar);
                pendingKeyUpdates.value[i] = {
                    char: guessChar,
                    state: 'key-correct' as KeyState,
                };
                const normalizedChar = fullNormalize(guessChar);
                const count = charCounts[normalizedChar];
                if (count !== undefined) charCounts[normalizedChar] = count - 1;
            }
        }

        // Second pass: mark semi-correct and incorrect
        for (let i = 0; i < row.length; i++) {
            const guessChar = row[i];
            if (!guessChar || colors[i] === 'correct') continue;

            const normalizedGuess = fullNormalize(guessChar);
            const count = charCounts[normalizedGuess];

            const targetHasChar = targetChars.some((tc) => fullCharsMatch(guessChar, tc));

            if (targetHasChar && count !== undefined && count > 0) {
                colors.splice(i, 1, 'semicorrect');
                classes.splice(i, 1, `semicorrect ${BASE_REVEALED_CLASS}`);
                pendingKeyUpdates.value[i] = {
                    char: guessChar,
                    state: 'key-semicorrect' as KeyState,
                };
                charCounts[normalizedGuess] = count - 1;
            } else {
                colors.splice(i, 1, 'incorrect');
                classes.splice(i, 1, `incorrect ${BASE_REVEALED_CLASS}`);
                pendingKeyUpdates.value[i] = {
                    char: guessChar,
                    state: 'key-incorrect' as KeyState,
                };
            }
        }
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
                    lang.config?.text?.notification_partial_word || 'Please enter a full word'
                );
                return;
            }

            const row = tiles.value[activeRow.value];
            const typedWord = row ? row.join('').toLowerCase() : '';
            const canonicalWord = checkWord(typedWord);

            if (canonicalWord) {
                // Hard mode validation
                if (settings.hardMode) {
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

                // Track time between guesses
                if (lastGuessTime && activeRow.value > 0) {
                    const secondsSinceLast = Math.floor((Date.now() - lastGuessTime) / 1000);
                    analytics.trackGuessTime(
                        lang.languageCode,
                        activeRow.value + 1,
                        secondsSinceLast
                    );
                }
                lastGuessTime = Date.now();

                // Track valid guess submission
                analytics.trackGuessSubmit(lang.languageCode, activeRow.value + 1, true);

                // Update tiles to show canonical form (with diacritics)
                if (row && canonicalWord !== typedWord) {
                    const canonicalChars = splitWord(canonicalWord, lang.graphemeMode);
                    for (let i = 0; i < canonicalChars.length; i++) {
                        row.splice(i, 1, canonicalChars[i]);
                    }
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

                revealRow(revealingRow).then(() => {
                    animating.value = false;
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
                    const normalizedGuess = normalizeWord(canonicalWord, lang.normalizeMap);
                    const normalizedTarget = normalizeWord(lang.todaysWord, lang.normalizeMap);
                    if (normalizedGuess === normalizedTarget) {
                        handleGameWon();
                    } else if (activeRow.value === MAX_GUESSES) {
                        handleGameLost();
                    }

                    saveToLocalStorage();
                });
            } else {
                if (import.meta.client) {
                    const { haptic } = useHaptics();
                    haptic.error();
                }
                shakeRow(activeRow.value);
                showNotification(
                    lang.config?.text?.notification_word_not_valid || 'Word is not valid'
                );

                // Track invalid word and update session frustration state
                analytics.trackInvalidWordAndUpdateState({
                    language: lang.languageCode,
                    attempt_number: activeRow.value + 1,
                    word: typedWord,
                });
                analytics.trackGuessSubmit(lang.languageCode, activeRow.value + 1, false);
            }
        } else if (['Backspace', 'Delete', '⌫'].includes(key) && activeCell.value > 0) {
            activeCell.value--;
            const row = tiles.value[activeRow.value];
            const rowClasses = tileClasses.value[activeRow.value];
            if (row && rowClasses) {
                row.splice(activeCell.value, 1, '');
                rowClasses.splice(activeCell.value, 1, DEFAULT_TILE_CLASS);
                tileColors.value[activeRow.value]?.splice(activeCell.value, 1, 'empty');
            }
            fullWordInputted.value = false;
        } else if (!fullWordInputted.value && lang.acceptableCharacters.includes(key)) {
            addChar(key);
        }

        if (!animating.value) {
            showTiles();
            saveToLocalStorage();
        }
    }

    // ---- Visual sync ----

    /** Sync data layer to visual layer. RTL is handled by CSS direction on the grid. */
    function showTiles(): void {
        for (let i = 0; i < tiles.value.length; i++) {
            const tilesRow = tiles.value[i];
            const classesRow = tileClasses.value[i];
            if (!tilesRow || !classesRow) continue;

            tilesVisual.value.splice(i, 1, [...tilesRow]);
            tileClassesVisual.value.splice(i, 1, [...classesRow]);
        }
    }

    // ---- Animations ----

    /** Staggered flip animation for a completed row. Returns a Promise. */
    function revealRow(rowIndex: number): Promise<void> {
        if (!import.meta.client) {
            showTiles();
            return Promise.resolve();
        }

        const lang = useLanguageStore();
        const keys = keyClasses.value;
        const boardEl = _getBoardEl?.() ?? null;

        return new Promise((resolve) => {
            animateRevealRow(boardEl, rowIndex, {
                onMidpoint(visualIdx) {
                    const finalClass = tileClasses.value[rowIndex]?.[visualIdx] || '';
                    tileClassesVisual.value[rowIndex]?.splice(visualIdx, 1, finalClass);
                    const tileChar = tiles.value[rowIndex]?.[visualIdx] || '';
                    tilesVisual.value[rowIndex]?.splice(visualIdx, 1, tileChar);

                    const keyUpdate = pendingKeyUpdates.value[visualIdx];
                    if (keyUpdate) {
                        updateKeyColor(keyUpdate.char, keyUpdate.state, keys);
                    }
                },
                onComplete: resolve,
            });
        });
    }

    /** Animate a keyboard key with a CSS animation class. */
    function _nudgeKey(char: string, animClass: string): void {
        if (!import.meta.client) return;
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

    /** Handle a winning game. */
    function handleGameWon(): void {
        const lang = useLanguageStore();
        const statsStore = useStatsStore();

        gameOver.value = true;
        gameWon.value = true;
        emojiBoard.value = getEmojiBoard();
        const winWord = WIN_WORDS[activeRow.value - 1] || 'Phew';
        showNotification(winWord, 3);

        if (import.meta.client) {
            const { haptic } = useHaptics();
            const { sound } = useSounds();
            haptic.success();
            sound.win();

            setTimeout(() => {
                bounceRow(activeRow.value - 1);
            }, 300);

            setTimeout(() => {
                showStatsModal.value = true;
            }, 2500);
        }

        // Load definition and image for stats modal display
        if (import.meta.client) {
            loadDefinitionAndImage(lang.todaysWord, lang.languageCode, lang.todaysIdx);
        }

        submitWordStats(true, activeRow.value);

        statsStore.saveResult(lang.languageCode, true, activeRow.value);
        statsStore.calculateStats(lang.languageCode);
        statsStore.calculateTotalStats();

        // Analytics: track game completion and streak milestones
        const frustrationState = analytics.resetFrustrationState();
        const timeToComplete = gameStartTime
            ? Math.floor((Date.now() - gameStartTime) / 1000)
            : undefined;

        analytics.trackGameComplete({
            language: lang.languageCode,
            won: true,
            attempts: activeRow.value,
            streak_after: statsStore.stats.current_streak,
            total_invalid_attempts: frustrationState.totalInvalidAttempts,
            max_consecutive_invalid: frustrationState.maxConsecutiveInvalid,
            had_frustration: frustrationState.hadFrustration,
            time_to_complete_seconds: timeToComplete,
        });
        analytics.trackStreakMilestone(lang.languageCode, statsStore.stats.current_streak);
        analytics.updateUserProperties(statsStore.gameResults);

        // Show embed banner after game completion
        if (import.meta.client) {
            const { checkBanner } = useEmbed();
            setTimeout(() => checkBanner(), 2000);
        }
    }

    /** Handle a losing game. */
    function handleGameLost(): void {
        const lang = useLanguageStore();
        const statsStore = useStatsStore();

        showNotification(lang.todaysWord.toUpperCase(), 12);

        if (import.meta.client) {
            const { haptic } = useHaptics();
            const { sound } = useSounds();
            haptic();
            sound.lose();

            setTimeout(() => {
                showStatsModal.value = true;
            }, 1800);
        }

        gameOver.value = true;
        gameWon.value = false;
        attempts.value = 'X';

        // Load definition and image for stats modal display
        if (import.meta.client) {
            loadDefinitionAndImage(lang.todaysWord, lang.languageCode, lang.todaysIdx);
        }

        submitWordStats(false, activeRow.value);

        statsStore.saveResult(lang.languageCode, false, activeRow.value);
        statsStore.calculateStats(lang.languageCode);
        statsStore.calculateTotalStats();

        // Analytics: track game completion
        const lossFrustrationState = analytics.resetFrustrationState();
        const lossTimeToComplete = gameStartTime
            ? Math.floor((Date.now() - gameStartTime) / 1000)
            : undefined;

        analytics.trackGameComplete({
            language: lang.languageCode,
            won: false,
            attempts: 'X',
            streak_after: 0,
            total_invalid_attempts: lossFrustrationState.totalInvalidAttempts,
            max_consecutive_invalid: lossFrustrationState.maxConsecutiveInvalid,
            had_frustration: lossFrustrationState.hadFrustration,
            time_to_complete_seconds: lossTimeToComplete,
        });
        analytics.updateUserProperties(statsStore.gameResults);

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
        let board = '';
        const greenEmoji = settings.highContrast ? '🟦' : '🟩';
        const yellowEmoji = settings.highContrast ? '🟧' : '🟨';

        for (let i = 0; i < tileColors.value.length; i++) {
            const row = tileColors.value[i];
            if (!row) continue;

            for (const color of row) {
                if (color === 'correct') {
                    board += greenEmoji;
                } else if (color === 'semicorrect') {
                    board += yellowEmoji;
                } else if (color === 'incorrect') {
                    board += '⬜';
                } else {
                    // Row not fully revealed yet — stop here
                    attempts.value = String(i);
                    return board;
                }
            }
            if (i < tileColors.value.length - 1) board += '\n';
            attempts.value = String(i + 1);
        }
        if (gameOver.value && !gameWon.value) attempts.value = 'X';
        return board;
    }

    /** Build the full share text including game title, number, and emoji board. */
    function getShareText(): string {
        const lang = useLanguageStore();
        const settings = useSettingsStore();
        const name = lang.config?.name_native || lang.config?.language_code || '';
        const hardModeFlag = settings.hardMode ? ' *' : '';
        return `Wordle ${name} #${lang.todaysIdx} — ${attempts.value}/6${hardModeFlag}\n\n${emojiBoard.value}`;
    }

    // ---- Persistence ----

    /** Save current game state to localStorage. */
    function saveToLocalStorage(): void {
        if (!import.meta.client) return;
        try {
            const pageName = window.location.pathname.split('/').pop() || 'home';
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
            localStorage.setItem(pageName, JSON.stringify(data));
        } catch {
            // localStorage unavailable or quota exceeded
        }
    }

    /** Reset all game state to defaults. Called before loading a new language's game. */
    function resetGameState(): void {
        tiles.value = makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, '');
        tileColors.value = makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, 'empty');
        tileClasses.value = makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, DEFAULT_TILE_CLASS);
        tilesVisual.value = makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, '');
        tileClassesVisual.value = makeEmptyGrid(MAX_GUESSES, WORD_LENGTH, DEFAULT_TILE_CLASS);
        activeRow.value = 0;
        activeCell.value = 0;
        fullWordInputted.value = false;
        gameOver.value = false;
        gameWon.value = false;
        attempts.value = '0';
        keyClasses.value = {};
        pendingKeyUpdates.value = [];
        emojiBoard.value = '';
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
            const pageName = window.location.pathname.split('/').pop() || 'home';
            const stored = localStorage.getItem(pageName);
            if (!stored) return;

            const data = JSON.parse(stored) as SavedGameState | null;
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
                            if (cls.includes('pop') || cls.includes('border-neutral-500'))
                                return 'active';
                            return 'empty';
                        })
                    );
                }

                // Load definition/image if game was already completed
                if (data.game_over) {
                    loadDefinitionAndImage(lang.todaysWord, lang.languageCode, lang.todaysIdx);
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
        try {
            const tutorialKey = `tutorial_shown_${langCode}`;
            if (localStorage.getItem(tutorialKey)) return;

            const pageName = window.location.pathname.split('/').pop() || 'home';
            const hasGameState = localStorage.getItem(pageName);
            if (hasGameState) return;

            showHelpModal.value = true;
            localStorage.setItem(tutorialKey, 'true');
        } catch {
            // localStorage unavailable
        }
    }

    // ---- Community stats ----

    /** POST game result to the word stats API and update community percentile. */
    function submitWordStats(won: boolean, attemptsVal: number | string): void {
        if (!import.meta.client) return;
        const lang = useLanguageStore();
        const langCode = lang.languageCode;
        const dayIdx = lang.todaysIdx;
        if (!langCode || isNaN(dayIdx)) return;

        const clientId = getOrCreateId('client_id');

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
                    communityStatsLink.value = `/${langCode}/word/${dayIdx}`;
                })
                .catch(() => {});
        } catch {
            // Ignore errors
        }
    }

    // ---- Definition & Image for Stats Modal ----

    function loadDefinitionAndImage(word: string, langCode: string, dayIdx: number): void {
        // Always load — template controls visibility via settings.wordInfoEnabled
        todayDefinitionLoading.value = true;
        todayImageLoading.value = true;

        const { fetchDefinition } = useDefinitions();
        fetchDefinition(word, langCode)
            .then((def) => {
                if (def.definition || def.definitionNative) {
                    todayDefinition.value = {
                        word: def.word,
                        definition: def.definitionNative || def.definition,
                        partOfSpeech: def.partOfSpeech,
                        url: `/${langCode}/word/${dayIdx}`,
                    };
                }
            })
            .finally(() => {
                todayDefinitionLoading.value = false;
            });

        // Load word image
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
    }

    // ---- Share ----

    /** Share results via Web Share API, clipboard, or fallback. */
    async function shareResults(): Promise<void> {
        if (!import.meta.client) return;

        const lang = useLanguageStore();
        const shareText = getShareText();
        const langCode = lang.languageCode;
        const url = `https://wordle.global/${langCode}?r=${gameWon.value ? attempts.value : 'x'}`;
        const fullText = `${shareText}\n\n${url}`;

        const shareParams = {
            language: langCode,
            won: gameWon.value,
            attempts: attempts.value,
        };

        const onSuccess = (method: 'native' | 'clipboard' | 'fallback') => {
            shareButtonState.value = 'success';
            analytics.trackShareSuccess({ ...shareParams, method });
            analytics.trackShareContentGenerated(
                langCode,
                gameWon.value,
                attempts.value,
                emojiBoard.value
            );
            setTimeout(() => {
                shareButtonState.value = 'idle';
            }, 2000);
        };

        // Try Web Share API first
        if (navigator.share) {
            analytics.trackShareClick({ ...shareParams, method: 'native' });
            try {
                await navigator.share({ text: fullText });
                showNotification(lang.config?.text?.shared || 'Shared!');
                onSuccess('native');
                return;
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;
                analytics.trackShareFail(langCode, 'native', 'share_api_failed');
            }
        }

        // Try Clipboard API
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            analytics.trackShareClick({ ...shareParams, method: 'clipboard' });
            try {
                await navigator.clipboard.writeText(fullText);
                showNotification(lang.config?.text?.copied || 'Copied to clipboard!');
                onSuccess('clipboard');
                return;
            } catch (error) {
                if (error instanceof Error) {
                    analytics.trackShareFail(langCode, 'clipboard', error.message);
                }
            }
        }

        // Legacy execCommand fallback
        analytics.trackShareClick({ ...shareParams, method: 'fallback' });
        if (copyViaExecCommand(fullText)) {
            showNotification(lang.config?.text?.copied || 'Copied to clipboard!');
            onSuccess('fallback');
            return;
        }

        // Final fallback: show modal
        analytics.trackShareFail(langCode, 'fallback', 'all_methods_failed');
        showCopyFallbackModal(fullText);
    }

    /** Copy text via legacy execCommand. Returns true on success. */
    function copyViaExecCommand(text: string): boolean {
        if (!import.meta.client) return false;
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            textarea.setSelectionRange(0, text.length);
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch {
            return false;
        }
    }

    /** Show a modal with the share text for manual copying. */
    function showCopyFallbackModal(text: string): void {
        if (!import.meta.client) return;
        const modal = document.createElement('div');
        modal.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
        modal.innerHTML = `
            <div style="background:white;border-radius:12px;padding:20px;margin:20px;max-width:320px;text-align:center;">
                <p style="font-weight:600;margin-bottom:12px;">Copy your results:</p>
                <textarea readonly style="width:100%;height:120px;padding:8px;border:1px solid #ccc;border-radius:6px;font-family:monospace;font-size:12px;resize:none;">${text.replace(/</g, '&lt;')}</textarea>
                <p style="font-size:12px;color:#666;margin:12px 0;">Select all and copy (Ctrl+C / Cmd+C)</p>
                <button style="background:#6aaa63;color:white;border:none;padding:10px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Done</button>
            </div>
        `;
        document.body.appendChild(modal);

        const textarea = modal.querySelector('textarea');
        if (textarea) {
            textarea.focus();
            textarea.select();
        }

        modal.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target === modal || target.tagName === 'BUTTON') {
                document.body.removeChild(modal);
            }
        });
    }

    // =======================================================================
    // Return public API
    // =======================================================================

    return {
        // State
        tiles,
        tileColors,
        tileClasses,
        tilesVisual,
        tileClassesVisual,
        activeRow,
        activeCell,
        fullWordInputted,
        gameOver,
        gameLost,
        gameWon,
        attempts,
        keyClasses,
        pendingKeyUpdates,
        animating,
        shakingRow,
        showHelpModal,
        showStatsModal,
        showOptionsModal,
        notification,
        emojiBoard,
        timeUntilNextDay,
        communityPercentile,
        communityIsTopScore,
        communityTotal,
        communityStatsLink,
        shareButtonState,
        srAnnouncement,
        todayDefinition,
        todayImageUrl,
        todayImageLoading,
        todayDefinitionLoading,
        allowAnyWord,
        maxDifficultyUsed,
        // hardMode is owned by settings store

        // Actions
        setBoardEl,
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
        revealRow,
        shakeRow,
        bounceRow,
        handleGameWon,
        handleGameLost,
        showNotification,
        getEmojiBoard,
        getShareText,
        resetGameState,
        saveToLocalStorage,
        loadFromLocalStorage,
        getTimeUntilNextDay,
        updateTimeUntilNextDay,
        checkHardMode,
        maybeShowTutorial,
        submitWordStats,
        shareResults,
    };
});
