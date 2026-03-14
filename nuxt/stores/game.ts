/**
 * Game Store — Core Wordle game logic
 *
 * This is the main Pinia store that manages game state and logic.
 * It replaces the monolithic Vue Options API component from the
 * Flask-era game.ts with a Composition API store.
 *
 * SSR-safe: all localStorage, document, and window access is guarded
 * behind `import.meta.client`.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useLanguageStore } from '~/stores/language';
import { useSettingsStore } from '~/stores/settings';
import { useStatsStore } from '~/stores/stats';
import { buildNormalizedWordMap, normalizeWord } from '~/utils/diacritics';
import { toFinalForm, toRegularForm } from '~/utils/positional';
import { splitWord } from '~/utils/graphemes';
import { calculateCommunityPercentile } from '~/utils/stats';
import type { KeyState, Notification } from '~/utils/types';

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
    // State
    // =======================================================================

    const tiles = ref<string[][]>(makeEmptyGrid(6, 5, ''));
    const tileClasses = ref<string[][]>(makeEmptyGrid(6, 5, DEFAULT_TILE_CLASS));
    const tilesVisual = ref<string[][]>(makeEmptyGrid(6, 5, ''));
    const tileClassesVisual = ref<string[][]>(makeEmptyGrid(6, 5, DEFAULT_TILE_CLASS));

    const activeRow = ref(0);
    const activeCell = ref(0);
    const fullWordInputted = ref(false);

    const gameOver = ref(false);
    const gameLost = ref(false);
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

    const hardMode = ref(false);

    // =======================================================================
    // Internal (non-exposed) state
    // =======================================================================

    /** Cached normalized word maps — built lazily on first use. */
    let _normalizedWordMap: Map<string, string> | null = null;
    let _normalizedSupplementMap: Map<string, string> | null = null;

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

    /** Get or build the normalized word map for the supplement word list. */
    function getNormalizedSupplementMap(): Map<string, string> {
        if (_normalizedSupplementMap) return _normalizedSupplementMap;
        const lang = useLanguageStore();
        _normalizedSupplementMap = buildNormalizedWordMap(
            lang.wordListSupplement,
            lang.normalizeMap,
        );
        return _normalizedSupplementMap;
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
        _normalizedSupplementMap = null;
    }

    // ---- Character input ----

    /** Add a character to the current active cell. */
    function addChar(char: string): void {
        const lang = useLanguageStore();
        const row = tiles.value[activeRow.value];
        const rowClasses = tileClasses.value[activeRow.value];
        if (row && rowClasses) {
            const isLastPosition = activeCell.value === 4;
            const displayChar = toFinalForm(char, isLastPosition, lang.config ?? {});
            row.splice(activeCell.value, 1, displayChar);
            rowClasses.splice(activeCell.value, 1, ACTIVE_TILE_CLASS);
        }
        activeCell.value = Math.min(activeCell.value + 1, 5);
        if (activeCell.value === 5) {
            fullWordInputted.value = true;
        }
    }

    // ---- Word validation ----

    /**
     * Check if a word is valid and return its canonical form (with diacritics).
     * Returns the canonical word if valid, null if not in the word list.
     */
    function checkWord(word: string): string | null {
        const lang = useLanguageStore();

        // Try exact match first
        if (lang.wordList.includes(word)) return word;
        if (lang.wordListSupplement.includes(word)) return word;

        // Try normalized match (e.g., "borde" matches "börde")
        const normalized = normalizeWord(word, lang.normalizeMap);
        const canonical = getNormalizedWordMap().get(normalized);
        if (canonical) return canonical;

        // Check supplement with normalization
        const supplementCanonical = getNormalizedSupplementMap().get(normalized);
        if (supplementCanonical) return supplementCanonical;

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
        if (!row || !classes) return;

        // Store per-tile keyboard updates for staggered reveal
        pendingKeyUpdates.value = [];

        // First pass: mark correct positions
        for (let i = 0; i < row.length; i++) {
            const guessChar = row[i];
            const targetChar = targetChars[i];
            if (guessChar && targetChar && fullCharsMatch(guessChar, targetChar)) {
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
            if (!guessChar || classes[i]?.includes('correct')) continue;

            const normalizedGuess = fullNormalize(guessChar);
            const count = charCounts[normalizedGuess];

            const targetHasChar = targetChars.some((tc) => fullCharsMatch(guessChar, tc));

            if (targetHasChar && count !== undefined && count > 0) {
                classes.splice(i, 1, `semicorrect ${BASE_REVEALED_CLASS}`);
                pendingKeyUpdates.value[i] = {
                    char: guessChar,
                    state: 'key-semicorrect' as KeyState,
                };
                charCounts[normalizedGuess] = count - 1;
            } else {
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
        keys: Record<string, KeyState>,
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
        const key = event.key;

        if (key === 'Escape') {
            showHelpModal.value = false;
            showStatsModal.value = false;
            showOptionsModal.value = false;
            return;
        }

        if (gameOver.value) return;

        const lang = useLanguageStore();
        const settings = useSettingsStore();

        if (['Enter', '⇨', '⟹', 'ENTER'].includes(key)) {
            if (!fullWordInputted.value) {
                shakeRow(activeRow.value);
                showNotification('Please enter a full word');
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

                // TODO: analytics — trackFirstGuessDelay, trackGuessTime, trackGuessSubmit

                // Update tiles to show canonical form (with diacritics)
                if (row && canonicalWord !== typedWord) {
                    const canonicalChars = splitWord(canonicalWord, lang.graphemeMode);
                    for (let i = 0; i < canonicalChars.length; i++) {
                        row.splice(i, 1, canonicalChars[i]);
                    }
                }

                updateColors();
                const revealingRow = activeRow.value;
                activeRow.value++;
                activeCell.value = 0;
                fullWordInputted.value = false;
                animating.value = true;

                revealRow(revealingRow).then(() => {
                    animating.value = false;
                    showTiles();

                    // Compare normalized forms for win detection
                    const normalizedGuess = normalizeWord(canonicalWord, lang.normalizeMap);
                    const normalizedTarget = normalizeWord(lang.todaysWord, lang.normalizeMap);
                    if (normalizedGuess === normalizedTarget) {
                        handleGameWon();
                    } else if (activeRow.value === 6) {
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
                showNotification('Word is not valid');

                // TODO: analytics — trackInvalidWordAndUpdateState, trackGuessSubmit
            }
        } else if (['Backspace', 'Delete', '⌫'].includes(key) && activeCell.value > 0) {
            activeCell.value--;
            const row = tiles.value[activeRow.value];
            const rowClasses = tileClasses.value[activeRow.value];
            if (row && rowClasses) {
                row.splice(activeCell.value, 1, '');
                rowClasses.splice(activeCell.value, 1, DEFAULT_TILE_CLASS);
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

    /** Sync data layer to visual layer, handling RTL reversal. */
    function showTiles(): void {
        const lang = useLanguageStore();
        for (let i = 0; i < tiles.value.length; i++) {
            const tilesRow = tiles.value[i];
            const classesRow = tileClasses.value[i];
            if (!tilesRow || !classesRow) continue;

            if (lang.rightToLeft) {
                tilesVisual.value.splice(i, 1, [...tilesRow].reverse());
                tileClassesVisual.value.splice(i, 1, [...classesRow].reverse());
            } else {
                tilesVisual.value.splice(i, 1, [...tilesRow]);
                tileClassesVisual.value.splice(i, 1, [...classesRow]);
            }
        }
    }

    // ---- Animations ----

    /** Staggered flip animation for a completed row. Returns a Promise. */
    function revealRow(rowIndex: number): Promise<void> {
        if (!import.meta.client) {
            // During SSR, just sync tiles immediately
            showTiles();
            return Promise.resolve();
        }

        const FLIP_DURATION = 500;
        const MIDPOINT = 250;
        const STAGGER = 200;
        const tileCount = 5;
        const lang = useLanguageStore();
        const keys = keyClasses.value;

        const board = document.querySelector('.game-board');
        const rowEl = board?.children[rowIndex] as HTMLElement | undefined;

        return new Promise((resolve) => {
            for (let t = 0; t < tileCount; t++) {
                const visualIdx = lang.rightToLeft ? tileCount - 1 - t : t;
                const dataIdx = lang.rightToLeft ? tileCount - 1 - visualIdx : visualIdx;

                setTimeout(() => {
                    const tileEl = rowEl?.children[visualIdx] as HTMLElement | undefined;
                    if (tileEl) {
                        tileEl.style.animation = `flipReveal ${FLIP_DURATION}ms ease-in-out`;
                    }

                    // At midpoint: swap color via reactivity
                    setTimeout(() => {
                        const finalClass = tileClasses.value[rowIndex]?.[dataIdx] || '';
                        tileClassesVisual.value[rowIndex]?.splice(visualIdx, 1, finalClass);
                        const tileChar = tiles.value[rowIndex]?.[dataIdx] || '';
                        tilesVisual.value[rowIndex]?.splice(visualIdx, 1, tileChar);

                        // Update keyboard color for this tile
                        const keyUpdate = pendingKeyUpdates.value[dataIdx];
                        if (keyUpdate) {
                            updateKeyColor(keyUpdate.char, keyUpdate.state, keys);
                        }
                    }, MIDPOINT);

                    // Clean up after animation
                    setTimeout(() => {
                        if (tileEl) tileEl.style.animation = '';
                        if (t === tileCount - 1) resolve();
                    }, FLIP_DURATION);
                }, t * STAGGER);
            }
        });
    }

    /** Animate a keyboard key with a CSS animation class. */
    function _nudgeKey(char: string, animClass: string): void {
        if (!import.meta.client) return;
        const el = document.querySelector(`button[data-char="${CSS.escape(char)}"]`);
        if (!el) return;
        el.classList.remove(animClass);
        void (el as HTMLElement).offsetWidth; // Force reflow
        el.classList.add(animClass);
        el.addEventListener('animationend', () => el.classList.remove(animClass), {
            once: true,
        });
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
        const tileCount = 5;
        const lang = useLanguageStore();

        for (let t = 0; t < tileCount; t++) {
            const visualIdx = lang.rightToLeft ? tileCount - 1 - t : t;
            setTimeout(() => {
                const currentClass = tileClassesVisual.value[rowIndex]?.[visualIdx] || '';
                tileClassesVisual.value[rowIndex]?.splice(
                    visualIdx,
                    1,
                    `${currentClass} tile-bounce`,
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

        // TODO: loadDefinition
        submitWordStats(true, activeRow.value);

        statsStore.saveResult(lang.languageCode, true, activeRow.value);
        statsStore.calculateStats(lang.languageCode);
        statsStore.calculateTotalStats();

        // TODO: analytics — trackGameComplete, trackStreakMilestone
        // TODO: embed.showBanner(), pwa.showBanner()
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
        gameLost.value = true;
        attempts.value = 'X';

        // TODO: loadDefinition
        submitWordStats(false, activeRow.value);

        statsStore.saveResult(lang.languageCode, false, activeRow.value);
        statsStore.calculateStats(lang.languageCode);
        statsStore.calculateTotalStats();

        // TODO: analytics — trackGameComplete
        // TODO: embed.showBanner()
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

    /** Generate the share emoji grid from tile classes. */
    function getEmojiBoard(): string {
        const settings = useSettingsStore();
        let board = '';
        const greenEmoji = settings.highContrast ? '🟦' : '🟩';
        const yellowEmoji = settings.highContrast ? '🟧' : '🟨';

        for (let i = 0; i < tileClasses.value.length; i++) {
            const row = tileClasses.value[i];
            if (!row) continue;

            for (const tileClass of row) {
                if (
                    tileClass.includes('correct') &&
                    !tileClass.includes('semicorrect') &&
                    !tileClass.includes('incorrect')
                ) {
                    board += greenEmoji;
                } else if (tileClass.includes('semicorrect')) {
                    board += yellowEmoji;
                } else if (tileClass.includes('incorrect')) {
                    board += '⬜';
                } else {
                    attempts.value = String(i);
                    return board;
                }
            }
            if (i < tileClasses.value.length - 1) board += '\n';
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

    /** Restore game state from localStorage. */
    function loadFromLocalStorage(): void {
        if (!import.meta.client) return;
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

                // Derive gameLost from saved state
                if (data.game_over && !data.game_won) {
                    gameLost.value = true;
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

    // ---- Hard mode ----

    /**
     * Validate a guess against hard mode rules.
     * Returns an error message if invalid, or null if valid.
     */
    function checkHardMode(guess: string): string | null {
        for (let r = 0; r < activeRow.value; r++) {
            const row = tiles.value[r];
            const classes = tileClasses.value[r];
            if (!row || !classes) continue;

            for (let c = 0; c < row.length; c++) {
                const tileClass = classes[c] || '';
                const letter = row[c];
                if (!letter) continue;

                if (
                    tileClass.includes('correct') &&
                    !tileClass.includes('semicorrect') &&
                    !tileClass.includes('incorrect')
                ) {
                    // Green: must be in the same position
                    if (guess[c]?.toLowerCase() !== letter.toLowerCase()) {
                        return `Hard mode: ${letter.toUpperCase()} must be in position ${c + 1}`;
                    }
                } else if (tileClass.includes('semicorrect')) {
                    // Yellow: must appear somewhere in the guess
                    if (!guess.toLowerCase().includes(letter.toLowerCase())) {
                        return `Hard mode: guess must contain ${letter.toUpperCase()}`;
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

        // Get or create client ID
        let clientId = 'unknown';
        try {
            clientId = localStorage.getItem('client_id') || '';
            if (!clientId) {
                clientId = crypto.randomUUID();
                localStorage.setItem('client_id', clientId);
            }
        } catch {
            // localStorage unavailable
        }

        try {
            fetch(`/${langCode}/api/word-stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_idx: dayIdx,
                    attempts: typeof attemptsVal === 'number' ? attemptsVal : 0,
                    won,
                    client_id: clientId,
                }),
            })
                .then((resp) => (resp.ok ? resp.json() : null))
                .then((stats) => {
                    if (!stats || !stats.total || !won) return;
                    const playerAttempts =
                        typeof attemptsVal === 'number' ? attemptsVal : 7;
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

    // ---- Share ----

    /** Share results via Web Share API, clipboard, or fallback. */
    async function shareResults(): Promise<void> {
        if (!import.meta.client) return;

        const lang = useLanguageStore();
        const shareText = getShareText();
        const langCode = lang.languageCode;
        const url = `https://wordle.global/${langCode}?r=${gameWon.value ? attempts.value : 'x'}`;
        const fullText = `${shareText}\n\n${url}`;

        const onSuccess = () => {
            shareButtonState.value = 'success';
            // TODO: analytics — trackShareSuccess, trackShareContentGenerated
            setTimeout(() => {
                shareButtonState.value = 'idle';
            }, 2000);
        };

        // Try Web Share API first
        if (navigator.share) {
            // TODO: analytics — trackShareClick
            try {
                await navigator.share({ text: fullText });
                showNotification(lang.config?.text?.shared || 'Shared!');
                onSuccess();
                return;
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;
                // TODO: analytics — trackShareFail
            }
        }

        // Try Clipboard API
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            // TODO: analytics — trackShareClick
            try {
                await navigator.clipboard.writeText(fullText);
                showNotification(lang.config?.text?.copied || 'Copied to clipboard!');
                onSuccess();
                return;
            } catch {
                // TODO: analytics — trackShareFail
            }
        }

        // Legacy execCommand fallback
        // TODO: analytics — trackShareClick
        if (copyViaExecCommand(fullText)) {
            showNotification(lang.config?.text?.copied || 'Copied to clipboard!');
            onSuccess();
            return;
        }

        // Final fallback: show modal
        // TODO: analytics — trackShareFail
        showCopyFallbackModal(fullText);
    }

    /** Copy text via legacy execCommand. Returns true on success. */
    function copyViaExecCommand(text: string): boolean {
        if (!import.meta.client) return false;
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText =
                'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;';
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

    /** Convenience alias used by templates. */
    function copyEmojiBoard(): void {
        shareResults();
    }

    /** Alias for the share button. */
    function share(): void {
        shareResults();
    }

    // =======================================================================
    // Return public API
    // =======================================================================

    return {
        // State
        tiles,
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
        hardMode,

        // Actions
        initKeyClasses,
        resetCaches,
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
        saveToLocalStorage,
        loadFromLocalStorage,
        getTimeUntilNextDay,
        checkHardMode,
        maybeShowTutorial,
        submitWordStats,
        shareResults,
        copyEmojiBoard,
        share,
    };
});
