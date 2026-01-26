/**
 * Wordle Game - Vue Application
 * Main game logic and state management
 */
import { createApp } from 'vue';
import pwa from './pwa';
import { haptic, setHapticsEnabled } from './haptics';
import { sound, setSoundEnabled } from './sounds';
import { buildNormalizeMap, buildNormalizedWordMap, normalizeWord } from './diacritics';
import { buildFinalFormReverseMap, toFinalForm, toRegularForm } from './positional';
import analytics from './analytics';
import type { PositionalConfig } from './positional';
import type {
    LanguageConfig,
    GameStats,
    GameResult,
    GameResults,
    Notification,
    KeyState,
} from './types';

// Total stats across all languages
interface TotalStats {
    total_games: number;
    game_stats: Record<string, GameStats>;
    languages_won: string[];
    total_win_percentage: number;
    longest_overall_streak: number;
    current_overall_streak: number;
    n_victories: number;
    n_losses: number;
}

// Language info for display
interface LanguageInfo {
    language_code: string;
    language_name: string;
    language_name_native: string;
}

// These come from the HTML template (injected by Jinja)
const word_list = window.word_list ?? [];
const word_list_supplement = window.word_list_supplement ?? [];
const characters = window.characters ?? [];
const config = window.config;
const todays_idx = window.todays_idx ?? '0';
const todays_word = window.todays_word ?? '';
const timezone_offset = window.timezone_offset ?? 0; // Hours offset from UTC

// Type for saved game state in localStorage
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

// Diacritic normalization maps (built once on init)
const normalizeMap = buildNormalizeMap(config || {});
const normalizedWordMap = buildNormalizedWordMap(word_list, normalizeMap);
const normalizedSupplementMap = buildNormalizedWordMap(word_list_supplement, normalizeMap);

// Positional character normalization (for Hebrew sofit, Greek final sigma, etc.)
const positionalConfig: PositionalConfig = config || {};
const finalFormReverseMap = buildFinalFormReverseMap(positionalConfig);

// Vue component data type
interface GameData {
    active_row: number;
    active_cell: number;
    full_word_inputted: boolean;
    game_over: boolean;
    game_lost: boolean;
    game_won: boolean;
    todays_word: string;
    todays_idx: string;
    word_list: string[];
    word_list_supplement: string[];
    characters: string[];
    config: LanguageConfig | undefined;
    right_to_left: boolean;
    allow_any_word: boolean;
    showHelpModal: boolean;
    show_stats_modal: boolean;
    show_options_modal: boolean;
    show_not_valid_notif: boolean;
    darkMode: boolean;
    hapticsEnabled: boolean;
    soundEnabled: boolean;
    notification: Notification;
    tiles: string[][];
    tile_classes: string[][];
    tiles_visual: string[][];
    tile_classes_visual: string[][];
    key_classes: Record<string, KeyState>;
    time_until_next_day: string;
    emoji_board: string;
    attempts: string;
    stats: GameStats;
    game_results: GameResults;
    statsTab: 'language' | 'global';
    total_stats: TotalStats;
    languages: Record<string, LanguageInfo>;
    shareButtonState: 'idle' | 'success';
}

