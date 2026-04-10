/**
 * Inverse of buildStatsKey() from utils/game-modes.ts.
 *
 * Decomposes localStorage stats keys into their constituent parts.
 * Key formats (from buildStatsKey):
 *   "en"                  → classic daily 5-letter
 *   "en_unlimited"        → classic unlimited (legacy — no longer produced)
 *   "en_dordle"           → dordle unlimited
 *   "en_dordle_daily"     → dordle daily 5-letter
 *   "en_dordle_6_daily"   → dordle daily 6-letter
 *   "en_dordle_6"         → dordle unlimited 6-letter
 */
export interface ParsedStatsKey {
    lang: string;
    mode: string;
    playType: 'daily' | 'unlimited';
}

export function parseStatsKey(key: string): ParsedStatsKey {
    // Bare language code = classic daily
    if (!key.includes('_')) {
        return { lang: key, mode: 'classic', playType: 'daily' };
    }

    // "en_unlimited" = classic unlimited (legacy key — buildStatsKey no longer
    // produces this, but old localStorage entries may still have it)
    if (key.endsWith('_unlimited')) {
        return {
            lang: key.slice(0, key.indexOf('_')),
            mode: 'classic',
            playType: 'unlimited',
        };
    }

    // "_daily" suffix = daily mode
    // e.g. "en_dordle_daily" or "en_dordle_6_daily"
    if (key.endsWith('_daily')) {
        // Strip _daily, then parse "{lang}_{mode}" or "{lang}_{mode}_{wordLength}"
        const base = key.slice(0, -6); // remove "_daily"
        const parts = base.split('_');
        const lang = parts[0]!;
        // If last part is a number, it's the word length — strip it
        const lastPart = parts[parts.length - 1]!;
        const mode = /^\d+$/.test(lastPart)
            ? parts.slice(1, -1).join('_')
            : parts.slice(1).join('_');
        return { lang, mode: mode || 'classic', playType: 'daily' };
    }

    // Remaining: "{lang}_{mode}" or "{lang}_{mode}_{wordLength}"
    // All are unlimited play type
    const parts = key.split('_');
    const lang = parts[0]!;
    // If last part is a number, it's the word length — strip it
    const lastPart = parts[parts.length - 1]!;
    const mode = /^\d+$/.test(lastPart)
        ? parts.slice(1, -1).join('_')
        : parts.slice(1).join('_');

    return { lang, mode: mode || 'classic', playType: 'unlimited' };
}
