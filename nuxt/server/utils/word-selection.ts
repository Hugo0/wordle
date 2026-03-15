/**
 * Daily word selection algorithm — port of webapp/app.py word selection.
 *
 * Two algorithms:
 * - Legacy (day_idx <= MIGRATION_DAY_IDX): shuffle + modulo from pre-shuffled list
 * - Consistent hash (day_idx > MIGRATION_DAY_IDX): SHA-256 ring-based selection
 *
 * Three-tier selection hierarchy:
 * 1. Curated schedule (ordered list for specific days)
 * 2. Daily words (curated high-quality words, consistent hash)
 * 3. Main word list with blocklist filtering (consistent hash)
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { MIGRATION_DAY_IDX, WORD_HISTORY_DIR, loadAllData } from './data-loader';

// Re-export day index functions so existing consumers don't need to change imports
export { getTodaysIdx, idxToDate } from '../lib/day-index';
import { getTodaysIdx } from '../lib/day-index';

// ---------------------------------------------------------------------------
// Hash functions
// ---------------------------------------------------------------------------

/**
 * Get a stable hash for a word. Doesn't change if the word list changes.
 */
function wordHash(word: string, langCode: string): bigint {
    const h = createHash('sha256')
        .update(`${langCode}:${word}`)
        .digest();
    return h.readBigUInt64BE(0);
}

/**
 * Get a deterministic hash for a specific day.
 */
function dayHash(dayIdx: number, langCode: string): bigint {
    const h = createHash('sha256')
        .update(`${langCode}:day:${dayIdx}`)
        .digest();
    return h.readBigUInt64BE(0);
}

// ---------------------------------------------------------------------------
// Word selection algorithms
// ---------------------------------------------------------------------------

/**
 * Select daily word using consistent hashing (post-migration algorithm).
 *
 * Each word has a fixed hash. Each day has a fixed hash.
 * We pick the word whose hash is closest to (>=) the day's hash on the ring.
 * Blocklisted words are simply excluded from consideration.
 */
export function getDailyWordConsistentHash(
    words: string[],
    blocklist: Set<string>,
    dayIdx: number,
    langCode: string,
): string {
    const dayH = dayHash(dayIdx, langCode);

    // Build sorted list of (hash, word) for non-blocked words
    const candidates: [bigint, string][] = [];
    for (const word of words) {
        if (!blocklist.has(word)) {
            candidates.push([wordHash(word, langCode), word]);
        }
    }

    if (candidates.length === 0) {
        return words[0] || '';
    }

    candidates.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    // Find first word with hash >= day_hash (consistent hashing ring)
    for (const [wh, word] of candidates) {
        if (wh >= dayH) return word;
    }

    // Wraparound: day_hash is larger than all word hashes, pick first
    return candidates[0]![1];
}

/**
 * Legacy word selection using shuffle + modulo (pre-migration algorithm).
 * The word list must already be pre-shuffled with Python's random.seed(42).
 */
export function getDailyWordLegacy(
    words: string[],
    blocklist: Set<string>,
    dayIdx: number,
): string {
    const listLen = words.length;

    if (blocklist.size === 0) {
        return words[dayIdx % listLen]!;
    }

    // Skip blocked words by walking forward
    for (let offset = 0; offset < listLen; offset++) {
        const idx = (dayIdx + offset) % listLen;
        const word = words[idx]!;
        if (!blocklist.has(word)) return word;
    }

    return words[dayIdx % listLen]!;
}

// ---------------------------------------------------------------------------
// Main word selection (3-tier with caching)
// ---------------------------------------------------------------------------

/**
 * Compute the daily word from word lists (no caching).
 */
function computeWordForDay(langCode: string, dayIdx: number): string {
    const data = loadAllData();
    const wordList = data.wordLists[langCode]!;
    const blocklist = data.blocklists[langCode]!;
    const dailyWords = data.dailyWords[langCode];
    const curatedSchedule = data.curatedSchedules[langCode];

    if (dayIdx <= MIGRATION_DAY_IDX) {
        return getDailyWordLegacy(wordList, new Set(), dayIdx);
    }

    const scheduleIdx = dayIdx - MIGRATION_DAY_IDX - 1;
    if (curatedSchedule && scheduleIdx < curatedSchedule.length) {
        return curatedSchedule[scheduleIdx]!;
    }
    if (dailyWords) {
        return getDailyWordConsistentHash(dailyWords, new Set(), dayIdx, langCode);
    }
    return getDailyWordConsistentHash(wordList, blocklist, dayIdx, langCode);
}

/**
 * Get the daily word for a specific language and day index.
 *
 * Once a word is computed for a past day, it's cached to disk so future
 * word list changes can never alter historical daily words.
 */
export function getWordForDay(langCode: string, dayIdx: number): string {
    // Check disk cache first
    const cachePath = join(WORD_HISTORY_DIR, langCode, `${dayIdx}.txt`);
    if (existsSync(cachePath)) {
        try {
            const cached = readFileSync(cachePath, 'utf-8').trim();
            if (cached) return cached;
        } catch {
            // Fall through to recompute
        }
    }

    const word = computeWordForDay(langCode, dayIdx);

    // Cache past/current days (not future)
    const todaysIdx = getTodaysIdx();
    if (dayIdx <= todaysIdx) {
        const langDir = join(WORD_HISTORY_DIR, langCode);
        mkdirSync(langDir, { recursive: true });
        const tmpPath = cachePath + '.tmp';
        try {
            writeFileSync(tmpPath, word, 'utf-8');
            renameSync(tmpPath, cachePath);
        } catch {
            // Non-critical
        }
    }

    return word;
}
