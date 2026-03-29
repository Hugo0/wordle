/**
 * GET /api/[lang]/starting-words
 *
 * Returns the best starting words for a language, ranked by letter coverage,
 * uniqueness, and word familiarity. Used by the /[lang]/best-starting-words page.
 */
import { loadAllData } from '../../utils/data-loader';
import { rankStartingWords, computeLetterFrequency } from '../../utils/word-analysis';

export default defineEventHandler((event) => {
    const lang = getRouterParam(event, 'lang')!;
    const data = loadAllData();
    const langData = data.languages[lang];

    if (!langData) {
        throw createError({ statusCode: 404, message: `Language '${lang}' not found` });
    }

    const words = langData.words || [];
    const dailyWords = words.filter((w: any) => w.tier === 'daily');

    const topWords = rankStartingWords(words, { limit: 20 });
    const letterFreqs = computeLetterFrequency(dailyWords.map((w: any) => w.word));

    return {
        lang,
        lang_name: langData.config?.name || lang,
        lang_name_native: langData.config?.name_native || lang,
        top_words: topWords,
        letter_frequency: letterFreqs.slice(0, 15),
        daily_word_count: dailyWords.length,
        total_word_count: words.length,
    };
});
