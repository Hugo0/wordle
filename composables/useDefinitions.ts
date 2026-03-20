/**
 * Definitions Composable
 *
 * Fetches word definitions from the backend API with in-memory caching.
 * Cache key is "{lang}:{word}" — avoids duplicate API calls when the same
 * word appears across game modes (e.g., classic daily + archive + stats modal).
 */

import type { WordDefinition } from '~/utils/types';

const _cache = new Map<string, WordDefinition>();

export function useDefinitions() {
    async function fetchDefinition(word: string, lang: string): Promise<WordDefinition> {
        const key = `${lang}:${word.toLowerCase()}`;
        const cached = _cache.get(key);
        if (cached) return cached;

        try {
            const data = await $fetch(`/api/${lang}/definition/${encodeURIComponent(word)}`);
            const result: WordDefinition = {
                word,
                partOfSpeech: (data as any).part_of_speech || undefined,
                definition: (data as any).definition || '',
                definitionNative: (data as any).definition_native || undefined,
                definitionEn: (data as any).definition_en || undefined,
                confidence: (data as any).confidence,
                source: (data as any).source || 'llm',
                url: (data as any).url || (data as any).wiktionary_url || '',
            };
            _cache.set(key, result);
            return result;
        } catch {
            const fallback: WordDefinition = {
                word,
                definition: '',
                source: 'link',
                url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
            };
            _cache.set(key, fallback);
            return fallback;
        }
    }

    /** Clear the in-memory cache. Exposed for testing. */
    function clearCache() {
        _cache.clear();
    }

    return { fetchDefinition, clearCache };
}
