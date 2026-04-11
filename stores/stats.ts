/**
 * Stats Store - Game results, statistics, and streaks
 *
 * Manages persistent game results in localStorage and computes
 * per-language and cross-language statistics including streaks,
 * win percentages, and guess distributions.
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
    GameResult,
    GameResults,
    GameStats,
    GuessDistribution,
    SpeedAggregate,
    SpeedResult,
    SpeedResults,
    TotalStats,
} from '~/utils/types';
import { createEmptyDistribution } from '~/utils/types';
import { isClassicDailyStatsKey } from '~/utils/game-modes';
import { readJson, writeJson, scopedKey, STORAGE_KEYS } from '~/utils/storage';
import { toLocalDay, stepBack, buildDailyResultMap } from '~/utils/streak-dates';

function emptyStats(maxGuesses: number = 6): GameStats {
    return {
        n_wins: 0,
        n_losses: 0,
        n_games: 0,
        n_attempts: 0,
        avg_attempts: 0,
        win_percentage: 0,
        longest_streak: 0,
        current_streak: 0,
        guessDistribution: createEmptyDistribution(maxGuesses),
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

    // Speed Streak sessions (persistent, per-language). Separate storage key
    // because the shape — score / combo / timing — does not fit GameResult.
    const speedResults = ref<SpeedResults>({});
    // Cap retained sessions per language so localStorage can't balloon.
    // At 100 sessions, heavy players may lose very old runs; acceptable
    // because the /stats section only surfaces aggregates + recent top 3.
    const SPEED_MAX_PER_LANG = 100;

    // ---------------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------------

    /**
     * Load game results from localStorage.
     * Ensures the given language code has an entry (defaults to empty array).
     */
    function loadGameResults(langCode: string = 'unknown'): void {
        if (!import.meta.client) return;

        const stored = readJson<GameResults>(scopedKey(STORAGE_KEYS.GAME_RESULTS));
        if (stored) {
            gameResults.value = stored;
            if (!gameResults.value[langCode]) {
                gameResults.value[langCode] = [];
            }
        } else {
            gameResults.value = { [langCode]: [] };
            writeJson(scopedKey(STORAGE_KEYS.GAME_RESULTS), gameResults.value);
        }
    }

    /**
     * Record a game result and persist to localStorage.
     * @param statsKey - Storage key: language code for classic daily, "{lang}_{mode}" for other modes.
     */
    function saveResult(statsKey: string, won: boolean, attempts: number): void {
        if (!statsKey) return;

        const result: GameResult = { won, attempts, date: new Date() };

        if (!gameResults.value[statsKey]) {
            gameResults.value[statsKey] = [];
        }
        gameResults.value[statsKey].push(result);

        writeJson(scopedKey(STORAGE_KEYS.GAME_RESULTS), gameResults.value);
    }

    /**
     * Pure stats computation — no side effects on the reactive `stats` ref.
     * Used by both calculateStats (which updates the ref) and calculateTotalStats (which doesn't).
     */
    function computeStats(results: GameResult[], maxGuesses: number): GameStats {
        if (!results.length) {
            return emptyStats(maxGuesses);
        }

        let n_wins = 0;
        let n_losses = 0;
        let n_attempts = 0;
        let current_streak = 0;
        let longest_streak = 0;
        const guessDistribution: GuessDistribution = createEmptyDistribution(maxGuesses);

        for (const result of results) {
            const attempts =
                typeof result.attempts === 'string'
                    ? parseInt(result.attempts, 10) || 0
                    : result.attempts;

            if (result.won) {
                n_wins++;
                current_streak++;
                longest_streak = Math.max(longest_streak, current_streak);
                if (attempts >= 1 && attempts <= maxGuesses) {
                    guessDistribution[attempts]++;
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
    }

    /**
     * Calculate statistics for a given stats key and update the reactive `stats` ref.
     * @param statsKey - Storage key: language code for classic daily, "{lang}_{mode}" for other modes.
     * @param maxGuesses - Max guesses for this mode (default 6). Determines distribution bar count.
     */
    function calculateStats(statsKey: string | undefined, maxGuesses: number = 6): GameStats {
        if (!statsKey) {
            stats.value = emptyStats(maxGuesses);
            return stats.value;
        }

        const results = gameResults.value[statsKey];
        stats.value = results?.length ? computeStats(results, maxGuesses) : emptyStats(maxGuesses);
        return stats.value;
    }

    /**
     * Calculate aggregate statistics across all languages.
     * Overall streaks only count classic daily results (bare language code keys).
     */
    function calculateTotalStats(): TotalStats {
        let n_victories = 0;
        let n_losses = 0;
        let current_overall_streak = 0;
        let longest_overall_streak = 0;
        const languages_won: string[] = [];
        const game_stats: Record<string, GameStats> = {};

        // Collect and sort classic daily results for overall streak calculation.
        // Uses computeStats (pure) to avoid overwriting the reactive stats.value ref.
        const daily_results: (GameResult & { language?: string })[] = [];
        for (const [key, results] of Object.entries(gameResults.value) as [
            string,
            GameResult[],
        ][]) {
            if (isClassicDailyStatsKey(key)) {
                for (const result of results) {
                    daily_results.push({ ...result, language: key });
                }
            }
        }
        daily_results.sort(
            (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
        );

        // Build map: local date → won/lost. Uses shared streak-dates utilities.
        // Streak = consecutive LOCAL calendar days with at least one daily win.
        const dayStates = buildDailyResultMap(gameResults.value);
        const seenDays = new Map<string, boolean>();
        for (const [dayKey, state] of dayStates) {
            seenDays.set(dayKey, state === 'won');
        }
        // Count victories and losses from daily results
        for (const result of daily_results) {
            if (result.won) n_victories++;
            else n_losses++;
        }

        // Current streak: walk backwards from today (DST-safe)
        let checkKey = toLocalDay(new Date());
        for (let i = 0; i <= seenDays.size; i++) {
            const played = seenDays.get(checkKey);
            if (played === true) {
                current_overall_streak++;
            } else if (i === 0 && played === undefined) {
                // Today not yet played — skip, check yesterday
            } else {
                break;
            }
            checkKey = stepBack(checkKey);
        }

        // Longest streak: walk sorted days, check consecutive via stepBack
        let tempStreak = 0;
        const sortedDays = [...seenDays.entries()].sort();
        let prevDayKey: string | null = null;
        for (const [dayKey, won] of sortedDays) {
            if (!won) {
                tempStreak = 0;
                prevDayKey = null;
                continue;
            }
            if (prevDayKey && stepBack(dayKey) === prevDayKey) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
            longest_overall_streak = Math.max(longest_overall_streak, tempStreak);
            prevDayKey = dayKey;
        }

        // Per-language stats (classic daily keys only, default maxGuesses=6)
        for (const key of Object.keys(gameResults.value)) {
            if (isClassicDailyStatsKey(key)) {
                const results = gameResults.value[key];
                const langStats = results?.length ? computeStats(results, 6) : emptyStats();
                game_stats[key] = langStats;

                if (langStats.n_wins > 0) {
                    languages_won.push(key);
                }
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

    // ---------------------------------------------------------------------------
    // Speed Streak persistence
    // ---------------------------------------------------------------------------

    /** Guard against `JSON.parse('null')`/`'[]'` succeeding but producing non-record values. */
    function isValidSpeedResults(value: unknown): value is SpeedResults {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            return false;
        }
        return Object.values(value as Record<string, unknown>).every(Array.isArray);
    }

    function loadSpeedResults(): void {
        const parsed = readJson<unknown>(scopedKey(STORAGE_KEYS.SPEED_RESULTS));
        speedResults.value = isValidSpeedResults(parsed) ? parsed : {};
    }

    function saveSpeedResult(langCode: string, result: Omit<SpeedResult, 'date'>): void {
        if (!langCode) return;
        const entry: SpeedResult = { ...result, date: new Date().toISOString() };
        const prior = speedResults.value[langCode] ?? [];
        const next = [...prior, entry];
        // Drop oldest runs beyond the cap.
        speedResults.value[langCode] =
            next.length > SPEED_MAX_PER_LANG ? next.slice(-SPEED_MAX_PER_LANG) : next;
        writeJson(scopedKey(STORAGE_KEYS.SPEED_RESULTS), speedResults.value);
    }

    function calculateSpeedStats(): SpeedAggregate {
        let games = 0;
        let bestScore = 0;
        let bestWordsSolved = 0;
        let bestMaxCombo = 0;
        const all: SpeedResult[] = [];
        const perLang: Record<string, { games: number; bestScore: number }> = {};

        for (const [langCode, results] of Object.entries(speedResults.value)) {
            if (!results?.length) continue;
            for (const r of results) {
                games++;
                if (r.score > bestScore) bestScore = r.score;
                if (r.wordsSolved > bestWordsSolved) bestWordsSolved = r.wordsSolved;
                if (r.maxCombo > bestMaxCombo) bestMaxCombo = r.maxCombo;
                all.push(r);
                if (!perLang[langCode]) perLang[langCode] = { games: 0, bestScore: 0 };
                perLang[langCode].games++;
                if (r.score > perLang[langCode].bestScore) perLang[langCode].bestScore = r.score;
            }
        }

        const topRuns = [...all].sort((a, b) => b.score - a.score).slice(0, 3);

        return { games, bestScore, bestWordsSolved, bestMaxCombo, topRuns, perLang };
    }

    // Cross-tab sync: reload stats when another tab updates game_results / speed_results.
    // Matches the currently active scoped key (anonymous or user-namespaced).
    if (import.meta.client) {
        window.addEventListener('storage', (e) => {
            if (e.key === scopedKey(STORAGE_KEYS.GAME_RESULTS) && e.newValue) {
                try {
                    gameResults.value = JSON.parse(e.newValue) as GameResults;
                    calculateTotalStats();
                } catch {
                    // Ignore parse errors from other tabs
                }
            } else if (e.key === scopedKey(STORAGE_KEYS.SPEED_RESULTS) && e.newValue) {
                try {
                    const parsed: unknown = JSON.parse(e.newValue);
                    if (isValidSpeedResults(parsed)) {
                        speedResults.value = parsed;
                    }
                } catch {
                    // Ignore parse errors from other tabs
                }
            }
        });
    }

    return {
        // State
        gameResults,
        stats,
        totalStats,
        speedResults,

        // Actions
        loadGameResults,
        saveResult,
        calculateStats,
        calculateTotalStats,
        loadSpeedResults,
        saveSpeedResult,
        calculateSpeedStats,
    };
});
