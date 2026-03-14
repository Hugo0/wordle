/**
 * Stats Store - Game results, statistics, and streaks
 *
 * Manages persistent game results in localStorage and computes
 * per-language and cross-language statistics including streaks,
 * win percentages, and guess distributions.
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { GameResult, GameResults, GameStats, GuessDistribution, TotalStats } from '~/utils/types';

const EMPTY_DISTRIBUTION: GuessDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

function emptyStats(): GameStats {
    return {
        n_wins: 0,
        n_losses: 0,
        n_games: 0,
        n_attempts: 0,
        avg_attempts: 0,
        win_percentage: 0,
        longest_streak: 0,
        current_streak: 0,
        guessDistribution: { ...EMPTY_DISTRIBUTION },
    };
}

function emptyTotalStats(): TotalStats {
    return {
        total_games: 0,
        game_stats: {},
        languages_won: [],
        total_win_percentage: 0,
        longest_overall_streak: 0,
        current_overall_streak: 0,
        n_victories: 0,
        n_losses: 0,
    };
}

export const useStatsStore = defineStore('stats', () => {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const gameResults = ref<GameResults>({});
    const stats = ref<GameStats>(emptyStats());
    const totalStats = ref<TotalStats>(emptyTotalStats());

    // ---------------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------------

    /**
     * Load game results from localStorage.
     * Ensures the given language code has an entry (defaults to empty array).
     */
    function loadGameResults(langCode: string = 'unknown'): void {
        if (!import.meta.client) return;

        try {
            const stored = localStorage.getItem('game_results');
            if (stored) {
                gameResults.value = JSON.parse(stored) as GameResults;
                if (!gameResults.value[langCode]) {
                    gameResults.value[langCode] = [];
                }
            } else {
                gameResults.value = { [langCode]: [] };
                localStorage.setItem('game_results', JSON.stringify(gameResults.value));
            }
        } catch {
            // localStorage unavailable (private browsing, quota exceeded, etc.)
            gameResults.value = { [langCode]: [] };
        }
    }

    /**
     * Record a game result and persist to localStorage.
     */
    function saveResult(langCode: string, won: boolean, attempts: number): void {
        if (!langCode) return;

        const result: GameResult = { won, attempts, date: new Date() };

        if (!gameResults.value[langCode]) {
            gameResults.value[langCode] = [];
        }
        gameResults.value[langCode].push(result);

        if (import.meta.client) {
            try {
                localStorage.setItem('game_results', JSON.stringify(gameResults.value));
            } catch {
                // localStorage unavailable or quota exceeded
            }
        }
    }

    /**
     * Calculate statistics for a single language.
     */
    function calculateStats(languageCode: string | undefined): GameStats {
        if (!languageCode) {
            return emptyStats();
        }

        const results = gameResults.value[languageCode];
        if (!results?.length) {
            return emptyStats();
        }

        let n_wins = 0;
        let n_losses = 0;
        let n_attempts = 0;
        let current_streak = 0;
        let longest_streak = 0;
        const guessDistribution: GuessDistribution = { ...EMPTY_DISTRIBUTION };

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
        const computed: GameStats = {
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

        stats.value = computed;
        return computed;
    }

    /**
     * Calculate aggregate statistics across all languages.
     */
    function calculateTotalStats(): TotalStats {
        let n_victories = 0;
        let n_losses = 0;
        let current_overall_streak = 0;
        let longest_overall_streak = 0;
        const languages_won: string[] = [];
        const game_stats: Record<string, GameStats> = {};

        // Collect and sort all results by date
        const all_results: (GameResult & { language?: string })[] = [];
        for (const [language_code, results] of Object.entries(gameResults.value) as [
            string,
            GameResult[],
        ][]) {
            for (const result of results) {
                all_results.push({ ...result, language: language_code });
            }
        }
        all_results.sort(
            (a, b) =>
                new Date(a.date as string).getTime() - new Date(b.date as string).getTime(),
        );

        // Calculate overall streaks
        for (const result of all_results) {
            if (result.won) {
                n_victories++;
                current_overall_streak++;
                longest_overall_streak = Math.max(
                    longest_overall_streak,
                    current_overall_streak,
                );
            } else {
                n_losses++;
                current_overall_streak = 0;
            }
        }

        // Calculate per-language stats
        for (const language_code of Object.keys(gameResults.value)) {
            const langStats = calculateStats(language_code);
            game_stats[language_code] = langStats;

            if (langStats.n_wins > 0) {
                languages_won.push(language_code);
            }
        }

        const total_games = n_victories + n_losses;
        const computed: TotalStats = {
            total_games,
            game_stats,
            languages_won,
            total_win_percentage: total_games > 0 ? (n_victories / total_games) * 100 : 0,
            longest_overall_streak,
            current_overall_streak,
            n_victories,
            n_losses,
        };

        totalStats.value = computed;
        return computed;
    }

    return {
        // State
        gameResults,
        stats,
        totalStats,

        // Actions
        loadGameResults,
        saveResult,
        calculateStats,
        calculateTotalStats,
    };
});
