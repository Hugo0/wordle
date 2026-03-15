/**
 * Anonymous word stats collection — port of webapp/app.py stats functions.
 *
 * Uses proper-lockfile instead of fcntl.flock() for atomic read-modify-write.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { WORD_STATS_DIR } from './data-loader';
import type { WordStats } from '~/utils/types';

// In-memory dedup (resets on restart, never persisted)
const STATS_MAX_IPS = 50_000;
const _statsSeenIps = new Set<string>();
let _statsSeenDay: number | null = null;

/**
 * Load stats for a specific word/day.
 */
export function loadWordStats(langCode: string, dayIdx: number): WordStats | null {
    const statsPath = join(WORD_STATS_DIR, langCode, `${dayIdx}.json`);
    if (!existsSync(statsPath)) return null;
    try {
        return JSON.parse(readFileSync(statsPath, 'utf-8')) as WordStats;
    } catch {
        return null;
    }
}

/**
 * Atomically read-modify-write stats for a specific word/day.
 */
export async function updateWordStats(
    langCode: string,
    dayIdx: number,
    won: boolean,
    attempts: number,
): Promise<void> {
    const statsDir = join(WORD_STATS_DIR, langCode);
    const statsPath = join(statsDir, `${dayIdx}.json`);
    mkdirSync(statsDir, { recursive: true });

    // Use proper-lockfile for atomic updates
    let lockfile: typeof import('proper-lockfile');
    try {
        lockfile = await import('proper-lockfile');
    } catch {
        // Fallback: write without locking
        _writeStats(statsPath, won, attempts);
        return;
    }

    const lockPath = statsPath + '.lock';
    // Ensure lock target exists
    if (!existsSync(statsPath)) {
        writeFileSync(statsPath, '{}', 'utf-8');
    }

    let release: (() => Promise<void>) | undefined;
    try {
        release = await lockfile.lock(statsPath, {
            stale: 10000,
            retries: 0,
        });
    } catch {
        // Another process holds the lock; skip this update
        return;
    }

    try {
        _writeStats(statsPath, won, attempts);
    } finally {
        if (release) await release();
    }
}

function _writeStats(statsPath: string, won: boolean, attempts: number): void {
    let stats: WordStats;
    try {
        if (existsSync(statsPath)) {
            const raw = readFileSync(statsPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed.total) {
                stats = parsed;
            } else {
                stats = newStats();
            }
        } else {
            stats = newStats();
        }
    } catch {
        stats = newStats();
    }

    stats.total += 1;
    if (won) {
        stats.wins += 1;
        if (typeof attempts === 'number' && attempts >= 1 && attempts <= 6) {
            stats.distribution[String(attempts)] =
                (stats.distribution[String(attempts)] || 0) + 1;
        }
    } else {
        stats.losses += 1;
    }

    writeFileSync(statsPath, JSON.stringify(stats), 'utf-8');
}

function newStats(): WordStats {
    return {
        total: 0,
        wins: 0,
        losses: 0,
        distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 },
    };
}

/**
 * Check and update dedup state. Returns true if this is a duplicate submission.
 */
export function isDuplicateSubmission(
    langCode: string,
    dayIdx: number,
    clientId: string,
    todaysIdx: number,
): boolean {
    // Reset dedup map on new day
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
