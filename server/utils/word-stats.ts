/**
 * Anonymous word stats collection.
 *
 * DB-only: atomic SQL increments via db-cache.ts.
 */

import type { WordStats } from '~/utils/types';

// In-memory dedup (resets on restart, never persisted)
const STATS_MAX_IPS = 50_000;
const _statsSeenIps = new Set<string>();
let _statsSeenDay: number | null = null;

/**
 * Load stats for a specific word/day from DB.
 */
export async function loadWordStats(langCode: string, dayIdx: number): Promise<WordStats | null> {
    try {
        const { getWordStats } = await import('./db-cache');
        return await getWordStats(langCode, dayIdx);
    } catch {
        return null;
    }
}

/**
 * Atomically update stats for a specific word/day.
 * Uses DB atomic increment (ON CONFLICT DO UPDATE SET total = total + 1).
 */
export async function updateWordStats(
    langCode: string,
    dayIdx: number,
    won: boolean,
    attempts: number
): Promise<void> {
    try {
        const { incrementWordStats } = await import('./db-cache');
        await incrementWordStats(langCode, dayIdx, won, attempts);
    } catch (e) {
        console.warn(`[word-stats] DB write failed for ${langCode}/${dayIdx}:`, e);
    }
}

/**
 * Check and update dedup state. Returns true if this is a duplicate submission.
 */
export function isDuplicateSubmission(
    langCode: string,
    dayIdx: number,
    clientId: string,
    todaysIdx: number
): boolean {
    if (_statsSeenDay !== todaysIdx) {
        _statsSeenIps.clear();
        _statsSeenDay = todaysIdx;
    }

    const dedupKey = `${langCode}:${dayIdx}:${clientId.slice(0, 64)}`;
    if (_statsSeenIps.has(dedupKey)) return true;

    if (_statsSeenIps.size < STATS_MAX_IPS) {
        _statsSeenIps.add(dedupKey);
    }
    return false;
}
