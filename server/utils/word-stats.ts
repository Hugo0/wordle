/**
 * Anonymous word stats collection.
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
 * Load stats for a specific word/day. DB-first, disk fallback.
 */
export async function loadWordStats(langCode: string, dayIdx: number): Promise<WordStats | null> {
    // Try DB first
    try {
        const { getWordStats } = await import('./db-cache');
        const dbStats = await getWordStats(langCode, dayIdx);
        if (dbStats) return dbStats;
    } catch {
        // DB unavailable — fall through to disk
    }

    // DEPRECATED: disk fallback — remove after confirming DB migration is stable
    const statsPath = join(WORD_STATS_DIR, langCode, `${dayIdx}.json`);
    if (!existsSync(statsPath)) return null;
    console.warn('[DEPRECATED] word-stats disk read for', langCode, dayIdx);
    try {
        return JSON.parse(readFileSync(statsPath, 'utf-8')) as WordStats;
    } catch {
        return null;
    }
}

/**
 * Atomically update stats for a specific word/day.
 * DB-first (atomic SQL increment, no lockfile needed), disk fallback.
 */
export async function updateWordStats(
    langCode: string,
    dayIdx: number,
    won: boolean,
    attempts: number
): Promise<void> {
    // Primary: DB atomic increment (no read-modify-write, no lockfile)
    try {
        const { incrementWordStats } = await import('./db-cache');
        const ok = await incrementWordStats(langCode, dayIdx, won, attempts);
        if (ok) return; // DB write succeeded — no disk write needed
        // DB write failed — fall through to disk
    } catch {
        // DB module unavailable — fall through to disk
    }

    // DEPRECATED: disk with lockfile — remove after confirming DB migration is stable
    console.warn('[DEPRECATED] word-stats disk write fallback hit for', langCode, dayIdx);
    const statsDir = join(WORD_STATS_DIR, langCode);
    const statsPath = join(statsDir, `${dayIdx}.json`);
    mkdirSync(statsDir, { recursive: true });

    let lockfile: typeof import('proper-lockfile');
    try {
        lockfile = await import('proper-lockfile');
    } catch {
        _writeStats(statsPath, won, attempts);
        return;
    }

    if (!existsSync(statsPath)) {
        writeFileSync(statsPath, '{}', 'utf-8');
    }

    let release: (() => Promise<void>) | undefined;
    try {
        release = await lockfile.lock(statsPath, { stale: 10000, retries: 0 });
    } catch {
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
            stats.distribution[String(attempts)] = (stats.distribution[String(attempts)] || 0) + 1;
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
    todaysIdx: number
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
