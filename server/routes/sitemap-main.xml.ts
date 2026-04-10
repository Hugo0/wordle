import { loadAllData } from '../utils/data-loader';
import { getTodaysIdx } from '../utils/word-selection';
import { getHreflangLanguages, buildHreflangXml } from '../utils/hreflang';

export default defineEventHandler((event) => {
    const data = loadAllData();
    const todaysIdx = getTodaysIdx();
    const base = 'https://wordle.global';
    const hubTotalPages = todaysIdx > 0 ? Math.ceil(todaysIdx / 30) : 1;
    const sortedLangs = Object.keys(data.languages).sort();

    // Hreflang entries (filtered + remapped for Google compatibility)
    const hreflangLangs = getHreflangLanguages(sortedLangs);

    /** Build a <url> block with hreflang annotations for a language-variant group */
    function langUrl(pathSuffix: string, changefreq: string, priority: string): string[] {
        const hreflangLines = buildHreflangXml(hreflangLangs, pathSuffix);
        return sortedLangs.map(
            (lc) =>
                `  <url>\n    <loc>${base}/${lc}${pathSuffix}</loc>\n${hreflangLines.join('\n')}\n    <changefreq>${changefreq}</changefreq><priority>${priority}</priority>\n  </url>`
        );
    }

    const urls: string[] = [];

    // Homepage — the x-default in the root language group. Language pages'
    // hreflang blocks point here as x-default, making the relationship reciprocal.
    // This lets Google swap / → /de for German users searching "wordle".
    const homepageHreflang = buildHreflangXml(hreflangLangs, '');
    urls.push(
        `  <url>\n    <loc>${base}/</loc>\n${homepageHreflang.join('\n')}\n    <changefreq>daily</changefreq><priority>1.0</priority>\n  </url>`
    );

    // Static pages (no hreflang — not localized)
    urls.push(
        `  <url><loc>${base}/stats</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`
    );
    urls.push(
        `  <url><loc>${base}/accessibility</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>`
    );

    // Language pages + game modes (with hreflang)
    const gameModes = [
        'unlimited',
        'speed',
        'dordle',
        'quordle',
        'octordle',
        'sedecordle',
        'duotrigordle',
    ];

    urls.push(...langUrl('', 'daily', '0.9'));
    for (const mode of gameModes) {
        urls.push(...langUrl(`/${mode}`, 'weekly', '0.7'));
    }

    // Semantic Explorer (English-only for v1 — no hreflang)
    urls.push(
        `  <url><loc>${base}/en/semantic</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
    );

    // Strategy pages (with hreflang)
    urls.push(...langUrl('/best-starting-words', 'monthly', '0.6'));

    // Archive pages (paginated — only page 1 gets hreflang, pagination variants don't)
    const archiveHreflang = buildHreflangXml(hreflangLangs, '/archive');
    for (const lc of sortedLangs) {
        for (let page = 1; page <= hubTotalPages; page++) {
            const pageParam = page > 1 ? `?page=${page}` : '';
            if (page === 1) {
                urls.push(
                    `  <url>\n    <loc>${base}/${lc}/archive</loc>\n${archiveHreflang.join('\n')}\n    <changefreq>daily</changefreq><priority>0.5</priority>\n  </url>`
                );
            } else {
                urls.push(
                    `  <url><loc>${base}/${lc}/archive${pageParam}</loc><changefreq>daily</changefreq><priority>0.5</priority></url>`
                );
            }
        }
    }

    setResponseHeader(event, 'Content-Type', 'application/xml');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
});
