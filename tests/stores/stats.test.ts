/**
 * Stats Store unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useStatsStore } from '../../stores/stats';
import { buildStatsKey, createGameConfig, isClassicDailyStatsKey, isDailyStatsKey } from '../../utils/game-modes';

// jsdom provides localStorage natively when import.meta.client = true

describe('Stats Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('saveResult', () => {
        it('records a game result and persists to localStorage', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, 3);

            expect(stats.gameResults['en']).toHaveLength(1);
            expect(stats.gameResults['en']![0]!.won).toBe(true);
            expect(stats.gameResults['en']![0]!.attempts).toBe(3);
            const stored = localStorage.getItem('game_results');
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            expect(parsed['en']).toHaveLength(1);
        });

        it('appends multiple results for same language', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, 3);
            stats.saveResult('en', false, 6);
            stats.saveResult('en', true, 2);

            expect(stats.gameResults['en']).toHaveLength(3);
        });
    });

    describe('calculateStats', () => {
        it('returns zeros for unknown language', () => {
            const stats = useStatsStore();
            const result = stats.calculateStats('nonexistent');
            expect(result.n_games).toBe(0);
            expect(result.win_percentage).toBe(0);
        });

        it('computes correct win percentage and streaks', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, 3);
            stats.saveResult('en', true, 4);
            stats.saveResult('en', false, 6);
            stats.saveResult('en', true, 2);

            const result = stats.calculateStats('en');
            expect(result.n_wins).toBe(3);
            expect(result.n_losses).toBe(1);
            expect(result.n_games).toBe(4);
            expect(result.win_percentage).toBe(75);
            expect(result.longest_streak).toBe(2);
            expect(result.current_streak).toBe(1);
        });

        it('builds guess distribution correctly', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, 1);
            stats.saveResult('en', true, 3);
            stats.saveResult('en', true, 3);
            stats.saveResult('en', false, 6);

            const result = stats.calculateStats('en');
            expect(result.guessDistribution[1]).toBe(1);
            expect(result.guessDistribution[3]).toBe(2);
            expect(result.guessDistribution[6]).toBe(0); // losses don't count
        });
    });

    describe('mode-specific stats keys', () => {
        it('keeps classic and dordle stats separate', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, 3);
            stats.saveResult('en', true, 4);
            stats.saveResult('en_dordle', true, 7);
            stats.saveResult('en_dordle', false, 7);

            const classic = stats.calculateStats('en');
            expect(classic.n_games).toBe(2);
            expect(classic.n_wins).toBe(2);
            expect(classic.current_streak).toBe(2);

            const dordle = stats.calculateStats('en_dordle', 7);
            expect(dordle.n_games).toBe(2);
            expect(dordle.n_wins).toBe(1);
            expect(dordle.current_streak).toBe(0); // last game was a loss
        });

        it('dordle loss does not break classic streak', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, 3);
            stats.saveResult('en', true, 2);
            stats.saveResult('en_dordle', false, 7);
            stats.saveResult('en', true, 4);

            const classic = stats.calculateStats('en');
            expect(classic.current_streak).toBe(3);
            expect(classic.n_games).toBe(3);
        });

        it('builds distribution with correct maxGuesses for quordle', () => {
            const stats = useStatsStore();
            stats.saveResult('en_quordle', true, 8);
            stats.saveResult('en_quordle', true, 9);

            const quordle = stats.calculateStats('en_quordle', 9);
            expect(quordle.guessDistribution[8]).toBe(1);
            expect(quordle.guessDistribution[9]).toBe(1);
            expect(quordle.guessDistribution[7]).toBe(0);
        });
    });

    describe('calculateTotalStats', () => {
        it('aggregates across multiple languages', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, 3);
            stats.saveResult('en', true, 4);
            stats.saveResult('de', true, 2);
            stats.saveResult('de', false, 6);

            const total = stats.calculateTotalStats();
            expect(total.total_games).toBe(4);
            expect(total.n_victories).toBe(3);
            expect(total.n_losses).toBe(1);
            expect(total.languages_won).toContain('en');
            expect(total.languages_won).toContain('de');
            expect(total.game_stats['en']).toBeDefined();
            expect(total.game_stats['de']).toBeDefined();
        });

        it('overall streaks only count classic daily results on consecutive days', () => {
            const stats = useStatsStore();
            const day = 24 * 60 * 60 * 1000;
            const today = new Date();

            // Classic wins on 3 consecutive days
            stats.gameResults['en'] = [
                { won: true, attempts: 3, date: new Date(today.getTime() - 2 * day) },
                { won: true, attempts: 2, date: new Date(today.getTime() - 1 * day) },
                { won: true, attempts: 4, date: today },
            ];
            // Unlimited loss — should NOT break classic streak
            stats.gameResults['en_unlimited'] = [
                { won: false, attempts: 6, date: new Date(today.getTime() - 1 * day) },
            ];

            const total = stats.calculateTotalStats();
            expect(total.current_overall_streak).toBe(3);
            expect(total.n_victories).toBe(3);
            // Non-classic results excluded from total counts
            expect(total.n_losses).toBe(0);
        });

        it('excludes mode-specific keys from game_stats and languages_won', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, 3);
            stats.saveResult('en_dordle', true, 5);

            const total = stats.calculateTotalStats();
            expect(total.languages_won).toContain('en');
            expect(total.languages_won).not.toContain('en_dordle');
            expect(total.game_stats['en']).toBeDefined();
            expect(total.game_stats['en_dordle']).toBeUndefined();
        });

        it('does not overwrite stats ref when computing per-language totals', () => {
            const stats = useStatsStore();
            // Set up current stats for English classic
            stats.saveResult('en', true, 3);
            stats.saveResult('de', true, 2);
            stats.saveResult('de', false, 6);

            // Calculate stats for English specifically
            stats.calculateStats('en');
            expect(stats.stats.n_games).toBe(1);
            expect(stats.stats.current_streak).toBe(1);

            // calculateTotalStats should NOT overwrite stats ref
            stats.calculateTotalStats();
            expect(stats.stats.n_games).toBe(1); // Still English
            expect(stats.stats.current_streak).toBe(1);
        });
    });

    describe('buildStatsKey integration', () => {
        it('classic daily returns bare language code', () => {
            const config = createGameConfig('classic', 'en');
            expect(buildStatsKey(config)).toBe('en');
        });

        it('dordle daily returns lang_mode_daily format', () => {
            const config = createGameConfig('dordle', 'en');
            expect(buildStatsKey(config)).toBe('en_dordle_daily');
        });

        it('dordle unlimited returns lang_mode format (backward compat)', () => {
            const config = createGameConfig('dordle', 'en', { playType: 'unlimited' });
            expect(buildStatsKey(config)).toBe('en_dordle');
        });

        it('quordle daily returns lang_mode_daily format', () => {
            const config = createGameConfig('quordle', 'de');
            expect(buildStatsKey(config)).toBe('de_quordle_daily');
        });

        it('unlimited mode maps to classic bucket (backward compat)', () => {
            const config = createGameConfig('unlimited', 'en');
            expect(buildStatsKey(config)).toBe('en');
        });

        it('speed daily returns lang_mode_daily format', () => {
            const config = createGameConfig('speed', 'en');
            expect(buildStatsKey(config)).toBe('en_speed_daily');
        });

        it('speed unlimited returns lang_mode format (backward compat)', () => {
            const config = createGameConfig('speed', 'en', { playType: 'unlimited' });
            expect(buildStatsKey(config)).toBe('en_speed');
        });
    });

    describe('isClassicDailyStatsKey', () => {
        it('bare language codes are classic daily', () => {
            expect(isClassicDailyStatsKey('en')).toBe(true);
            expect(isClassicDailyStatsKey('de')).toBe(true);
            expect(isClassicDailyStatsKey('fr')).toBe(true);
            expect(isClassicDailyStatsKey('zh')).toBe(true);
        });

        it('mode-suffixed keys are not classic daily', () => {
            expect(isClassicDailyStatsKey('en_dordle')).toBe(false);
            expect(isClassicDailyStatsKey('en_quordle')).toBe(false);
            expect(isClassicDailyStatsKey('en_octordle')).toBe(false);
            expect(isClassicDailyStatsKey('en_unlimited')).toBe(false);
            expect(isClassicDailyStatsKey('en_speed')).toBe(false);
        });

        it('is consistent with buildStatsKey for all modes', () => {
            // Classic daily should produce a key that isClassicDailyStatsKey recognizes
            expect(isClassicDailyStatsKey(buildStatsKey(createGameConfig('classic', 'en')))).toBe(
                true
            );
            // All other modes should not
            expect(isClassicDailyStatsKey(buildStatsKey(createGameConfig('dordle', 'en')))).toBe(
                false
            );
            expect(isClassicDailyStatsKey(buildStatsKey(createGameConfig('unlimited', 'en')))).toBe(
                true
            );
            expect(isClassicDailyStatsKey(buildStatsKey(createGameConfig('speed', 'en')))).toBe(
                false
            );
        });
    });

    describe('isDailyStatsKey', () => {
        it('bare language codes are daily (classic daily)', () => {
            expect(isDailyStatsKey('en')).toBe(true);
            expect(isDailyStatsKey('de')).toBe(true);
        });

        it('keys ending with _daily are daily', () => {
            expect(isDailyStatsKey('en_dordle_daily')).toBe(true);
            expect(isDailyStatsKey('en_speed_daily')).toBe(true);
            expect(isDailyStatsKey('en_semantic_daily')).toBe(true);
        });

        it('unlimited keys are NOT daily', () => {
            expect(isDailyStatsKey('en_unlimited')).toBe(false);
            expect(isDailyStatsKey('en_dordle')).toBe(false);
            expect(isDailyStatsKey('en_speed')).toBe(false);
        });

        it('is consistent with buildStatsKey for daily modes', () => {
            expect(isDailyStatsKey(buildStatsKey(createGameConfig('classic', 'en')))).toBe(true);
            expect(isDailyStatsKey(buildStatsKey(createGameConfig('dordle', 'en')))).toBe(true);
            expect(isDailyStatsKey(buildStatsKey(createGameConfig('speed', 'en')))).toBe(true);
            expect(isDailyStatsKey(buildStatsKey(createGameConfig('semantic', 'en')))).toBe(true);
        });

        it('is consistent with buildStatsKey for unlimited modes', () => {
            // Legacy 'unlimited' mode maps to classic bucket (bare lang code),
            // which isDailyStatsKey treats as daily — this is intentional since
            // unlimited is now classic with playType: 'unlimited'
            expect(isDailyStatsKey(buildStatsKey(createGameConfig('unlimited', 'en')))).toBe(true);
            expect(isDailyStatsKey(buildStatsKey(createGameConfig('dordle', 'en', { playType: 'unlimited' })))).toBe(false);
            expect(isDailyStatsKey(buildStatsKey(createGameConfig('speed', 'en', { playType: 'unlimited' })))).toBe(false);
        });
    });

    describe('streak edge cases', () => {
        it('streak is zero after all losses', () => {
            const stats = useStatsStore();
            stats.saveResult('en', false, 6);
            stats.saveResult('en', false, 6);

            const result = stats.calculateStats('en');
            expect(result.current_streak).toBe(0);
            expect(result.longest_streak).toBe(0);
        });

        it('streak survives across multiple languages in overall stats', () => {
            const stats = useStatsStore();
            const day = 24 * 60 * 60 * 1000;
            const today = new Date();

            // Different languages on consecutive days
            stats.gameResults['en'] = [
                { won: true, attempts: 3, date: new Date(today.getTime() - 2 * day) },
            ];
            stats.gameResults['de'] = [
                { won: true, attempts: 2, date: new Date(today.getTime() - 1 * day) },
            ];
            stats.gameResults['fr'] = [{ won: true, attempts: 4, date: today }];

            const total = stats.calculateTotalStats();
            expect(total.current_overall_streak).toBe(3);
        });

        it('overall streak broken by classic loss but not mode loss', () => {
            const stats = useStatsStore();
            const day = 24 * 60 * 60 * 1000;
            const today = new Date();

            stats.gameResults['en'] = [
                { won: true, attempts: 3, date: new Date(today.getTime() - 3 * day) },
                { won: true, attempts: 2, date: new Date(today.getTime() - 2 * day) },
                { won: false, attempts: 6, date: new Date(today.getTime() - 1 * day) }, // breaks it
                { won: true, attempts: 4, date: today },
            ];
            // Mode losses should not affect overall streak
            stats.gameResults['en_dordle'] = [
                { won: false, attempts: 7, date: new Date(today.getTime() - 2 * day) },
            ];
            stats.gameResults['en_unlimited'] = [
                { won: false, attempts: 6, date: new Date(today.getTime() - 1 * day) },
            ];

            const total = stats.calculateTotalStats();
            expect(total.current_overall_streak).toBe(1);
            expect(total.longest_overall_streak).toBe(2);
        });

        it('per-mode streaks are independent', () => {
            const stats = useStatsStore();
            // Classic: win, win, loss
            stats.saveResult('en', true, 3);
            stats.saveResult('en', true, 2);
            stats.saveResult('en', false, 6);
            // Dordle: win, win, win
            stats.saveResult('en_dordle', true, 5);
            stats.saveResult('en_dordle', true, 6);
            stats.saveResult('en_dordle', true, 7);

            const classic = stats.calculateStats('en');
            expect(classic.current_streak).toBe(0);
            expect(classic.longest_streak).toBe(2);

            const dordle = stats.calculateStats('en_dordle', 7);
            expect(dordle.current_streak).toBe(3);
            expect(dordle.longest_streak).toBe(3);
        });

        it('distribution ignores attempts beyond maxGuesses', () => {
            const stats = useStatsStore();
            // Dordle: maxGuesses=7, attempt 8 should be ignored
            stats.saveResult('en_dordle', true, 7);
            stats.saveResult('en_dordle', true, 8); // out of range for dordle

            const dordle = stats.calculateStats('en_dordle', 7);
            expect(dordle.guessDistribution[7]).toBe(1);
            expect(dordle.guessDistribution[8]).toBeUndefined();
            expect(dordle.n_wins).toBe(2); // still counted as win
        });

        it('string attempts are parsed correctly', () => {
            const stats = useStatsStore();
            stats.saveResult('en', true, '3' as unknown as number);
            stats.saveResult('en', true, '5' as unknown as number);

            const result = stats.calculateStats('en');
            expect(result.guessDistribution[3]).toBe(1);
            expect(result.guessDistribution[5]).toBe(1);
            expect(result.current_streak).toBe(2);
        });
    });
});
