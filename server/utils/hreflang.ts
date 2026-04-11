/**
 * Hreflang utilities for sitemap XML generation.
 *
 * Centralizes language code filtering, remapping, and XML generation
 * so sitemaps emit correct hreflang annotations for Google Search.
 *
 * Why sitemap-based instead of HTML <link> tags:
 * - 79 languages = 80 link tags per page (Google recommends sitemap for >20)
 * - Sitemap is authoritative and doesn't bloat page HTML
 * - Easier to maintain in one place vs scattered across 9+ page files
 */

const BASE = 'https://wordle.global';

/**
 * Codes Google cannot process — no valid ISO 639-1 / BCP-47 tag that
 * Google Search recognizes. These pages still get indexed via sitemap;
 * they just don't participate in hreflang language-swapping.
 */
const HREFLANG_EXCLUDE = new Set([
    'nds', // Low German — no ISO 639-1
    'fur', // Friulian — no ISO 639-1
    'tlh', // Klingon — fictional
    'qya', // Quenya — fictional
    'pau', // Palauan — not recognized by Google
    'hyw', // Western Armenian — conflicts with /hy (Eastern Armenian)
    'ltg', // Latgalian — conflicts with /lv (Latvian)
]);

/**
 * Codes where the internal directory name differs from the Google-recognized
 * BCP-47 tag. Only safe when the target tag has no existing page.
 */
const HREFLANG_REMAP: Record<string, string> = {
    ckb: 'ku', // Central Kurdish → Kurdish (no /ku page exists)
};

export interface HreflangEntry {
    /** Internal language code (matches directory name and URL path) */
    code: string;
    /** BCP-47 tag for the hreflang attribute (what Google sees) */
    tag: string;
}

/**
 * Filter and remap language codes for hreflang.
 * Returns entries with both the internal code (for URLs) and the
 * Google-recognized tag (for the hreflang attribute).
 */
export function getHreflangLanguages(allCodes: string[]): HreflangEntry[] {
    return allCodes
        .filter((code) => !HREFLANG_EXCLUDE.has(code))
        .map((code) => ({
            code,
            tag: HREFLANG_REMAP[code] ?? code,
        }));
}

/**
 * Build xhtml:link XML lines for a set of language variants.
 * Intended to be embedded inside a <url> block in sitemap XML.
 *
 * @param languages - Output of getHreflangLanguages()
 * @param pathSuffix - Path after the language code (e.g. '', '/unlimited', '/words')
 * @returns Array of XML strings, one per link + x-default
 */
export function buildHreflangXml(languages: HreflangEntry[], pathSuffix: string): string[] {
    const lines = languages.map(
        ({ code, tag }) =>
            `    <xhtml:link rel="alternate" hreflang="${tag}" href="${BASE}/${code}${pathSuffix}"/>`
    );

    // x-default: for root language pages, point to the homepage (language picker
    // with Accept-Language detection). For sub-pages (modes, archives, etc.),
    // point to the English version since there's no language-neutral equivalent.
    const xDefaultHref = pathSuffix === '' ? `${BASE}/` : `${BASE}/en${pathSuffix}`;
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultHref}"/>`);

    return lines;
}
