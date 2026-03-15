/**
 * Daily word selection algorithm.
 *
 * Two algorithms:
 * - Legacy (day_idx <= MIGRATION_DAY_IDX): shuffle + modulo from pre-shuffled list
 * - Consistent hash (day_idx > MIGRATION_DAY_IDX): SHA-256 ring-based selection
 *
 * Selection hierarchy for post-migration days:
 * 1. Frozen history (words.json history field) — pinned past words
 * 2. Consistent hash with 60-day recency filter
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { MIGRATION_DAY_IDX, WORD_HISTORY_DIR, loadAllData } from './data-loader';

// Re-export day index functions so existing consumers don't need to change imports
export { getTodaysIdx, idxToDate } from '../lib/day-index';
import { getTodaysIdx } from '../lib/day-index';

const RECENCY_WINDOW = 60;
const EMPTY_SET: Set<string> = new Set();

// Cache of precomputed hash rings per language
const _hashRingCache = new Map<string, [bigint, string][]>();

// ---------------------------------------------------------------------------
// Hash functions
// ---------------------------------------------------------------------------

function wordHash(word: string, langCode: string): bigint {
    const h = createHash('sha256').update(`${langCode}:${word}`).digest();
    return h.readBigUInt64BE(0);
}

function dayHash(dayIdx: number, langCode: string): bigint {
    const h = createHash('sha256').update(`${langCode}:day:${dayIdx}`).digest();
    return h.readBigUInt64BE(0);
}

// ---------------------------------------------------------------------------
// Hash ring helpers
// ---------------------------------------------------------------------------

/**
 * Get or build the sorted hash ring for a language's daily word pool.
 * Cached after first computation — word hashes are stable.
 */
function getHashRing(words: string[], langCode: string): [bigint, string][] {
    const key = langCode;
    let ring = _hashRingCache.get(key);
    if (!ring) {
        ring = words.map((w) => [wordHash(w, langCode), w] as [bigint, string]);
        ring.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        _hashRingCache.set(key, ring);
    }
    return ring;
}

/**
 * Pick the nearest word on the hash ring >= dayH, skipping excluded words.
 */
function ringSelect(ring: [bigint, string][], dayH: bigint, exclude: Set<string>): string | null {
    let firstValid: string | null = null;
    for (const [wh, word] of ring) {
        if (exclude.has(word)) continue;
        if (firstValid === null) firstValid = word;
        if (wh >= dayH) return word;
    }
    return firstValid; // wraparound, or null if all excluded
}

// ---------------------------------------------------------------------------
// Word selection algorithms
// ---------------------------------------------------------------------------

/**
 * Select daily word using consistent hashing (post-migration algorithm).
 */
export function getDailyWordConsistentHash(
    words: string[],
    exclude: Set<string>,
    dayIdx: number,
    langCode: string,
): string {
    const ring = getHashRing(words, langCode);
    const dayH = dayHash(dayIdx, langCode);

    const word = ringSelect(ring, dayH, exclude);
    if (word) return word;

    // All words excluded by recency — fall back ignoring exclusions
    const fallback = ringSelect(ring, dayH, EMPTY_SET);
    return fallback || words[0] || '';
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

    for (let offset = 0; offset < listLen; offset++) {
        const idx = (dayIdx + offset) % listLen;
        const word = words[idx]!;
        if (!blocklist.has(word)) return word;
    }

    return words[dayIdx % listLen]!;
}

// ---------------------------------------------------------------------------
// Main word selection (with history lookup and recency filtering)
// ---------------------------------------------------------------------------

function computeWordForDay(langCode: string, dayIdx: number): string {
    const data = loadAllData();
    const wordList = data.wordLists[langCode]!;
    const dailyWords = data.dailyWords[langCode];
    const blocklist = data.blocklists[langCode]!;
    const history = data.wordHistory[langCode];

    // Legacy algorithm for pre-migration days
    if (dayIdx <= MIGRATION_DAY_IDX) {
        return getDailyWordLegacy(wordList, EMPTY_SET, dayIdx);
    }

    // Check frozen history first (pinned past words from words.json)
    if (history && history.has(dayIdx)) {
        return history.get(dayIdx)!;
    }

    // Build recency exclusion set from history
    const exclude = new Set<string>(blocklist);
    if (history) {
        for (let d = dayIdx - RECENCY_WINDOW; d < dayIdx; d++) {
            const w = history.get(d);
            if (w) exclude.add(w);
        }
    }

    const pool = dailyWords && dailyWords.length > 0 ? dailyWords : wordList;
    return getDailyWordConsistentHash(pool, exclude, dayIdx, langCode);
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
