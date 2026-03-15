/**
 * GET /api/[lang]/definition/[word] — word definition JSON.
 */
import { loadAllData } from '../../../utils/data-loader';
import { fetchDefinition } from '../../../utils/definitions';

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang')!;
    const word = getRouterParam(event, 'word')!;
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Unknown language' });
    }

    // Only serve definitions for valid words
    const wordLower = word.toLowerCase();
    const allWords = new Set([...data.wordLists[lang]!, ...data.supplements[lang]!]);
    if (!allWords.has(wordLower)) {
        throw createError({ statusCode: 404, message: 'Unknown word' });
    }

    const query = getQuery(event);
    const skipCache = query.refresh === '1';

    const result = await fetchDefinition(wordLower, lang, {
        skipNegativeCache: skipCache,
    });
    if (result) return result;

    throw createError({ statusCode: 404, message: 'No definition found' });
});
