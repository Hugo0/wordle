/**
 * GET /api/[lang]/word/[id] — single word detail.
 *
 * Returns the word, definition, stats, and navigation info for a specific day.
 */
import { loadAllData } from '../../../utils/data-loader';
import { getTodaysIdx, getWordForDay, idxToDate } from '../../../utils/word-selection';
import { loadWordStats } from '../../../utils/word-stats';
import { fetchDefinition } from '../../../utils/definitions';
import type { WordStats } from '~/utils/types';

// Wiktionary language code mapping (same as Flask)
const WIKT_LANG_MAP: Record<string, string> = {
    zh: 'zh',
    'zh-tw': 'zh',
    pt: 'pt',
    'pt-br': 'pt',
    nb: 'no',
    nn: 'no',
    sr: 'sr',
    'sr-latn': 'sr',
    ckb: 'ku',
    gd: 'gd',
    mi: 'mi',
};

function getWiktLang(langCode: string): string {
    if (WIKT_LANG_MAP[langCode]) return WIKT_LANG_MAP[langCode]!;
    // Use first 2 chars as default
    return langCode.length > 2 ? langCode.slice(0, 2) : langCode;
}

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang')!;
    const idStr = getRouterParam(event, 'id')!;
    const dayIdx = parseInt(idStr, 10);

    if (isNaN(dayIdx) || dayIdx < 1) {
        throw createError({ statusCode: 400, message: 'Invalid day index' });
    }

    const data = loadAllData();
    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Unknown language' });
    }

    const config = data.configs[lang]!;
    const timezone = config.timezone || 'UTC';
    const todaysIdx = getTodaysIdx(timezone);
    const wiktLang = getWiktLang(lang);

    const isFuture = dayIdx > todaysIdx;
    const isToday = dayIdx === todaysIdx;
    const isPast = dayIdx < todaysIdx;

    // Only reveal word for past and current days
    let word: string | null = null;
    let wordDate: string | null = null;
    let definition: {
        definition: string;
        definition_native?: string;
        part_of_speech?: string;
    } | null = null;
    let wordStats: WordStats | null = null;

    if (!isFuture) {
        word = getWordForDay(lang, dayIdx);
        wordDate = idxToDate(dayIdx).toISOString().slice(0, 10);

        // Load stats
        wordStats = loadWordStats(lang, dayIdx);

        // Load definition (try cache first, then generate)
        try {
            const def = await fetchDefinition(word, lang, {});
            if (def) {
                definition = {
                    definition: def.definition,
                    definition_native: def.definitionNative || def.definition_native,
                    part_of_speech: def.partOfSpeech || def.part_of_speech,
                };
            }
        } catch {
            // ignore
        }
    }

    return {
        lang_code: lang,
        lang_name: config.name || lang,
        lang_name_native: config.name_native || config.name || lang,
        day_idx: dayIdx,
        todays_idx: todaysIdx,
        is_past: isPast,
        is_today: isToday,
        is_future: isFuture,
        word,
        word_date: wordDate,
        definition,
        word_stats: wordStats,
        wikt_lang: wiktLang,
        ui: config.ui || {},
        meta: config.meta || {},
    };
});
