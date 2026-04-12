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
    langCode: string
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
    dayIdx: number
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
    if (!pool || pool.length === 0) {
        throw new Error(
            `[word-selection] Empty word pool for language "${langCode}" on day ${dayIdx}`
        );
    }
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

// ---------------------------------------------------------------------------
// Reverse lookup: word → day index
// ---------------------------------------------------------------------------
//
// Lazy per-language inverted index (word → earliest dayIdx). First call
// walks historical days once; subsequent days are incrementally appended
// when `todaysIdx` advances, so the midnight rollover only pays for new
// days, not a full rebuild.

type ReverseIndex = {
    built: number;
    map: Map<string, number>;
};
const _reverseIndexCache = new Map<string, ReverseIndex>();

function ensureReverseIndex(langCode: string): ReverseIndex {
    const todaysIdx = getTodaysIdx();
    let cached = _reverseIndexCache.get(langCode);
    if (!cached) {
        cached = { built: 0, map: new Map<string, number>() };
        _reverseIndexCache.set(langCode, cached);
    }
    if (cached.built < todaysIdx) {
        for (let d = cached.built + 1; d <= todaysIdx; d++) {
            const w = getWordForDay(langCode, d);
            // Keep the first occurrence — if a word repeats, the earliest
            // day wins so the canonical URL is stable.
            if (w && !cached.map.has(w)) cached.map.set(w, d);
        }
        cached.built = todaysIdx;
    }
    return cached;
}

export function getDayForWord(langCode: string, word: string): number | null {
    return ensureReverseIndex(langCode).map.get(word.toLowerCase()) ?? null;
}

/** Iterate every (dayIdx, word) pair in reverse chronological order.
 *  Used by the sitemap to emit URLs without making ~300 disk reads per
 *  request. */
export function iterateHistoricalWords(langCode: string): Array<{ dayIdx: number; word: string }> {
    const idx = ensureReverseIndex(langCode);
    const entries = Array.from(idx.map.entries()).map(([word, dayIdx]) => ({
        dayIdx,
        word,
    }));
    entries.sort((a, b) => b.dayIdx - a.dayIdx);
    return entries;
}

// ---------------------------------------------------------------------------
// Slug resolution (shared between /api/[lang]/word/[slug] and word-explore)
// ---------------------------------------------------------------------------

const NUMERIC_SLUG_RE = /^\d+$/;
// Word-name slug: Unicode-aware for non-English languages, length-bounded
// so an absurdly long URL gets a 400 not a deep vocab lookup.
const WORD_SLUG_RE = /^[\p{L}\p{M}\p{N}\-']{1,40}$/u;

export type ResolvedSlug =
    | { kind: 'numeric'; dayIdx: number; word: string | null }
    | { kind: 'word'; word: string; dayIdx: number | null }
    | { kind: 'invalid' };

/** Resolve a URL slug to a (word, dayIdx) pair. Numeric slugs look up the
 *  word via `getWordForDay`; word slugs look up the day via the reverse
 *  index. Returns `kind: 'invalid'` for ill-formed slugs so callers can
 *  decide the status code. */
export function resolveWordSlug(langCode: string, slug: string): ResolvedSlug {
    if (NUMERIC_SLUG_RE.test(slug)) {
        const dayIdx = parseInt(slug, 10);
        if (dayIdx < 1) return { kind: 'invalid' };
        const todaysIdx = getTodaysIdx();
        const word = dayIdx <= todaysIdx ? getWordForDay(langCode, dayIdx) : null;
        return { kind: 'numeric', dayIdx, word };
    }
    const lower = slug.toLowerCase();
    if (!WORD_SLUG_RE.test(lower)) return { kind: 'invalid' };
    return { kind: 'word', word: lower, dayIdx: getDayForWord(langCode, lower) };
}

// ---------------------------------------------------------------------------
// Wiktionary language code mapping — shared by the word detail API and the
// definitions module (which builds Wiktionary URLs).
// ---------------------------------------------------------------------------

const WIKT_LANG_MAP: Record<string, string> = {
    zh: 'zh',
    'zh-tw': 'zh',
    pt: 'pt',
    'pt-br': 'pt',
    nb: 'no',
    nn: 'no',
    sr: 'sr',
    'sr-latn': 'sr',
    ckb: 'ku',
    gd: 'gd',
    mi: 'mi',
    hyw: 'hy',
};

export function getWiktLang(langCode: string): string {
    if (WIKT_LANG_MAP[langCode]) return WIKT_LANG_MAP[langCode]!;
    return langCode.length > 2 ? langCode.slice(0, 2) : langCode;
}

/**
 * Get N distinct daily words for multi-board modes (Dordle, Quordle, etc.)
 * and daily speed streak.
 *
 * Each mode passes a `modeOffset` so its words are drawn from a different
 * region of the slot space — modes no longer share words by default.
 * Within a mode, boards 1-N use high slot offsets to ensure unique words.
 * If a collision occurs (same word for two boards), probes forward.
 */
const MULTI_BOARD_SLOT_OFFSET = 100_000;

/**
 * Per-mode offsets so different game modes don't share the same daily words.
 * Values are large primes, spread far enough apart to avoid accidental
 * overlap with MULTI_BOARD_SLOT_OFFSET * boardCount ranges.
 */
export const MODE_SLOT_OFFSETS: Record<string, number> = {
    classic: 0,
    dordle: 7_000_003,
    quordle: 14_000_029,
    octordle: 21_000_047,
    sedecordle: 28_000_069,
    duotrigordle: 35_000_081,
    speed: 42_000_101,
};

export function getWordsForDay(
    langCode: string,
    todaysIdx: number,
    count: number,
    mode: string = 'classic'
): string[] {
    const modeOffset = MODE_SLOT_OFFSETS[mode] ?? 0;
    const baseIdx = todaysIdx + modeOffset;

    const words: string[] = [];
    const used = new Set<string>();

    for (let i = 0; i < count; i++) {
        const slotIdx = i === 0 ? baseIdx : baseIdx + i * MULTI_BOARD_SLOT_OFFSET;
        let word = getWordForDay(langCode, slotIdx);

        // Dedup: probe forward if collision (bounded to prevent infinite loop)
        let probe = 1;
        const MAX_PROBE = 1000;
        while (used.has(word) && probe < MAX_PROBE) {
            word = getWordForDay(langCode, slotIdx + probe);
            probe++;
        }

        used.add(word);
        words.push(word);
    }

    return words;
}
