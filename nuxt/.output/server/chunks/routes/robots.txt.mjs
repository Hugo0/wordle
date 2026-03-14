import { d as defineEventHandler, s as setResponseHeader } from '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const robots_txt = defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "text/plain");
  return `User-agent: *
Allow: /
Disallow: /*/api/

Sitemap: https://wordle.global/sitemap.xml
`;
});

export { robots_txt as default };
//# sourceMappingURL=robots.txt.mjs.map
