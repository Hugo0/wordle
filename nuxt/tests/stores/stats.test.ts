/**
 * Stats Store unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useStatsStore } from '../../stores/stats';

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
    });
});
