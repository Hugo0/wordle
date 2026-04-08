/**
 * Locale helpers for `Intl.DateTimeFormat` across all supported languages.
 *
 * 73 of our 79 languages work natively with `Intl.DateTimeFormat(langCode)`.
 * The remaining 6 either have no native support or need a regional fallback.
 *
 * Verified against Node 24's Intl on 2026-04-08:
 * - Native support: ar az bg bn br ca ckb cs da de el en eo es et eu fa fi fo
 *   fr fur fy ga gd gl ha he hi hr hu hy ia id ie is it ja ka ko lb lt lv mi
 *   mk mn mr ms nb nds ne nl nn oc pa pl pt ro ru rw sk sl sq sr sv sw tk tr
 *   uk ur uz vi yo
 * - Needs fallback: hyw → hy, la → en, ltg → lv, pau → en, qya → en, tlh → en
 * - Auto-mapped by Intl: tl → fil (no action needed)
 */

const LOCALE_FALLBACKS: Record<string, string> = {
    hyw: 'hy', // Eastern Armenian → Armenian
    la: 'en', // Latin — no native Intl support
    ltg: 'lv', // Latgalian → Latvian
    pau: 'en', // Palauan — no native Intl support
    qya: 'en', // Quenya — constructed language
    tlh: 'en', // Klingon — constructed language
};

/**
 * Resolves one of our internal language codes to a locale string that
 * `Intl.DateTimeFormat` (and friends) can handle without silently returning
 * en-US data for a non-English language.
 */
export function getLocaleForIntl(lang: string): string {
    if (LOCALE_FALLBACKS[lang]) return LOCALE_FALLBACKS[lang];
    try {
        const resolved = new Intl.DateTimeFormat(lang).resolvedOptions().locale;
        // Intl silently falls back to en-US for unknown codes. If we asked for
        // a non-English lang and got en-US, treat it as unsupported.
        if (resolved.startsWith('en-') && lang !== 'en' && !lang.startsWith('en-')) {
            return 'en';
        }
        return lang;
    } catch {
        return 'en';
    }
}

/**
 * Formats a YYYY-MM-DD date string as a long-form date in the given language.
 *
 * Examples:
 * - `formatDateLong('2026-03-22', 'es')` → `"22 de marzo de 2026"`
 * - `formatDateLong('2026-03-22', 'en')` → `"March 22, 2026"`
 * - `formatDateLong('2026-03-22', 'fi')` → `"22. maaliskuuta 2026"`
 * - `formatDateLong('2026-03-22', 'tlh')` → `"March 22, 2026"` (fallback)
 */
export function formatDateLong(dateStr: string | null | undefined, lang: string): string {
    if (!dateStr) return '';
    const dt = new Date(dateStr + 'T00:00:00Z');
    if (Number.isNaN(dt.getTime())) return '';
    const locale = getLocaleForIntl(lang);
    try {
        return dt.toLocaleDateString(locale, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
        });
    } catch {
        return dt.toLocaleDateString('en', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
        });
    }
}
