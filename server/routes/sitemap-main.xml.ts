import { loadAllData } from '../utils/data-loader';
import { getTodaysIdx } from '../utils/word-selection';

export default defineEventHandler((event) => {
    const data = loadAllData();
    const todaysIdx = getTodaysIdx();
    const base = 'https://wordle.global';
    const hubTotalPages = todaysIdx > 0 ? Math.ceil(todaysIdx / 30) : 1;

    const urls: string[] = [];

    // Homepage
    urls.push(
        `  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`
    );

    // Static pages
    urls.push(
        `  <url><loc>${base}/stats</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`
    );
    urls.push(
        `  <url><loc>${base}/accessibility</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>`
    );

    // Language pages + game modes
    const gameModes = [
        'unlimited',
        'speed',
        'dordle',
        'quordle',
        'octordle',
        'sedecordle',
        'duotrigordle',
    ];
    for (const lc of Object.keys(data.languages).sort()) {
        urls.push(
            `  <url><loc>${base}/${lc}</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`
        );
        for (const mode of gameModes) {
            urls.push(
                `  <url><loc>${base}/${lc}/${mode}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`
            );
        }
    }

    // Semantic Explorer (English-only for v1)
    urls.push(
        `  <url><loc>${base}/en/semantic</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
    );

    // Strategy pages (best starting words)
    for (const lc of Object.keys(data.languages).sort()) {
        urls.push(
            `  <url><loc>${base}/${lc}/best-starting-words</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`
        );
    }

    // Words hub pages (paginated)
    for (const lc of Object.keys(data.languages).sort()) {
        for (let page = 1; page <= hubTotalPages; page++) {
            const pageParam = page > 1 ? `?page=${page}` : '';
            urls.push(
                `  <url><loc>${base}/${lc}/words${pageParam}</loc><changefreq>daily</changefreq><priority>0.5</priority></url>`
            );
        }
    }

    setResponseHeader(event, 'Content-Type', 'application/xml');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
});
