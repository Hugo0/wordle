/**
 * Shared date utilities for streak calculation.
 * Used by both stores/stats.ts (streak computation) and StreakModal.vue (calendar heatmap).
 */
import { isDailyStatsKey } from './game-modes';
import type { GameResult } from './types';

/** Convert a Date to local "YYYY-MM-DD" string (user's timezone, not UTC). */
export function toLocalDay(d: Date): string {
    return d.toLocaleDateString('en-CA');
}

/** DST-safe step back one calendar day. Parses at noon to avoid DST edge cases. */
export function stepBack(dateKey: string): string {
    const d = new Date(dateKey + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return toLocalDay(d);
}

/**
 * Build a map of local dates to win/loss state from game results.
 * Win always overrides a same-day loss (play multiple languages, any win counts).
 * Includes ALL daily play types (classic, dordle daily, speed daily, etc.)
 * for product-wide streak calculation.
 */
export function buildDailyResultMap(
    gameResults: Record<string, GameResult[]>
): Map<string, 'won' | 'lost'> {
    const dayStates = new Map<string, 'won' | 'lost'>();

    for (const [key, results] of Object.entries(gameResults)) {
        if (!isDailyStatsKey(key)) continue;
        for (const r of results) {
            const dayKey = toLocalDay(new Date(r.date as string));
            if (r.won) {
                dayStates.set(dayKey, 'won'); // win always overrides loss
            } else if (!dayStates.has(dayKey)) {
                dayStates.set(dayKey, 'lost');
            }
        }
    }

    return dayStates;
}
