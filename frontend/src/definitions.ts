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
 * The backend tries native Wiktionary first, then English Wiktionary,
 * and caches results to disk.
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
                source: data.source || 'english',
                url: data.url || '',
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

    const linkHtml = wordPageUrl
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
                ${linkHtml}
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