export const createGameApp = () => {
    return createApp({
        delimiters: ['[[', ']]'], // Don't clash with Jinja
        data(): GameData {
            return {
                active_row: 0,
                active_cell: 0,
                full_word_inputted: false,
                game_over: false,
                game_lost: false,
                game_won: false,

                // Variables from Jinja
                todays_word,
                todays_idx,
                word_list,
                word_list_supplement,
                characters,
                config,
                right_to_left: config?.right_to_left === 'true',
                allow_any_word: false,

                showHelpModal: false,
                show_stats_modal: false,
                show_options_modal: false,
                show_not_valid_notif: false,
                darkMode: document.documentElement.classList.contains('dark'),
                hapticsEnabled: true,
                soundEnabled: true,
                shareButtonState: 'idle' as const,

                notification: {
                    show: false,
                    message: '',
                    top: 0,
                    timeout: 0,
                },

                tiles: [
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                ],
                tile_classes: [
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                ],
                tiles_visual: [
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                ],
                tile_classes_visual: [
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                    [
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                        'border-2 border-neutral-300',
                    ],
                ],
                key_classes: (() => {
                    const keys: Record<string, KeyState> = {};
                    for (const char of characters) {
                        keys[char] = '';
                    }
                    keys['⟹'] = '';
                    keys['ENTER'] = '';
                    keys['DEL'] = '';
                    keys['⌫'] = '';
                    return keys;
                })(),

                time_until_next_day: '',
                emoji_board: '⬜⬜⬜⬜⬜\n',
                attempts: '0',
                stats: {
                    n_wins: 0,
                    n_losses: 0,
                    n_games: 0,
                    n_attempts: 0,
                    avg_attempts: 0,
                    win_percentage: 0,
                    longest_streak: 0,
                    current_streak: 0,
                    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
                },
                game_results: {},
                statsTab: 'language',
                total_stats: {
                    total_games: 0,
                    game_stats: {},
                    languages_won: [],
                    total_win_percentage: 0,
                    longest_overall_streak: 0,
                    current_overall_streak: 0,
                    n_victories: 0,
                    n_losses: 0,
                },
                languages: {},
            };
        },

        computed: {
            acceptable_characters(): string {
                return characters.join('');
            },
        },

        beforeCreate() {
            // Redirect HTTP to HTTPS
            const { hostname, protocol, pathname } = window.location;
            if (hostname !== 'localhost' && hostname !== '127.0.0.1' && protocol !== 'https:') {
                window.location.href = `https://${hostname}${pathname}`;
            }
        },

        created() {
            window.addEventListener('keydown', (e) => this.keyDown(e));
            this.loadGameResults();
            this.loadLanguages();
            this.loadHapticsPreference();
            this.loadSoundPreference();
            this.stats = this.calculateStats(this.config?.language_code);
            this.total_stats = this.calculateTotalStats();
            this.time_until_next_day = this.getTimeUntilNextDay();

            // Initialize analytics
            const langCode = this.config?.language_code || 'unknown';
            analytics.initErrorTracking(langCode);
            analytics.trackPageView(langCode);
            analytics.trackPWASession(langCode);

            // Track game start with returning player context
            const isReturning = this.stats.n_games > 0;
            analytics.trackGameStart({
                language: langCode,
                is_returning: isReturning,
                current_streak: this.stats.current_streak,
            });

            // Set up abandon tracking
            analytics.initAbandonTracking(() => ({
                language: langCode,
                activeRow: this.active_row,
                gameOver: this.game_over,
                lastGuessValid: true, // We don't track invalid state, assume valid
            }));
        },

        mounted() {
            setInterval(() => {
                this.time_until_next_day = this.getTimeUntilNextDay();
            }, 1000);
            this.loadFromLocalStorage();
            this.showTiles();

            if (this.game_over) {
                this.show_stats_modal = true;
            }
        },

        beforeUpdate() {
            if (this.show_stats_modal) {
                this.emoji_board = this.getEmojiBoard();
            }
        },

        methods: {
            getTimeUntilNextDay(): string {
                // Calculate time until midnight in the language's timezone
                const now = new Date();

                // Get current UTC time and apply the language's timezone offset
                const utcHours = now.getUTCHours();
                const utcMinutes = now.getUTCMinutes();
                const utcSeconds = now.getUTCSeconds();

                // Calculate hours in the language's local timezone
                let localHours = utcHours + timezone_offset;
                // Handle day wraparound
                if (localHours >= 24) localHours -= 24;
                if (localHours < 0) localHours += 24;

                // Time until midnight in the language's timezone
                const h = 23 - localHours;
                const m = 59 - utcMinutes;
                const s = 59 - utcSeconds;

                return `${h}h ${m}m ${s}s`;
            },

            loadGameResults(): void {
                const langCode = this.config?.language_code || 'unknown';
                try {
                    const stored = localStorage.getItem('game_results');
                    if (stored) {
                        this.game_results = JSON.parse(stored) as GameResults;
                        if (!this.game_results[langCode]) {
                            this.game_results[langCode] = [];
                        }
                    } else {
                        this.game_results = { [langCode]: [] };
                        localStorage.setItem('game_results', JSON.stringify(this.game_results));
                    }
                } catch {
                    // localStorage unavailable (private browsing, quota exceeded, etc.)
                    this.game_results = { [langCode]: [] };
                }
            },

            addChar(char: string): void {
                const row = this.tiles[this.active_row];
                const rowClasses = this.tile_classes[this.active_row];
                if (row && rowClasses) {
                    // Check if we're typing at the last position (index 4, which is position 5)
                    const isLastPosition = this.active_cell === 4;

                    // Auto-convert to final form if at last position (Hebrew sofit, Greek final sigma)
                    const displayChar = toFinalForm(char, isLastPosition, positionalConfig);

                    // Use splice for Vue 3 reactivity on nested arrays
                    row.splice(this.active_cell, 1, displayChar);
                    rowClasses.splice(
                        this.active_cell,
                        1,
                        'text-2xl tiny:text-4xl uppercase font-bold select-none border-2 border-neutral-500 pop'
                    );
                }
                this.active_cell = Math.min(this.active_cell + 1, 5);
                if (this.active_cell === 5) {
                    this.full_word_inputted = true;
                }
            },

            /**
             * Check if a word is valid and return its canonical form (with diacritics).
             * Returns the canonical word if valid, null if not in word list.
             */
            checkWord(word: string): string | null {
                if (this.allow_any_word) return word;

                // Try exact match first
                if (word_list.includes(word)) return word;
                if (word_list_supplement.includes(word)) return word;

                // Try normalized match (e.g., "borde" matches "börde")
                const normalized = normalizeWord(word, normalizeMap);
                const canonical = normalizedWordMap.get(normalized);
                if (canonical) return canonical;

                // Check supplement with normalization
                const supplementCanonical = normalizedSupplementMap.get(normalized);
                if (supplementCanonical) return supplementCanonical;

                return null;
            },

            updateColors(): void {
                const targetWord = this.todays_word;
                const baseClass =
                    'text-2xl tiny:text-4xl uppercase font-bold select-none text-white';

                // Helper to fully normalize a character (diacritics + positional variants)
                const fullNormalize = (char: string): string => {
                    // First normalize positional variants (כ/ך -> כ, σ/ς -> σ)
                    const positionalNorm = toRegularForm(char, finalFormReverseMap);
                    // Then normalize diacritics (ä -> a)
                    return normalizeMap.get(positionalNorm) || positionalNorm;
                };

                // Helper to check if two chars match (considering both normalizations)
                const fullCharsMatch = (c1: string, c2: string): boolean => {
                    return fullNormalize(c1) === fullNormalize(c2);
                };

                // Count characters in target word using FULLY NORMALIZED forms
                // This ensures "ä" and "a" are counted together, and "כ" and "ך" are counted together
                const charCounts: Record<string, number> = {};
                for (const char of targetWord) {
                    const normalizedChar = fullNormalize(char);
                    charCounts[normalizedChar] = (charCounts[normalizedChar] || 0) + 1;
                }

                const row = this.tiles[this.active_row];
                const classes = this.tile_classes[this.active_row];
                if (!row || !classes) return;

                const keyClasses = this.key_classes as Record<string, KeyState>;

                // First pass: mark correct positions (using normalized comparison)
                for (let i = 0; i < row.length; i++) {
                    const guessChar = row[i];
                    const targetChar = targetWord[i];
                    if (guessChar && targetChar && fullCharsMatch(guessChar, targetChar)) {
                        // Use splice for Vue 3 reactivity
                        classes.splice(i, 1, `correct ${baseClass}`);
                        // Update tile to show target's character (e.g., user typed "ä" but target has "a")
                        row.splice(i, 1, targetChar);
                        this.updateKeyColor(guessChar, 'key-correct', keyClasses);
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

                    // Check if this normalized character exists in target (also normalized)
                    const targetHasChar = [...targetWord].some((tc) =>
                        fullCharsMatch(guessChar, tc)
                    );

                    if (targetHasChar && count !== undefined && count > 0) {
                        // Use splice for Vue 3 reactivity
                        classes.splice(i, 1, `semicorrect ${baseClass}`);
                        this.updateKeyColor(guessChar, 'key-semicorrect', keyClasses);
                        charCounts[normalizedGuess] = count - 1;
                    } else {
                        // Use splice for Vue 3 reactivity
                        classes.splice(i, 1, `incorrect ${baseClass}`);
                        this.updateKeyColor(guessChar, 'key-incorrect', keyClasses);
                    }
                }
            },

            /**
             * Update keyboard key color, respecting color priority (correct > semicorrect > incorrect).
             * Also updates equivalent diacritical characters when normalization is active.
             */
            updateKeyColor(
                char: string,
                newState: KeyState,
                keyClasses: Record<string, KeyState>
            ): void {
                const updateSingleKey = (key: string, state: KeyState) => {
                    const current = keyClasses[key];
                    // Priority: key-correct > key-semicorrect > key-incorrect
                    if (current === 'key-correct') return;
                    if (current === 'key-semicorrect' && state === 'key-incorrect') return;
                    keyClasses[key] = state;
                };

                // Update the typed character
                updateSingleKey(char, newState);

                // Also update equivalent diacritical characters
                const normalizedChar = normalizeMap.get(char) || char;

                // Find all chars that normalize to the same base and update them too
                for (const [diacritic, base] of normalizeMap.entries()) {
                    if (base === normalizedChar) {
                        updateSingleKey(diacritic, newState);
                    }
                }

                // Also update the base char if we typed a diacritic
                if (normalizeMap.has(char)) {
                    updateSingleKey(normalizedChar, newState);
                }
            },

            keyClick(key: string): void {
                haptic(); // Tactile feedback for virtual keyboard
                this.keyDown({ key } as KeyboardEvent);
            },

            keyDown(event: KeyboardEvent | { key: string }): void {
                const key = event.key;

                if (key === 'Escape') {
                    this.showHelpModal = false;
                    this.show_stats_modal = false;
                    this.show_options_modal = false;
                    return;
                }

                if (this.game_over) return;

                if (['Enter', '⇨', '⟹', 'ENTER'].includes(key)) {
                    if (!this.full_word_inputted) {
                        this.showNotification('Please enter a full word');
                        return;
                    }

                    const row = this.tiles[this.active_row];
                    const typedWord = row ? row.join('').toLowerCase() : '';
                    const canonicalWord = this.checkWord(typedWord);

                    if (canonicalWord) {
                        haptic.confirm(); // Valid word submitted

                        // Track valid guess
                        analytics.trackGuessSubmit(
                            this.config?.language_code || 'unknown',
                            this.active_row + 1,
                            true
                        );

                        // Update tiles to show canonical form (with diacritics)
                        // This displays the correct accented letters after submission
                        if (row && canonicalWord !== typedWord) {
                            for (let i = 0; i < canonicalWord.length; i++) {
                                row.splice(i, 1, canonicalWord[i]);
                            }
                        }

                        this.updateColors();
                        this.active_row++;
                        this.active_cell = 0;
                        this.full_word_inputted = false;

                        // Compare normalized forms for win detection
                        const normalizedGuess = normalizeWord(canonicalWord, normalizeMap);
                        const normalizedTarget = normalizeWord(this.todays_word, normalizeMap);
                        if (normalizedGuess === normalizedTarget) {
                            this.gameWon();
                        } else if (this.active_row === 6) {
                            this.gameLost();
                        }
                    } else {
                        haptic.error(); // Invalid word
                        this.showNotification('Word is not valid');

                        // Track invalid word attempt with frustration detection
                        analytics.trackInvalidWordWithFrustration({
                            language: this.config?.language_code || 'unknown',
                            attempt_number: this.active_row + 1,
                        });
                        analytics.trackGuessSubmit(
                            this.config?.language_code || 'unknown',
                            this.active_row + 1,
                            false
                        );
                    }
                } else if (['Backspace', 'Delete', '⌫'].includes(key) && this.active_cell > 0) {
                    this.active_cell--;
                    const row = this.tiles[this.active_row];
                    const rowClasses = this.tile_classes[this.active_row];
                    if (row && rowClasses) {
                        // Use splice for Vue 3 reactivity on nested arrays
                        row.splice(this.active_cell, 1, '');
                        rowClasses.splice(this.active_cell, 1, 'border-2 border-neutral-300');
                    }
                    this.full_word_inputted = false;
                } else if (!this.full_word_inputted && this.acceptable_characters.includes(key)) {
                    this.addChar(key);
                }

                this.showTiles();
                this.saveToLocalStorage();
            },

            showTiles(): void {
                for (let i = 0; i < this.tiles.length; i++) {
                    const tilesRow = this.tiles[i];
                    const classesRow = this.tile_classes[i];
                    if (!tilesRow || !classesRow) continue;

                    if (this.right_to_left) {
                        // Use splice for Vue 3 reactivity
                        this.tiles_visual.splice(i, 1, [...tilesRow].reverse());
                        this.tile_classes_visual.splice(i, 1, [...classesRow].reverse());
                    } else {
                        // Use splice for Vue 3 reactivity
                        this.tiles_visual.splice(i, 1, [...tilesRow]);
                        this.tile_classes_visual.splice(i, 1, [...classesRow]);
                    }
                }
            },

            gameWon(): void {
                this.game_over = true;
                this.game_won = true;
                this.emoji_board = this.getEmojiBoard();
                this.showNotification(this.todays_word.toUpperCase(), 12);
                haptic.success(); // Celebration!
                sound.win();

                setTimeout(() => {
                    this.show_stats_modal = true;
                }, 400);

                this.saveResult(true);
                this.stats = this.calculateStats(this.config?.language_code);
                this.total_stats = this.calculateTotalStats();

                // Track game completion
                const langCode = this.config?.language_code || 'unknown';
                analytics.trackGameComplete({
                    language: langCode,
                    won: true,
                    attempts: this.active_row,
                    streak_after: this.stats.current_streak,
                });
                analytics.trackStreakMilestone(langCode, this.stats.current_streak);

                // Show PWA install prompt after game completion
                setTimeout(() => pwa.showBanner(), 2000);
            },

            gameLost(): void {
                this.showNotification(this.todays_word.toUpperCase(), 12);
                haptic(); // Subtle acknowledgment
                sound.lose();
                this.game_over = true;
                this.game_won = false;
                this.attempts = 'X';

                setTimeout(() => {
                    this.show_stats_modal = true;
                }, 400);

                this.saveResult(false);
                this.stats = this.calculateStats(this.config?.language_code);
                this.total_stats = this.calculateTotalStats();

                // Track game completion (loss)
                analytics.trackGameComplete({
                    language: this.config?.language_code || 'unknown',
                    won: false,
                    attempts: 'X',
                    streak_after: 0,
                });
            },

            saveResult(won: boolean): void {
                const langCode = this.config?.language_code;
                if (!langCode) return;

                const result: GameResult = { won, attempts: this.attempts, date: new Date() };
                const langResults = this.game_results[langCode];
                if (langResults) {
                    langResults.push(result);
                }
                try {
                    localStorage.setItem('game_results', JSON.stringify(this.game_results));
                } catch {
                    // localStorage unavailable or quota exceeded
                }
            },

            showNotification(message: string, duration = 3): void {
                if (this.notification.show) {
                    clearTimeout(this.notification.timeout);
                }

                this.notification.show = true;
                this.notification.message = message;
                this.notification.top = 0;

                this.notification.timeout = window.setTimeout(() => {
                    this.notification.show = false;
                }, duration * 1000);

                // Animate notification down
                const interval = window.setInterval(() => {
                    this.notification.top += 1;
                    if (this.notification.top > 50) clearInterval(interval);
                }, 2);
            },

            getEmojiBoard(): string {
                let board = '';
                for (let i = 0; i < this.tile_classes.length; i++) {
                    const row = this.tile_classes[i];
                    if (!row) continue;

                    for (const tileClass of row) {
                        if (
                            tileClass.includes('correct') &&
                            !tileClass.includes('semicorrect') &&
                            !tileClass.includes('incorrect')
                        ) {
                            board += '🟩';
                        } else if (tileClass.includes('semicorrect')) {
                            board += '🟨';
                        } else if (tileClass.includes('incorrect')) {
                            board += '⬜';
                        } else {
                            this.attempts = String(i);
                            return board;
                        }
                    }
                    if (i < this.tile_classes.length - 1) board += '\n';
                    this.attempts = String(i + 1);
                }
                if (this.game_over && !this.game_won) this.attempts = 'X';
                return board;
            },

            saveToLocalStorage(): void {
                try {
                    const pageName = window.location.pathname.split('/').pop() || 'home';
                    const data: SavedGameState = {
                        tiles: this.tiles,
                        tile_classes: this.tile_classes,
                        key_classes: this.key_classes as Record<string, KeyState>,
                        active_row: this.active_row,
                        active_cell: this.active_cell,
                        todays_word: this.todays_word,
                        game_over: this.game_over,
                        game_won: this.game_won,
                        emoji_board: this.emoji_board,
                        attempts: this.attempts,
                        full_word_inputted: this.full_word_inputted,
                    };
                    localStorage.setItem(pageName, JSON.stringify(data));
                } catch {
                    // localStorage unavailable or quota exceeded
                }
            },

            loadFromLocalStorage(): void {
                try {
                    const pageName = window.location.pathname.split('/').pop() || 'home';
                    const stored = localStorage.getItem(pageName);
                    if (!stored) return;

                    const data = JSON.parse(stored) as SavedGameState | null;
                    if (data?.todays_word === this.todays_word) {
                        Object.assign(this, data);
                    }
                } catch {
                    // localStorage unavailable or corrupted data
                }
            },

            calculateStats(languageCode: string | undefined): GameStats {
                const emptyDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } as const;

                if (!languageCode) {
                    return {
                        n_wins: 0,
                        n_losses: 0,
                        n_games: 0,
                        n_attempts: 0,
                        avg_attempts: 0,
                        win_percentage: 0,
                        longest_streak: 0,
                        current_streak: 0,
                        guessDistribution: { ...emptyDistribution },
                    };
                }

                const results = this.game_results[languageCode];
                if (!results?.length) {
                    return {
                        n_wins: 0,
                        n_losses: 0,
                        n_games: 0,
                        n_attempts: 0,
                        avg_attempts: 0,
                        win_percentage: 0,
                        longest_streak: 0,
                        current_streak: 0,
                        guessDistribution: { ...emptyDistribution },
                    };
                }

                let n_wins = 0,
                    n_losses = 0,
                    n_attempts = 0;
                let current_streak = 0,
                    longest_streak = 0;
                const guessDistribution = { ...emptyDistribution };

                for (const result of results) {
                    const attempts =
                        typeof result.attempts === 'string'
                            ? parseInt(result.attempts, 10) || 0
                            : result.attempts;

                    if (result.won) {
                        n_wins++;
                        current_streak++;
                        longest_streak = Math.max(longest_streak, current_streak);
                        // Track which guess they won on (1-6)
                        if (attempts >= 1 && attempts <= 6) {
                            guessDistribution[attempts as 1 | 2 | 3 | 4 | 5 | 6]++;
                        }
                    } else {
                        n_losses++;
                        current_streak = 0;
                    }
                    n_attempts += attempts;
                }

                const total = n_wins + n_losses;
                return {
                    n_wins,
                    n_losses,
                    n_games: results.length,
                    n_attempts,
                    avg_attempts: n_attempts / results.length,
                    win_percentage: total > 0 ? Math.round((n_wins / total) * 100) : 0,
                    longest_streak,
                    current_streak,
                    guessDistribution,
                };
            },

            loadLanguages(): void {
                // Load languages from localStorage (saved by homepage) or use empty object
                try {
                    const stored = localStorage.getItem('languages_cache');
                    if (stored) {
                        this.languages = JSON.parse(stored);
                    }
                } catch {
                    // Ignore errors
                }

                // Also save current language to cache
                if (this.config) {
                    this.languages[this.config.language_code] = {
                        language_code: this.config.language_code,
                        language_name: this.config.name,
                        language_name_native: this.config.name_native,
                    };
                    try {
                        localStorage.setItem('languages_cache', JSON.stringify(this.languages));
                    } catch {
                        // Ignore storage errors
                    }
                }
            },

            calculateTotalStats(): TotalStats {
                let n_victories = 0;
                let n_losses = 0;
                let current_overall_streak = 0;
                let longest_overall_streak = 0;
                const languages_won: string[] = [];
                const game_stats: Record<string, GameStats> = {};

                // Collect and sort all results by date
                const all_results: (GameResult & { language?: string })[] = [];
                for (const [language_code, results] of Object.entries(this.game_results) as [
                    string,
                    GameResult[],
                ][]) {
                    for (const result of results) {
                        all_results.push({ ...result, language: language_code });
                    }
                }
                all_results.sort(
                    (a, b) =>
                        new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
                );

                // Calculate overall streaks
                for (const result of all_results) {
                    if (result.won) {
                        n_victories++;
                        current_overall_streak++;
                        longest_overall_streak = Math.max(
                            longest_overall_streak,
                            current_overall_streak
                        );
                    } else {
                        n_losses++;
                        current_overall_streak = 0;
                    }
                }

                // Calculate per-language stats
                for (const language_code of Object.keys(this.game_results)) {
                    const stats = this.calculateStats(language_code);
                    game_stats[language_code] = stats;

                    if (stats.n_wins > 0) {
                        languages_won.push(language_code);
                    }
                }

                const total_games = n_victories + n_losses;
                return {
                    total_games,
                    game_stats,
                    languages_won,
                    total_win_percentage: total_games > 0 ? (n_victories / total_games) * 100 : 0,
                    longest_overall_streak,
                    current_overall_streak,
                    n_victories,
                    n_losses,
                };
            },

            getLanguageName(code: string): string {
                return (
                    this.languages[code]?.language_name_native ||
                    this.languages[code]?.language_name ||
                    code
                );
            },

            async shareResults(): Promise<void> {
                const text = this.getShareText();
                const langCode = this.config?.language_code ?? '';
                const url = `https://wordle.global/${langCode}`;

                const shareParams = {
                    language: langCode,
                    won: this.game_won,
                    attempts: this.attempts,
                };

                const onSuccess = (method: 'native' | 'clipboard' | 'fallback') => {
                    this.shareButtonState = 'success';
                    analytics.trackShareSuccess({ ...shareParams, method });
                    setTimeout(() => {
                        this.shareButtonState = 'idle';
                    }, 2000);
                };

                // Try Web Share API first
                if (navigator.share) {
                    analytics.trackShareClick({ ...shareParams, method: 'native' });
                    try {
                        await navigator.share({ text, url });
                        this.showNotification(this.config?.text?.shared || 'Shared!');
                        onSuccess('native');
                        return;
                    } catch (error) {
                        if (error instanceof Error && error.name === 'AbortError') return;
                        // Try text only
                        try {
                            await navigator.share({ text: `${text}\n${url}` });
                            this.showNotification(this.config?.text?.shared || 'Shared!');
                            onSuccess('native');
                            return;
                        } catch (e) {
                            if (e instanceof Error && e.name === 'AbortError') return;
                            analytics.trackShareFail(langCode, 'native', 'share_api_failed');
                        }
                    }
                }

                // Try Clipboard API
                if (navigator.clipboard?.writeText && window.isSecureContext) {
                    analytics.trackShareClick({ ...shareParams, method: 'clipboard' });
                    try {
                        await navigator.clipboard.writeText(text);
                        this.showNotification(this.config?.text?.copied || 'Copied to clipboard!');
                        onSuccess('clipboard');
                        return;
                    } catch (error) {
                        if (error instanceof Error) {
                            console.log('Clipboard API failed:', error.message);
                            analytics.trackShareFail(langCode, 'clipboard', error.message);
                        }
                    }
                }

                // Legacy execCommand fallback
                analytics.trackShareClick({ ...shareParams, method: 'fallback' });
                if (this.copyViaExecCommand(text)) {
                    this.showNotification(this.config?.text?.copied || 'Copied to clipboard!');
                    onSuccess('fallback');
                    return;
                }

                // Final fallback: show modal
                analytics.trackShareFail(langCode, 'fallback', 'all_methods_failed');
                this.showCopyFallbackModal(text);
            },

            copyViaExecCommand(text: string): boolean {
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
            },

            showCopyFallbackModal(text: string): void {
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
            },

            getShareText(): string {
                const name = this.config?.name_native || this.config?.language_code || '';
                const langCode = this.config?.language_code ?? '';
                return `Wordle ${name} #${this.todays_idx} ${this.attempts}/6\nwordle.global/${langCode}\n\n${this.emoji_board}`;
            },

            toggleDarkMode(): void {
                // Use nextTick to ensure v-model has updated darkMode first
                this.$nextTick(() => {
                    if (this.darkMode) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                    try {
                        localStorage.setItem('darkMode', this.darkMode ? 'true' : 'false');
                    } catch {
                        // localStorage unavailable
                    }
                    analytics.trackSettingsChange({ setting: 'dark_mode', value: this.darkMode });
                });
            },

            loadHapticsPreference(): void {
                try {
                    const stored = localStorage.getItem('hapticsEnabled');
                    if (stored !== null) {
                        this.hapticsEnabled = stored === 'true';
                    } else {
                        // Default to enabled
                        this.hapticsEnabled = true;
                    }
                    setHapticsEnabled(this.hapticsEnabled);
                } catch {
                    // localStorage unavailable
                }
            },

            toggleHaptics(): void {
                this.$nextTick(() => {
                    setHapticsEnabled(this.hapticsEnabled);
                    if (this.hapticsEnabled) {
                        haptic(); // Give feedback that haptics are now on
                    }
                    try {
                        localStorage.setItem(
                            'hapticsEnabled',
                            this.hapticsEnabled ? 'true' : 'false'
                        );
                    } catch {
                        // localStorage unavailable
                    }
                    analytics.trackSettingsChange({ setting: 'haptics', value: this.hapticsEnabled });
                });
            },

            loadSoundPreference(): void {
                try {
                    const stored = localStorage.getItem('soundEnabled');
                    if (stored !== null) {
                        this.soundEnabled = stored === 'true';
                    } else {
                        // Default to enabled
                        this.soundEnabled = true;
                    }
                    setSoundEnabled(this.soundEnabled);
                } catch {
                    // localStorage unavailable
                }
            },

            toggleSound(): void {
                this.$nextTick(() => {
                    setSoundEnabled(this.soundEnabled);
                    try {
                        localStorage.setItem('soundEnabled', this.soundEnabled ? 'true' : 'false');
                    } catch {
                        // localStorage unavailable
                    }
                    analytics.trackSettingsChange({ setting: 'sound', value: this.soundEnabled });
                });
            },

            canInstallPwa(): boolean {
                return !pwa.isStandalone();
            },

            installPwa(): void {
                pwa.install();
            },

            isCurrentGuess(n: number): boolean {
                // Check if guess n matches the current attempt count
                return this.game_won && this.attempts === String(n);
            },

            getDistributionBarWidth(n: number): number {
                // Return the width percentage for distribution bar
                const distribution = this.stats.guessDistribution;
                const count = distribution[n as 1 | 2 | 3 | 4 | 5 | 6] ?? 0;
                const values = Object.values(distribution) as number[];
                const maxCount = Math.max(...values, 1);
                // Minimum 8% width when count > 0 so the number is visible
                return count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;
            },
        },
    });
};

export default createGameApp;
