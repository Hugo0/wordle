import { d as defineEventHandler, s as setResponseHeader } from '../nitro/nitro.mjs';
import { l as loadAllData } from '../_/data-loader.mjs';
import { g as getTodaysIdx, i as idxToDate } from '../_/word-selection.mjs';
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

const sitemap_xml = defineEventHandler((event) => {
  const data = loadAllData();
  const todaysIdx = getTodaysIdx();
  const todayStr = idxToDate(todaysIdx).toISOString().slice(0, 10);
  const sortedLangs = [...data.languageCodes].sort();
  const base = "https://wordle.global";
  const sitemaps = [
    `  <sitemap><loc>${base}/sitemap-main.xml</loc><lastmod>${todayStr}</lastmod></sitemap>`,
    ...sortedLangs.map(
      (lc) => `  <sitemap><loc>${base}/sitemap-words-${lc}.xml</loc><lastmod>${todayStr}</lastmod></sitemap>`
    )
  ];
  setResponseHeader(event, "Content-Type", "application/xml");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>`;
});

export { sitemap_xml as default };
//# sourceMappingURL=sitemap.xml.mjs.map
