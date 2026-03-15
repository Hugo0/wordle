import { loadAllData } from '../utils/data-loader';
import { getTodaysIdx, idxToDate } from '../utils/word-selection';

export default defineEventHandler((event) => {
    const lang = getRouterParam(event, 'lang')!;
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Not found' });
    }

    const todaysIdx = getTodaysIdx();
    const base = 'https://wordle.global';

    const urls: string[] = [];
    for (let dIdx = todaysIdx; dIdx >= 1; dIdx--) {
        const dDate = idxToDate(dIdx).toISOString().slice(0, 10);
        const ageRatio = (todaysIdx - dIdx) / Math.max(todaysIdx, 1);
        const priority = Math.round(Math.max(0.3, 1.0 - ageRatio * 0.7) * 10) / 10;
        urls.push(
            `  <url><loc>${base}/${lang}/word/${dIdx}</loc><lastmod>${dDate}</lastmod><priority>${priority}</priority></url>`,
        );
    }

    setResponseHeader(event, 'Content-Type', 'application/xml');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
});
