/**
 * Word Definitions - fetched from our backend API
 * The backend handles Wiktionary lookups and caching in one place.
 */
import type { WordDefinition } from './types';

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Fetch a word definition from our backend API.
 * The backend uses pre-generated LLM definitions with disk caching.
 */
export async function fetchDefinition(word: string, lang: string): Promise<WordDefinition> {
    try {
        const response = await fetch(`/${lang}/api/definition/${encodeURIComponent(word)}`);
        if (response.ok) {
            const data = await response.json();
            return {
                word,
                partOfSpeech: data.part_of_speech || undefined,
                definition: data.definition || '',
                definitionNative: data.definition_native || undefined,
                definitionEn: data.definition_en || undefined,
                confidence: data.confidence,
                source: data.source || 'llm',
                url: data.url || data.wiktionary_url || '',
            };
        }
    } catch {
        // Network error — fall through to link fallback
    }

    // Fallback: no definition available
    return {
        word,
        definition: '',
        source: 'link',
        url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
    };
}

/**
 * Render the definition card into the stats modal.
 * Called after game completion when definitions are enabled.
 */
export function renderDefinitionCard(
    def: WordDefinition,
    container: HTMLElement,
    uiStrings: { definition?: string; look_up_on_wiktionary?: string },
    wordPageUrl?: string
): void {
    const definitionLabel = uiStrings.definition || 'Definition';

    const safeWord = escapeHtml(def.word);
    const safeDefLabel = escapeHtml(definitionLabel);

    const isSafeUrl = (url: string) =>
        url.startsWith('/') || url.startsWith('https://') || url.startsWith('http://');

    const linkHtml =
        wordPageUrl && isSafeUrl(wordPageUrl)
            ? `<a href="${escapeHtml(wordPageUrl)}"
                class="flex-shrink-0 text-neutral-400 hover:text-blue-500 dark:text-neutral-500 dark:hover:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                </svg>
            </a>`
            : '';

    if (def.source === 'link') {
        // No definition found — hide the card (word subpage has Wiktionary links)
        container.style.display = 'none';
        return;
    } else {
        const safePos = def.partOfSpeech ? escapeHtml(def.partOfSpeech) : '';
        const posHtml = safePos
            ? `<span class="text-xs text-neutral-400 dark:text-neutral-500 italic">${safePos}</span>`
            : '';
        const safeDef = escapeHtml(def.definitionNative || def.definition);

        container.innerHTML = `
            <div class="flex items-start gap-2">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">${safeDefLabel}</span>
                        ${posHtml}
                    </div>
                    <p class="text-sm text-neutral-800 dark:text-neutral-200"><strong class="uppercase">${safeWord}</strong> &mdash; ${safeDef}</p>
                </div>
                ${linkHtml}
            </div>`;
    }

    container.style.display = 'block';
}

/**
 * Render the word image into the image container.
 * Uses fetch() with retry logic for transient failures (202 = generating, network errors).
 * Gives up immediately on definitive failures (404, 403).
 */
export function renderWordImage(
    word: string,
    lang: string,
    container: HTMLElement,
    linkUrl?: string
): void {
    const url = `/${lang}/api/word-image/${encodeURIComponent(word)}`;
    const maxRetries = 3;
    const baseDelay = 4000; // 4s, 8s, 16s

    function displayImage(blob: Blob): void {
        const objectUrl = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.className = 'w-full max-h-48 object-contain rounded-lg';
        img.alt = word;
        img.onload = () => {
            container.innerHTML = '';
            if (linkUrl) {
                const a = document.createElement('a');
                a.href = linkUrl;
                a.appendChild(img);
                container.appendChild(a);
            } else {
                container.appendChild(img);
            }
            container.style.display = 'block';
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            container.style.display = 'none';
        };
        img.src = objectUrl;
    }

    function tryLoad(attempt: number): void {
        fetch(url)
            .then((response) => {
                if (response.ok) {
                    return response.blob().then(displayImage);
                }
                // 202 = image being generated server-side, retry with backoff
                if (response.status === 202 && attempt < maxRetries) {
                    setTimeout(() => tryLoad(attempt + 1), baseDelay * Math.pow(2, attempt));
                    return;
                }
                container.style.display = 'none';
            })
            .catch(() => {
                // Network error — retry with backoff
                if (attempt < maxRetries) {
                    setTimeout(() => tryLoad(attempt + 1), baseDelay * Math.pow(2, attempt));
                    return;
                }
                container.style.display = 'none';
            });
    }

    tryLoad(0);
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
