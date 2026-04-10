import { loadAllData } from '../utils/data-loader';
import {
    getTodaysIdx,
    idxToDate,
    iterateHistoricalWords,
} from '../utils/word-selection';

/**
 * Per-language sitemap of historical daily words. URLs are keyed by word
 * name (canonical); legacy numeric URLs still resolve at the page level but
 * aren't indexed. The reverse-index walk is O(days) on warm cache and
 * cached globally, so repeat requests are served from memory.
 */
export default defineEventHandler((event) => {
    const lang = getRouterParam(event, 'lang')!;
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Not found' });
    }

    const todaysIdx = getTodaysIdx();
    const base = 'https://wordle.global';
    const entries = iterateHistoricalWords(lang);

    const urls = entries.map(({ dayIdx, word }) => {
        const dDate = idxToDate(dayIdx).toISOString().slice(0, 10);
        const ageRatio = (todaysIdx - dayIdx) / Math.max(todaysIdx, 1);
        const priority = Math.round(Math.max(0.3, 1.0 - ageRatio * 0.7) * 10) / 10;
        return `  <url><loc>${base}/${lang}/word/${encodeURIComponent(word)}</loc><lastmod>${dDate}</lastmod><priority>${priority}</priority></url>`;
    });

    setResponseHeader(event, 'Content-Type', 'application/xml');
    setResponseHeader(event, 'Cache-Control', 'public, max-age=3600');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
});
