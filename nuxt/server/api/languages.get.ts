/**
 * GET /api/languages — all language metadata for homepage.
 */
import { loadAllData } from '../utils/data-loader';

// Language popularity order (from Google Analytics, updated 2026-01-25)
const LANGUAGE_POPULARITY = [
    'fi', 'en', 'ar', 'tr', 'hr', 'bg', 'de', 'he', 'sv', 'ru',
    'hu', 'es', 'et', 'da', 'sr', 'ro', 'ca', 'sk', 'it', 'az',
    'fr', 'lv', 'la', 'gl', 'mk', 'uk', 'pt', 'vi', 'pl', 'hy',
    'nb', 'sl', 'nl', 'cs', 'hyw', 'fa', 'eu', 'gd', 'ga', 'ko',
    'ka', 'nn', 'is', 'ckb', 'el', 'lt', 'pau', 'mn', 'ia', 'mi',
    'lb', 'br', 'ne', 'eo', 'fy', 'nds', 'tlh', 'ie', 'tk', 'fo',
    'oc', 'fur', 'ltg', 'qya', 'rw',
];

export default defineEventHandler(() => {
    const data = loadAllData();
    return {
        languages: data.languages,
        language_codes: data.languageCodes,
        language_popularity: LANGUAGE_POPULARITY,
    };
});
