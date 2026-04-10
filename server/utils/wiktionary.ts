/**
 * Wiktionary existence probe.
 *
 * Performs a cached HEAD request to `https://<lang>.wiktionary.org/wiki/<word>`
 * to determine whether Wiktionary has an entry for that word. The result
 * lives on disk at `word-defs/wiktionary-exists/<lang>/<word>.json` forever
 * — if Wiktionary had the entry yesterday it will almost certainly have it
 * tomorrow, and the opposite is true for cached non-existence.
 *
 * Used by the word page to conditionally render the "Wiktionary →" link.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getWiktLang } from './word-selection';

const CACHE_DIR = join(process.cwd(), 'word-defs', 'wiktionary-exists');

type ExistsRecord = { exists: boolean; checked_at: number };

function cachePath(langCode: string, word: string): string {
    // Word is already lowercase + regex-validated upstream, but sanitize
    // defensively to avoid writing outside the cache dir.
    const safeWord = word.replace(/[^a-z0-9\-']/g, '_');
    const safeLang = langCode.replace(/[^a-z0-9-]/g, '_');
    return join(CACHE_DIR, safeLang, `${safeWord}.json`);
}

function readCache(langCode: string, word: string): ExistsRecord | null {
    const p = cachePath(langCode, word);
    if (!existsSync(p)) return null;
    try {
        const parsed = JSON.parse(readFileSync(p, 'utf-8'));
        if (typeof parsed?.exists === 'boolean') return parsed as ExistsRecord;
    } catch {
        // corrupt entry — re-fetch
    }
    return null;
}

function writeCache(langCode: string, word: string, exists: boolean): void {
    const p = cachePath(langCode, word);
    try {
        mkdirSync(join(CACHE_DIR, langCode.replace(/[^a-z0-9-]/g, '_')), {
            recursive: true,
        });
        const record: ExistsRecord = { exists, checked_at: Date.now() };
        writeFileSync(p, JSON.stringify(record));
    } catch {
        // non-fatal; next request will re-probe
    }
}

/**
 * Check whether Wiktionary has an entry for `word` in the given language.
 * Returns `true` / `false` deterministically for cached lookups and returns
 * `null` only when the HEAD request itself failed (network error); callers
 * should treat null as "unknown → hide the link conservatively".
 */
export async function checkWiktionaryExists(
    word: string,
    langCode: string
): Promise<boolean | null> {
    const cached = readCache(langCode, word);
    if (cached) return cached.exists;

    const wiktLang = getWiktLang(langCode);
    const url = `https://${wiktLang}.wiktionary.org/wiki/${encodeURIComponent(word)}`;

    try {
        const resp = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000),
            redirect: 'manual',
        });
        // 200 → entry exists. 404 → doesn't exist. 301/302 → redirect, still
        // counts as "exists" because Wiktionary redirects alternate-casing
        // and common misspellings to the canonical entry.
        const exists = resp.status === 200 || (resp.status >= 300 && resp.status < 400);
        writeCache(langCode, word, exists);
        return exists;
    } catch {
        // Network error — don't cache, return null so the caller can
        // fall back to hiding the link without polluting the cache with
        // false negatives.
        return null;
    }
}
