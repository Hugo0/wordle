/**
 * Wordle Game - Vue Application
 * Main game logic and state management
 */
import { createApp } from 'vue';
import pwa from './pwa';
import type {
    LanguageConfig,
    GameStats,
    GameResult,
    GameResults,
    Notification,
    KeyState,
} from './types';

// These come from the HTML template (injected by Jinja)
const word_list = window.word_list ?? [];
const word_list_supplement = window.word_list_supplement ?? [];
const characters = window.characters ?? [];
const config = window.config;
const todays_idx = window.todays_idx ?? '0';
const todays_word = window.todays_word ?? '';

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
            this.stats = this.calculateStats(this.config?.language_code);
            this.time_until_next_day = this.getTimeUntilNextDay();
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
                const d = new Date();
                const h = 23 - d.getUTCHours();
                const m = 59 - d.getUTCMinutes();
                const s = 59 - d.getUTCSeconds();
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
                    // Use splice for Vue 3 reactivity on nested arrays
                    row.splice(this.active_cell, 1, char);
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

            checkWord(word: string): boolean {
                if (this.allow_any_word) return true;
                return word_list.includes(word) || word_list_supplement.includes(word);
            },

            updateColors(): void {
                const targetWord = this.todays_word;
                const baseClass =
                    'text-2xl tiny:text-4xl uppercase font-bold select-none text-white';
                const charCounts: Record<string, number> = {};

                // Count characters in target word
                for (const char of targetWord) {
                    charCounts[char] = (charCounts[char] || 0) + 1;
                }

                const row = this.tiles[this.active_row];
                const classes = this.tile_classes[this.active_row];
                if (!row || !classes) return;

                const keyClasses = this.key_classes as Record<string, KeyState>;

                // First pass: mark correct positions
                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    if (char && char === targetWord[i]) {
                        // Use splice for Vue 3 reactivity
                        classes.splice(i, 1, `correct ${baseClass}`);
                        keyClasses[char] = 'key-correct';
                        const count = charCounts[char];
                        if (count !== undefined) charCounts[char] = count - 1;
                    }
                }

                // Second pass: mark semi-correct and incorrect
                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    if (!char || classes[i]?.includes('correct')) continue;

                    const count = charCounts[char];
                    if (targetWord.includes(char) && count !== undefined && count > 0) {
                        // Use splice for Vue 3 reactivity
                        classes.splice(i, 1, `semicorrect ${baseClass}`);
                        if (keyClasses[char] !== 'key-correct') {
                            keyClasses[char] = 'key-semicorrect';
                        }
                        charCounts[char] = count - 1;
                    } else {
                        // Use splice for Vue 3 reactivity
                        classes.splice(i, 1, `incorrect ${baseClass}`);
                        if (!['key-correct', 'key-semicorrect'].includes(keyClasses[char] ?? '')) {
                            keyClasses[char] = 'key-incorrect';
                        }
                    }
                }
            },

            keyClick(key: string): void {
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

                if (key === 'Enter' || key === '⇨') {
                    if (!this.full_word_inputted) {
                        this.showNotification('Please enter a full word');
                        return;
                    }

                    const row = this.tiles[this.active_row];
                    const word = row ? row.join('').toLowerCase() : '';
                    if (this.checkWord(word)) {
                        this.updateColors();
                        this.active_row++;
                        this.active_cell = 0;
                        this.full_word_inputted = false;

                        if (word === this.todays_word) {
                            this.gameWon();
                        } else if (this.active_row === 6) {
                            this.gameLost();
                        }
                    } else {
                        this.showNotification('Word is not valid');
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

                setTimeout(() => {
                    this.show_stats_modal = true;
                }, 400);

                this.saveResult(true);
                this.stats = this.calculateStats(this.config?.language_code);

                // Show PWA install prompt after game completion
                setTimeout(() => pwa.showBanner(), 2000);
            },

            gameLost(): void {
                this.showNotification(this.todays_word.toUpperCase(), 12);
                this.game_over = true;
                this.game_won = false;
                this.attempts = 'X';

                setTimeout(() => {
                    this.show_stats_modal = true;
                }, 400);

                this.saveResult(false);
                this.stats = this.calculateStats(this.config?.language_code);
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

            async shareResults(): Promise<void> {
                const text = this.getShareText();
                const langCode = this.config?.language_code ?? '';
                const url = `https://wordle.global/${langCode}`;

                // Try Web Share API first
                if (navigator.share) {
                    try {
                        await navigator.share({ text, url });
                        this.showNotification(this.config?.text?.shared || 'Shared!');
                        return;
                    } catch (error) {
                        if (error instanceof Error && error.name === 'AbortError') return;
                        // Try text only
                        try {
                            await navigator.share({ text: `${text}\n${url}` });
                            this.showNotification(this.config?.text?.shared || 'Shared!');
                            return;
                        } catch (e) {
                            if (e instanceof Error && e.name === 'AbortError') return;
                        }
                    }
                }

                // Try Clipboard API
                if (navigator.clipboard?.writeText && window.isSecureContext) {
                    try {
                        await navigator.clipboard.writeText(text);
                        this.showNotification(this.config?.text?.copied || 'Copied to clipboard!');
                        return;
                    } catch (error) {
                        if (error instanceof Error) {
                            console.log('Clipboard API failed:', error.message);
                        }
                    }
                }

                // Legacy execCommand fallback
                if (this.copyViaExecCommand(text)) {
                    this.showNotification(this.config?.text?.copied || 'Copied to clipboard!');
                    return;
                }

                // Final fallback: show modal
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
                });
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
