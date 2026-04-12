/**
 * Wiktionary existence probe.
 *
 * DB-cached HEAD request to Wiktionary. Used by the word page
 * to conditionally render the "Wiktionary" link.
 */

import { dedup } from './inflight';
import { getWiktLang } from './word-selection';

/**
 * Check whether Wiktionary has an entry for `word` in the given language.
 * Returns `true` / `false` for cached/probed lookups, `null` on network error.
 */
export async function checkWiktionaryExists(
    word: string,
    langCode: string
): Promise<boolean | null> {
    // DB cache
    try {
        const { getWiktionaryExists } = await import('./db-cache');
        const dbResult = await getWiktionaryExists(langCode, word);
        if (dbResult !== null) return dbResult;
    } catch {
        // DB unavailable — fall through to HEAD request
    }

    // HEAD request to Wiktionary, deduplicated
    return dedup('wiktionary', `${langCode}:${word}`, async () => {
        const wiktLang = getWiktLang(langCode);
        const url = `https://${wiktLang}.wiktionary.org/wiki/${encodeURIComponent(word)}`;

        try {
            const resp = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(3000),
                redirect: 'manual',
            });
            const exists = resp.status === 200 || (resp.status >= 300 && resp.status < 400);

            try {
                const { setWiktionaryExists } = await import('./db-cache');
                setWiktionaryExists(langCode, word, exists);
            } catch {
                /* non-fatal */
            }

            return exists;
        } catch {
            return null;
        }
    });
}
