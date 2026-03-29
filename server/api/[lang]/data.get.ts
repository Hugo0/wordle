/**
 * GET /api/[lang]/data — language game data.
 *
 * Returns word list, characters, config, keyboard, daily word info.
 * For multi-board modes (?mode=dordle|tridle|quordle), also returns
 * todays_words: an array of N distinct daily words.
 */
import { loadAllData } from '../../utils/data-loader';
import { buildLanguageSession } from '../../utils/language-builder';
import { getWordsForDay } from '../../utils/word-selection';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

export default defineEventHandler((event) => {
    const lang = getRouterParam(event, 'lang')!;
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Unknown language' });
    }

    const query = getQuery(event);
    const layout = (query.layout as string) || undefined;
    const mode = (query.mode as string) || 'classic';

    const session = buildLanguageSession(lang, layout);

    const response = {
        word_list: session.wordList,
        daily_words: data.dailyWords[lang] || ([] as string[]),
        characters: session.characters,
        config: session.config,
        todays_idx: session.todaysIdx,
        todays_word: session.dailyWord,
        timezone_offset: session.timezoneOffset,
        keyboard: session.keyboard,
        keyboard_layouts: session.keyboardLayouts,
        keyboard_layout_name: session.keyboardLayoutName,
        key_diacritic_hints: session.keyDiacriticHints,
        todays_words: undefined as string[] | undefined,
    };

    // Multi-board modes: return N distinct daily words
    const modeConfig = GAME_MODE_CONFIG[mode as GameMode];
    if (modeConfig && modeConfig.boardCount > 1) {
        response.todays_words = getWordsForDay(lang, session.todaysIdx, modeConfig.boardCount);
    }

    return response;
});
