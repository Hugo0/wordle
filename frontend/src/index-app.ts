/**
 * Wordle Global - Homepage App
 * Language selection and stats display
 */
import { createApp, type App } from 'vue';

// Types for homepage data
interface Language {
    language_code: string;
    language_name: string;
    language_name_native: string;
}

interface OtherWordle {
    name: string;
    language: string;
    url: string;
}

interface GameResult {
    won: boolean;
    attempts: number;
    date: string;
}

interface LanguageStats {
    n_wins: number;
    n_losses: number;
    n_games: number;
    n_attempts: number;
    avg_attempts: number;
    win_percentage: number;
    longest_streak: number;
    current_streak: number;
}

interface TotalStats {
    total_games: number;
    game_stats: Record<string, LanguageStats>;
    languages_won: string[];
    total_win_percentage: number;
    longest_overall_streak: number;
    current_overall_streak: number;
    longest_language_streak: number;
    current_longest_language_streak: number;
    current_longest_language_streak_language: string;
    n_victories: number;
    n_losses: number;
}

// Extend Window interface for homepage globals
declare global {
    interface Window {
        languages?: Record<string, Language>;
        other_wordles?: OtherWordle[];
        todays_idx?: string;
    }
}

export default function createIndexApp(): App {
    // Window globals from Jinja
    const languages = window.languages ?? {};
    const other_wordles = window.other_wordles ?? [];
    const todays_idx = window.todays_idx ?? '0';

    return createApp({
        delimiters: ['[[', ']]'],
        data() {
            return {
                showPopup: false,
                showAboutModal: false,
                showStatsModal: false,
                clickedLanguage: '',
                darkMode: document.documentElement.classList.contains('dark'),

                // Flask data
                other_wordles,
                languages,
                todays_idx,

                // Copy of data for visualization (filtered)
                other_wordles_vis: other_wordles,
                languages_vis: Object.values(languages),

                search_text: '',
                total_stats: {} as TotalStats,
                game_results: {} as Record<string, GameResult[]>,
            };
        },

        beforeCreate() {
            // Redirect HTTP to HTTPS unless localhost
            const { hostname, protocol, pathname } = window.location;
            if (hostname !== 'localhost' && hostname !== '127.0.0.1' && protocol !== 'https:') {
                window.location.href = `https://${hostname}${pathname}`;
            }
        },

        created() {
            // Load game results from localStorage
            const stored = localStorage.getItem('game_results');
            if (stored) {
                this.game_results = JSON.parse(stored);
            } else {
                this.game_results = {};
                localStorage.setItem('game_results', JSON.stringify(this.game_results));
            }

            this.total_stats = this.calculateTotalStats();
        },

        mounted() {
            window.addEventListener('keydown', (e) => this.keyDown(e));
        },

        beforeUpdate() {
            this.filterWordles(this.search_text.toLowerCase());
        },

        methods: {
            keyDown(event: KeyboardEvent): void {
                if (event.key === 'Escape') {
                    this.showStatsModal = false;
                    this.showAboutModal = false;
                }
            },

            selectLanguageWithCode(language_code: string): void {
                window.location.href = '/' + language_code;
            },

            openLink(url: string): void {
                window.open(url);
            },

            toggleDarkMode(): void {
                this.$nextTick(() => {
                    if (this.darkMode) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('darkMode', 'true');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('darkMode', 'false');
                    }
                });
            },

            filterWordles(search_text: string): void {
                if (search_text === '') {
                    this.other_wordles_vis = this.other_wordles;
                    this.languages_vis = Object.values(this.languages);
                } else {
                    const visible_languages: Language[] = [];
                    const visible_wordles: OtherWordle[] = [];

                    // Filter languages
                    for (const language of Object.values(this.languages) as Language[]) {
                        if (
                            language.language_name.toLowerCase().includes(search_text) ||
                            language.language_name_native.toLowerCase().includes(search_text)
                        ) {
                            visible_languages.push(language);
                        }
                    }

                    // Filter other wordles
                    for (const wordle of this.other_wordles) {
                        if (
                            wordle.name.toLowerCase().includes(search_text) ||
                            wordle.language.toLowerCase().includes(search_text)
                        ) {
                            visible_wordles.push(wordle);
                        }
                    }

                    this.other_wordles_vis = visible_wordles;
                    this.languages_vis = visible_languages;
                }
            },

            calculateStats(language_code: string): LanguageStats {
                const results = this.game_results[language_code];
                if (!results) {
                    return {
                        n_wins: 0,
                        n_losses: 0,
                        n_games: 0,
                        n_attempts: 0,
                        avg_attempts: 0,
                        win_percentage: 0,
                        longest_streak: 0,
                        current_streak: 0,
                    };
                }

                let n_wins = 0;
                let n_losses = 0;
                let n_attempts = 0;
                let current_streak = 0;
                let longest_streak = 0;

                for (const result of results) {
                    if (result.won) {
                        n_wins++;
                        current_streak++;
                        longest_streak = Math.max(longest_streak, current_streak);
                    } else {
                        n_losses++;
                        current_streak = 0;
                    }
                    n_attempts += result.attempts;
                }

                const total = n_wins + n_losses;
                return {
                    n_wins,
                    n_losses,
                    n_games: results.length,
                    n_attempts,
                    avg_attempts: results.length > 0 ? n_attempts / results.length : 0,
                    win_percentage: total > 0 ? (n_wins / total) * 100 : 0,
                    longest_streak,
                    current_streak,
                };
            },

            calculateTotalStats(): TotalStats {
                let n_victories = 0;
                let n_losses = 0;
                let current_overall_streak = 0;
                let longest_overall_streak = 0;
                let longest_language_streak = 0;
                let current_longest_language_streak = 0;
                let current_longest_language_streak_language = '';
                const languages_won: string[] = [];
                const game_stats: Record<string, LanguageStats> = {};

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
                all_results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
                    longest_language_streak = Math.max(
                        longest_language_streak,
                        stats.longest_streak
                    );
                    if (stats.current_streak > current_longest_language_streak) {
                        current_longest_language_streak = stats.current_streak;
                        current_longest_language_streak_language = language_code;
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
                    longest_language_streak,
                    current_longest_language_streak,
                    current_longest_language_streak_language,
                    n_victories,
                    n_losses,
                };
            },
        },
    });
}
