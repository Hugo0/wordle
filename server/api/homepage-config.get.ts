/**
 * Lightweight config endpoint for the homepage.
 *
 * Returns only the strings the homepage needs — no word lists, no keyboard.
 * Language is detected from Accept-Language (via middleware) or ?lang= param.
 */
import { loadLanguageConfig } from '~/server/utils/data-loader';

export default defineEventHandler((event) => {
    const query = getQuery(event);
    const lang = (query.lang as string) || event.context.detectedLanguage || 'en';

    // Tell CDN/caches that response varies by Accept-Language
    setResponseHeader(event, 'Vary', 'Accept-Language');

    const config = loadLanguageConfig(lang);

    return {
        lang,
        name: config.name,
        name_native: config.name_native,
        meta: config.meta,
        ui: config.ui,
        seo: config.seo,
    };
});
