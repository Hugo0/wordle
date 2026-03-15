import { loadAllData } from '../utils/data-loader';
import { getTodaysIdx, idxToDate } from '../utils/word-selection';

export default defineEventHandler((event) => {
    const data = loadAllData();
    const todaysIdx = getTodaysIdx();
    const todayStr = idxToDate(todaysIdx).toISOString().slice(0, 10);
    const sortedLangs = [...data.languageCodes].sort();
    const base = 'https://wordle.global';

    const sitemaps = [
        `  <sitemap><loc>${base}/sitemap-main.xml</loc><lastmod>${todayStr}</lastmod></sitemap>`,
        ...sortedLangs.map(
            (lc) =>
                `  <sitemap><loc>${base}/sitemap-words-${lc}.xml</loc><lastmod>${todayStr}</lastmod></sitemap>`
        ),
    ];

    setResponseHeader(event, 'Content-Type', 'application/xml');
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join('\n')}
</sitemapindex>`;
});
