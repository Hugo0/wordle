/**
 * GET /api/[lang]/starting-words
 *
 * Returns the best starting words for a language, ranked by letter coverage,
 * uniqueness, and word familiarity. Used by the /[lang]/best-starting-words page.
 *
 * Reads raw words.json to access frequency data (the cached wordLists only
 * store string arrays). Result is cached in memory after first compute.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { requireLang, langResponseFields } from '../../utils/data-loader';
import { rankStartingWords, computeLetterFrequency } from '../../utils/word-analysis';

const DATA_DIR = join(process.cwd(), 'data');

interface StartingWordsResult {
    top_words: ReturnType<typeof rankStartingWords>;
    letter_frequency: ReturnType<typeof computeLetterFrequency>;
    daily_word_count: number;
    total_word_count: number;
}

// Cache computed results per language (expensive to recompute)
const cache = new Map<string, StartingWordsResult>();

function computeForLang(lang: string): StartingWordsResult | null {
    const wordsPath = join(DATA_DIR, 'languages', lang, 'words.json');
    if (!existsSync(wordsPath)) return null;

    const raw = JSON.parse(readFileSync(wordsPath, 'utf-8'));
    const allWords = (raw.words || []).filter(
        (w: any) => w.length === 5 || (w.word?.length === 5 && !w.length)
    );
    const dailyWords = allWords.filter((w: any) => w.tier === 'daily');

    const topWords = rankStartingWords(dailyWords, { limit: 20, tierFilter: undefined });
    const letterFreqs = computeLetterFrequency(dailyWords.map((w: any) => w.word));

    return {
        top_words: topWords,
        letter_frequency: letterFreqs.slice(0, 15),
        daily_word_count: dailyWords.length,
        total_word_count: allWords.length,
    };
}

export default defineEventHandler((event) => {
    const { lang, data, config } = requireLang(event);

    if (!cache.has(lang)) {
        const result = computeForLang(lang);
        if (!result) {
            throw createError({ statusCode: 404, message: `No word data for '${lang}'` });
        }
        cache.set(lang, result);
    }

    const cached = cache.get(lang)!;

    return {
        ...langResponseFields(lang, config),
        ...cached,
    };
});
