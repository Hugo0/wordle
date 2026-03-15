/**
 * GET /api/[lang]/words — paginated word archive.
 *
 * Returns past daily words with definitions and stats for the words hub page.
 * Query params:
 *   page (default 1) — page number (1-indexed, newest first)
 *   per_page (default 30) — items per page
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadAllData, WORD_DEFS_DIR } from '../../utils/data-loader';
import { getTodaysIdx, getWordForDay, idxToDate } from '../../utils/word-selection';
import { loadWordStats } from '../../utils/word-stats';

const WORDS_PER_PAGE = 30;

/**
 * Read a cached definition from disk without triggering LLM generation.
 */
function readCachedDefinition(
    word: string,
    langCode: string,
): { definition: string; part_of_speech?: string } | null {
    const cachePath = join(WORD_DEFS_DIR, langCode, `${word.toLowerCase()}.json`);
    if (!existsSync(cachePath)) return null;
    try {
        const loaded = JSON.parse(readFileSync(cachePath, 'utf-8'));
        if (loaded.not_found || !loaded.definition) return null;
        return {
            definition: loaded.definition_native || loaded.definition,
            part_of_speech: loaded.part_of_speech || undefined,
        };
    } catch {
        return null;
    }
}

export default defineEventHandler((event) => {
    const lang = getRouterParam(event, 'lang')!;
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Unknown language' });
    }

    const query = getQuery(event);
    const page = Math.max(1, parseInt((query.page as string) || '1', 10));

    const config = data.configs[lang]!;
    const timezone = config.timezone || 'UTC';
    const todaysIdx = getTodaysIdx(timezone);
    const totalPages = Math.ceil(todaysIdx / WORDS_PER_PAGE);

    if (page > totalPages) {
        throw createError({ statusCode: 404, message: 'Page not found' });
    }

    // Compute word indices for this page (newest first)
    const startIdx = todaysIdx - (page - 1) * WORDS_PER_PAGE;
    const endIdx = Math.max(startIdx - WORDS_PER_PAGE, 0);

    const words: Array<{
        day_idx: number;
        word: string;
        date: string;
        definition: { definition: string; part_of_speech?: string } | null;
        stats: { total: number; wins: number } | null;
    }> = [];

    for (let idx = startIdx; idx > endIdx; idx--) {
        const word = getWordForDay(lang, idx);
        const date = idxToDate(idx);
        const stats = loadWordStats(lang, idx);
        const defResult = readCachedDefinition(word, lang);

        words.push({
            day_idx: idx,
            word,
            date: date.toISOString().slice(0, 10),
            definition: defResult,
            stats: stats ? { total: stats.total, wins: stats.wins } : null,
        });
    }

    return {
        lang_code: lang,
        lang_name: config.name || lang,
        lang_name_native: config.name_native || config.name || lang,
        todays_idx: todaysIdx,
        page,
        total_pages: totalPages,
        words_per_page: WORDS_PER_PAGE,
        words,
    };
});
