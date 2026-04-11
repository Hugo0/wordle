/**
 * Shared date utilities for streak calculation.
 * Used by both stores/stats.ts (streak computation) and StreakModal.vue (calendar heatmap).
 */
import { isDailyStatsKey, isClassicDailyStatsKey } from './game-modes';
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

/** Per-day detail: which modes + languages were played, and overall win/loss. */
export interface DayDetail {
    state: 'won' | 'lost';
    modes: Set<string>;
    langs: Set<string>;
}

/**
 * Enhanced daily result map — includes which modes and languages were played each day.
 * Used by the profile page calendar to show mode icons and language flags.
 */
export function buildDailyResultMapDetailed(
    gameResults: Record<string, GameResult[]>
): Map<string, DayDetail> {
    const dayMap = new Map<string, DayDetail>();

    for (const [key, results] of Object.entries(gameResults)) {
        if (!isDailyStatsKey(key)) continue;

        // Extract mode and language from the stats key
        let mode: string;
        let lang: string;
        if (isClassicDailyStatsKey(key)) {
            mode = 'classic';
            lang = key; // bare language code
        } else {
            const parts = key.split('_');
            lang = parts[0]!;
            mode = parts[1] || 'classic';
        }

        for (const r of results) {
            const dayKey = toLocalDay(new Date(r.date as string));
            let detail = dayMap.get(dayKey);
            if (!detail) {
                detail = { state: 'lost', modes: new Set(), langs: new Set() };
                dayMap.set(dayKey, detail);
            }
            detail.modes.add(mode);
            detail.langs.add(lang);
            if (r.won) detail.state = 'won';
        }
    }

    return dayMap;
}
