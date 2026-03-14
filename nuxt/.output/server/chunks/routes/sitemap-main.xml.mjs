import { d as defineEventHandler, s as setResponseHeader } from '../nitro/nitro.mjs';
import { l as loadAllData } from '../_/data-loader.mjs';
import { g as getTodaysIdx } from '../_/word-selection.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'fs';
import 'path';
import 'crypto';

const sitemapMain_xml = defineEventHandler((event) => {
  const data = loadAllData();
  const todaysIdx = getTodaysIdx();
  const base = "https://wordle.global";
  const hubTotalPages = todaysIdx > 0 ? Math.ceil(todaysIdx / 30) : 1;
  const urls = [];
  urls.push(`  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);
  for (const lc of Object.keys(data.languages).sort()) {
    urls.push(
      `  <url><loc>${base}/${lc}</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`
    );
  }
  for (const lc of Object.keys(data.languages).sort()) {
    for (let page = 1; page <= hubTotalPages; page++) {
      const pageParam = page > 1 ? `?page=${page}` : "";
      urls.push(
        `  <url><loc>${base}/${lc}/words${pageParam}</loc><changefreq>daily</changefreq><priority>0.5</priority></url>`
      );
    }
  }
  setResponseHeader(event, "Content-Type", "application/xml");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
});

export { sitemapMain_xml as default };
//# sourceMappingURL=sitemap-main.xml.mjs.map
