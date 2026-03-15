/**
 * GET /api/[lang]/data — language game data.
 *
 * Returns word list, characters, config, keyboard, daily word info.
 */
import { loadAllData } from '../../utils/data-loader';
import { buildLanguageSession } from '../../utils/language-builder';

export default defineEventHandler((event) => {
    const lang = getRouterParam(event, 'lang')!;
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Unknown language' });
    }

    const query = getQuery(event);
    const layout = (query.layout as string) || undefined;

    const session = buildLanguageSession(lang, layout);

    return {
        word_list: session.wordList,
        characters: session.characters,
        config: session.config,
        todays_idx: session.todaysIdx,
        todays_word: session.dailyWord,
        timezone_offset: session.timezoneOffset,
        keyboard: session.keyboard,
        keyboard_layouts: session.keyboardLayouts,
        keyboard_layout_name: session.keyboardLayoutName,
        key_diacritic_hints: session.keyDiacriticHints,
    };
});
