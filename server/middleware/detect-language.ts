/**
 * Detect preferred language from Accept-Language header.
 *
 * Sets event.context.detectedLanguage for downstream handlers.
 * Only runs for the homepage (/) to avoid overhead on game pages
 * which already have the language in the URL.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Cache available language codes at startup
let _availableLangs: Set<string> | null = null;

function getAvailableLangs(): Set<string> {
    if (!_availableLangs) {
        const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data', 'languages');
        try {
            _availableLangs = new Set(readdirSync(dataDir));
        } catch {
            _availableLangs = new Set(['en']);
        }
    }
    return _availableLangs;
}

// Special mappings for language codes that don't match our directory names
const LANG_ALIASES: Record<string, string> = {
    no: 'nb', // Norwegian → Bokmål
    'nb-NO': 'nb',
    'nn-NO': 'nn',
    'pt-BR': 'pt',
    'zh-CN': 'zh',
    'zh-TW': 'zh',
};

/**
 * Parse Accept-Language header and return best matching language code.
 * Example header: "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7"
 */
function parseAcceptLanguage(header: string): string {
    const langs = getAvailableLangs();

    // Parse into sorted list by quality value
    const entries = header
        .split(',')
        .map((part) => {
            const [tag, ...rest] = part.trim().split(';');
            const q = rest.find((r) => r.trim().startsWith('q='));
            const quality = q ? parseFloat(q.split('=')[1]!) : 1.0;
            return { tag: tag!.trim(), quality };
        })
        .sort((a, b) => b.quality - a.quality);

    for (const { tag } of entries) {
        // Check exact match first (e.g., "pt-BR" → "pt")
        if (LANG_ALIASES[tag] && langs.has(LANG_ALIASES[tag]!)) {
            return LANG_ALIASES[tag]!;
        }

        // Check exact code
        const lower = tag.toLowerCase();
        if (langs.has(lower)) return lower;

        // Check prefix (e.g., "es-ES" → "es")
        const prefix = lower.split('-')[0]!;
        if (LANG_ALIASES[prefix] && langs.has(LANG_ALIASES[prefix]!)) {
            return LANG_ALIASES[prefix]!;
        }
        if (langs.has(prefix)) return prefix;
    }

    return 'en';
}

export default defineEventHandler((event) => {
    const header = getRequestHeader(event, 'accept-language');
    event.context.detectedLanguage = header ? parseAcceptLanguage(header) : 'en';
});
