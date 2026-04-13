/**
 * Definitions Composable
 *
 * Fetches word definitions from the backend API with in-memory caching.
 * Cache key is "{lang}:{word}" — avoids duplicate API calls when the same
 * word appears across game modes (e.g., classic daily + archive + stats modal).
 */

import { $fetch as ofetch } from 'ofetch';
import type { WordDefinition } from '~/utils/types';

/** Shape returned by the /api/[lang]/definition/[word] endpoint. */
interface DefinitionApiResponse {
    definition: string;
    definition_native?: string;
    definition_en?: string;
    part_of_speech?: string | null;
    confidence?: number;
    source?: string;
    url?: string;
    wiktionary_url?: string;
}

const _cache = new Map<string, WordDefinition>();

export function useDefinitions() {
    /**
     * Fetch a word definition from the API.
     * @param cacheOnly - If true, server only checks disk cache + kaikki (no LLM).
     *                    Use for unlimited/random words to avoid expensive LLM calls.
     */
    async function fetchDefinition(
        word: string,
        lang: string,
        options?: { cacheOnly?: boolean }
    ): Promise<WordDefinition> {
        const key = `${lang}:${word.toLowerCase()}`;
        const cached = _cache.get(key);
        if (cached) return cached;

        const params = options?.cacheOnly ? '?cache_only=1' : '';
        try {
            const url = `/api/${lang}/definition/${encodeURIComponent(word)}${params}`;
            const data = (await ofetch(url)) as DefinitionApiResponse;
            const result: WordDefinition = {
                word,
                partOfSpeech: data.part_of_speech || undefined,
                definition: data.definition || '',
                definitionNative: data.definition_native || undefined,
                definitionEn: data.definition_en || undefined,
                confidence: data.confidence,
                source: (data.source || 'llm') as WordDefinition['source'],
                url: data.url || data.wiktionary_url || '',
            };
            _cache.set(key, result);
            return result;
        } catch {
            return {
                word,
                definition: '',
                source: 'link',
                url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
            };
        }
    }

    /** Clear the in-memory cache. Exposed for testing. */
    function clearCache() {
        _cache.clear();
    }

    return { fetchDefinition, clearCache };
}
