/**
 * GET /api/[lang]/definition/[word] — word definition JSON.
 */
import { loadAllData } from '../../../utils/data-loader';
import { fetchDefinition } from '../../../utils/definitions';

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang')!;
    const word = getRouterParam(event, 'word')!.normalize('NFC');
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Unknown language' });
    }

    // Only serve definitions for valid words (normalize to NFC for consistent matching)
    const wordLower = word.toLowerCase().normalize('NFC');
    const wordList = data.wordLists[lang]!;
    if (!wordList.includes(wordLower) && !wordList.includes(wordLower.normalize('NFD'))) {
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
