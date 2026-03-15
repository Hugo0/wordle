/**
 * Definitions Composable
 *
 * Fetches word definitions from the backend API.
 * In Nuxt, uses $fetch which works both SSR and client-side.
 */

import type { WordDefinition } from '~/utils/types';

export function useDefinitions() {
    async function fetchDefinition(word: string, lang: string): Promise<WordDefinition> {
        try {
            const data = await $fetch(`/api/${lang}/definition/${encodeURIComponent(word)}`);
            return {
                word,
                partOfSpeech: (data as any).part_of_speech || undefined,
                definition: (data as any).definition || '',
                definitionNative: (data as any).definition_native || undefined,
                definitionEn: (data as any).definition_en || undefined,
                confidence: (data as any).confidence,
                source: (data as any).source || 'llm',
                url: (data as any).url || (data as any).wiktionary_url || '',
            };
        } catch {
            return {
                word,
                definition: '',
                source: 'link',
                url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
            };
        }
    }

    return { fetchDefinition };
}
