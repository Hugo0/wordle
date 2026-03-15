export default defineEventHandler((event) => {
    setResponseHeader(event, 'Content-Type', 'text/plain');
    return `User-agent: *
Allow: /
Disallow: /*/api/

Sitemap: https://wordle.global/sitemap.xml
`;
});
