/**
 * Word Definitions - Wiktionary API client
 * Fetches word definitions after game completion
 */
import type { WordDefinition } from './types';

// Map our language codes to Wiktionary language codes where they differ
const WIKTIONARY_LANG_MAP: Record<string, string> = {
    nb: 'no', // Norwegian Bokmål → Norwegian
    nn: 'no', // Norwegian Nynorsk → Norwegian
    hyw: 'hy', // Western Armenian → Armenian
    ckb: 'ku', // Central Kurdish → Kurdish
};

// Map our language codes to the keys used in English Wiktionary REST API responses
// The API returns definitions keyed by Wiktionary language code (usually same as ours)
const EN_WIKTIONARY_LANG_MAP: Record<string, string> = {
    nb: 'nb', // Norwegian Bokmål (stays as-is in Wiktionary)
    nn: 'nn', // Norwegian Nynorsk
    hyw: 'hy', // Western Armenian → Armenian
    ckb: 'ku', // Central Kurdish → Kurdish
};

function getWiktionaryLang(lang: string): string {
    return WIKTIONARY_LANG_MAP[lang] || lang;
}

function getWiktionaryUrl(word: string, lang: string): string {
    const wikiLang = getWiktionaryLang(lang);
    return `https://${wikiLang}.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}

function getEnWiktionaryUrl(word: string): string {
    return `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Try to fetch definition from English Wiktionary REST API.
 * Returns definitions for the target language (not English definitions).
 */
async function fetchFromEnWiktionary(word: string, lang: string): Promise<WordDefinition | null> {
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();

        // The API returns definitions keyed by language code
        const wikiLang = EN_WIKTIONARY_LANG_MAP[lang] || lang;
        const langDefs = data[wikiLang];
        if (!Array.isArray(langDefs) || langDefs.length === 0) return null;

        // Get first part of speech entry
        const firstEntry = langDefs[0];
        const partOfSpeech = firstEntry.partOfSpeech || undefined;

        // Get first definition
        const definitions = firstEntry.definitions;
        if (!Array.isArray(definitions) || definitions.length === 0) return null;

        const defText = stripHtml(definitions[0].definition || '');
        if (!defText) return null;

        return {
            word,
            partOfSpeech,
            definition: defText,
            source: 'english',
            url: getEnWiktionaryUrl(word),
        };
    } catch {
        return null;
    }
}

/**
 * Try to fetch definition from native-language Wiktionary.
 * Uses MediaWiki API to get the page extract.
 */
async function fetchFromNativeWiktionary(
    word: string,
    lang: string
): Promise<WordDefinition | null> {
    const wikiLang = getWiktionaryLang(lang);
    const url = `https://${wikiLang}.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=extracts&explaintext=1&exintro=1&format=json&origin=*`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        const pages = data?.query?.pages;
        if (!pages) return null;

        // Get the first (and usually only) page
        const pageId = Object.keys(pages)[0];
        if (!pageId || pageId === '-1') return null;

        const extract = pages[pageId]?.extract;
        if (!extract || typeof extract !== 'string') return null;

        // Take first meaningful line as definition (skip empty lines)
        const lines = extract.split('\n').filter((l: string) => l.trim().length > 0);
        const definition = lines[0]?.trim();
        if (!definition || definition.length < 3) return null;

        // Truncate very long definitions
        const truncated =
            definition.length > 200 ? definition.substring(0, 200) + '...' : definition;

        return {
            word,
            definition: truncated,
            source: 'native',
            url: getWiktionaryUrl(word, lang),
        };
    } catch {
        return null;
    }
}

/**
 * Fetch a word definition with fallback strategy:
 * 1. Try native Wiktionary (definition in player's language)
 * 2. Try English Wiktionary REST API (structured, reliable)
 * 3. Return a "look up" link as last resort
 */
export async function fetchDefinition(word: string, lang: string): Promise<WordDefinition> {
    // Don't try native for English — go straight to English Wiktionary
    if (lang !== 'en') {
        const nativeDef = await fetchFromNativeWiktionary(word, lang);
        if (nativeDef) return nativeDef;
    }

    const enDef = await fetchFromEnWiktionary(word, lang);
    if (enDef) return enDef;

    // Fallback: return a link
    return {
        word,
        definition: '',
        source: 'link',
        url: getEnWiktionaryUrl(word),
    };
}

/**
 * Render the definition card into the stats modal.
 * Called after game completion when definitions are enabled.
 */
export function renderDefinitionCard(
    def: WordDefinition,
    container: HTMLElement,
    uiStrings: { definition?: string; look_up_on_wiktionary?: string }
): void {
    const definitionLabel = uiStrings.definition || 'Definition';
    const lookUpLabel = uiStrings.look_up_on_wiktionary || 'Look up on Wiktionary';

    const safeWord = escapeHtml(def.word);
    const safeUrl = escapeHtml(def.url);
    const safeLookUp = escapeHtml(lookUpLabel);
    const safeDefLabel = escapeHtml(definitionLabel);

    if (def.source === 'link') {
        // No definition found — show link only
        container.innerHTML = `
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                class="flex items-center justify-center gap-1 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
                <span>${safeLookUp}: <strong class="uppercase">${safeWord}</strong></span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                </svg>
            </a>`;
    } else {
        const safePos = def.partOfSpeech ? escapeHtml(def.partOfSpeech) : '';
        const posHtml = safePos
            ? `<span class="text-xs text-neutral-400 dark:text-neutral-500 italic">${safePos}</span>`
            : '';
        const safeDef = escapeHtml(def.definition);

        container.innerHTML = `
            <div class="flex items-start gap-2">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">${safeDefLabel}</span>
                        ${posHtml}
                    </div>
                    <p class="text-sm text-neutral-800 dark:text-neutral-200"><strong class="uppercase">${safeWord}</strong> &mdash; ${safeDef}</p>
                </div>
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                    class="flex-shrink-0 text-neutral-400 hover:text-blue-500 dark:text-neutral-500 dark:hover:text-blue-400" title="${safeLookUp}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                    </svg>
                </a>
            </div>`;
    }

    container.style.display = 'block';
}

/**
 * Render the word image into the image container.
 * The image loads directly via GET — if it 404s or fails, the container is hidden.
 * If the image isn't cached, the server generates it (may take 15-20s).
 */
export function renderWordImage(word: string, lang: string, container: HTMLElement): void {
    const url = `/${lang}/api/word-image/${encodeURIComponent(word)}`;
    const img = document.createElement('img');
    img.className = 'w-full max-h-48 object-contain rounded-lg';
    img.alt = word;
    img.onload = () => {
        container.innerHTML = '';
        container.appendChild(img);
        container.style.display = 'block';
    };
    img.onerror = () => {
        container.style.display = 'none';
    };
    // Set src last to ensure handlers are attached before load starts
    // Do NOT use loading="lazy" — the img is detached from DOM during load
    img.src = url;
}

/**
 * Show loading state in the definition card
 */
export function showDefinitionLoading(container: HTMLElement): void {
    container.innerHTML = `
        <div class="animate-pulse flex gap-2">
            <div class="flex-1 space-y-1.5">
                <div class="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
                <div class="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
            </div>
        </div>`;
    container.style.display = 'block';
}

/**
 * Show loading state for word image
 */
export function showImageLoading(container: HTMLElement): void {
    container.innerHTML = `
        <div class="animate-pulse">
            <div class="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-full"></div>
        </div>`;
    container.style.display = 'block';
}
