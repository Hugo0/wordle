/**
 * Wordle Global - Homepage App
 * Language selection and stats display
 */
import { createApp, type App } from 'vue';
import { setHapticsEnabled } from './haptics';
import { setSoundEnabled } from './sounds';
import pwa from './pwa';

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

// Extend Window interface for homepage globals
declare global {
    interface Window {
        languages?: Record<string, Language>;
        other_wordles?: OtherWordle[];
        todays_idx?: string;
        language_popularity?: string[];
    }
}

export default function createIndexApp(): App {
    // Window globals from Jinja
    const languages = window.languages ?? {};
    const other_wordles = window.other_wordles ?? [];
    const todays_idx = window.todays_idx ?? '0';
    const language_popularity = window.language_popularity ?? [];

    return createApp({
        delimiters: ['[[', ']]'],
        data() {
            return {
                showPopup: false,
                showAboutModal: false,
                showSettingsModal: false,
                clickedLanguage: '',
                darkMode: document.documentElement.classList.contains('dark'),
                feedbackEnabled: true,

                // Flask data
                other_wordles,
                languages,
                todays_idx,

                // Copy of data for visualization (filtered)
                other_wordles_vis: other_wordles,
                languages_vis: [] as Language[],

                search_text: '',
                game_results: {} as Record<string, GameResult[]>,
                detectedLanguage: null as Language | null,
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

            // Cache languages for game page to access
            this.cacheLanguages();

            // Load preferences
            this.loadFeedbackPreference();

            // Initialize languages with recently played first
            this.languages_vis = this.getSortedLanguages();
            // Detect browser language for hero CTA
            this.detectedLanguage = this.detectBrowserLanguage();
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
                    this.showSettingsModal = false;
                }
            },

            detectBrowserLanguage(): Language | null {
                try {
                    // Try all preferred languages (navigator.languages),
                    // falling back to navigator.language for older browsers
                    const candidates = navigator.languages?.length
                        ? navigator.languages
                        : [navigator.language || ''];

                    for (const browserLang of candidates) {
                        const lower = browserLang.toLowerCase();
                        // Try exact match first (e.g. "nb" → "nb")
                        if (this.languages[lower]) {
                            return this.languages[lower] as Language;
                        }
                        // Try prefix match (e.g. "de-AT" → "de", "pt-BR" → "pt")
                        const prefix = lower.split('-')[0] ?? '';
                        if (prefix && this.languages[prefix]) {
                            return this.languages[prefix] as Language;
                        }
                        // Special case: Norwegian "no" → "nb" (Bokmål)
                        if (prefix === 'no' && this.languages['nb']) {
                            return this.languages['nb'] as Language;
                        }
                    }
                } catch {
                    // navigator.languages unavailable
                }
                return null;
            },

            selectLanguageWithCode(language_code: string): void {
                window.location.href = '/' + language_code;
            },

            openLink(url: string): void {
                window.open(url);
            },

            cacheLanguages(): void {
                // Cache language info to localStorage for game page to access
                try {
                    const languageCache: Record<
                        string,
                        {
                            language_code: string;
                            language_name: string;
                            language_name_native: string;
                        }
                    > = {};
                    for (const [code, lang] of Object.entries(this.languages) as [
                        string,
                        Language,
                    ][]) {
                        languageCache[code] = {
                            language_code: lang.language_code,
                            language_name: lang.language_name,
                            language_name_native: lang.language_name_native,
                        };
                    }
                    localStorage.setItem('languages_cache', JSON.stringify(languageCache));
                } catch {
                    // Ignore storage errors
                }
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

            loadFeedbackPreference(): void {
                try {
                    const stored = localStorage.getItem('feedbackEnabled');
                    if (stored !== null) {
                        this.feedbackEnabled = stored === 'true';
                    }
                    setHapticsEnabled(this.feedbackEnabled);
                    setSoundEnabled(this.feedbackEnabled);
                } catch {
                    // localStorage unavailable
                }
            },

            toggleFeedback(): void {
                this.$nextTick(() => {
                    setHapticsEnabled(this.feedbackEnabled);
                    setSoundEnabled(this.feedbackEnabled);
                    try {
                        localStorage.setItem(
                            'feedbackEnabled',
                            this.feedbackEnabled ? 'true' : 'false'
                        );
                    } catch {
                        // localStorage unavailable
                    }
                });
            },

            canInstallPwa(): boolean {
                return !pwa.isStandalone();
            },

            installPwa(): void {
                pwa.install();
            },

            getSortedLanguages(): Language[] {
                const allLanguages = Object.values(this.languages) as Language[];
                const playedLanguages: Language[] = [];
                const unplayedLanguages: Language[] = [];

                for (const lang of allLanguages) {
                    if (this.game_results[lang.language_code]?.length > 0) {
                        playedLanguages.push(lang);
                    } else {
                        unplayedLanguages.push(lang);
                    }
                }

                // Sort played languages by most recent game date
                playedLanguages.sort((a, b) => {
                    const resultsA = this.game_results[a.language_code] || [];
                    const resultsB = this.game_results[b.language_code] || [];
                    const lastDateA =
                        resultsA.length > 0
                            ? new Date(resultsA[resultsA.length - 1].date).getTime()
                            : 0;
                    const lastDateB =
                        resultsB.length > 0
                            ? new Date(resultsB[resultsB.length - 1].date).getTime()
                            : 0;
                    return lastDateB - lastDateA;
                });

                // Sort unplayed languages by popularity (from GA data)
                unplayedLanguages.sort((a, b) => {
                    const indexA = language_popularity.indexOf(a.language_code);
                    const indexB = language_popularity.indexOf(b.language_code);
                    // Languages not in the popularity list go to the end
                    const rankA = indexA === -1 ? 999 : indexA;
                    const rankB = indexB === -1 ? 999 : indexB;
                    return rankA - rankB;
                });

                const sorted = [...playedLanguages, ...unplayedLanguages];

                // If we detected the browser language, move it to the front
                if (this.detectedLanguage) {
                    const detectedCode = this.detectedLanguage.language_code;
                    const idx = sorted.findIndex((l) => l.language_code === detectedCode);
                    if (idx > 0) {
                        sorted.unshift(...sorted.splice(idx, 1));
                    }
                }

                return sorted;
            },

            hasPlayed(language_code: string): boolean {
                return (this.game_results[language_code]?.length ?? 0) > 0;
            },

            getGamesPlayed(language_code: string): number {
                return this.game_results[language_code]?.length ?? 0;
            },

            getCurrentStreak(language_code: string): number {
                const stats = this.total_stats.game_stats?.[language_code];
                return stats?.current_streak ?? 0;
            },

            getWinRate(language_code: string): number {
                const stats = this.total_stats.game_stats?.[language_code];
                return stats?.win_percentage ?? 0;
            },

            filterWordles(search_text: string): void {
                if (search_text === '') {
                    this.other_wordles_vis = this.other_wordles;
                    this.languages_vis = this.getSortedLanguages();
                } else {
                    const visible_languages: Language[] = [];
                    const visible_wordles: OtherWordle[] = [];

                    // Filter languages (maintain sorted order)
                    for (const language of this.getSortedLanguages()) {
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
        },
    });
}
