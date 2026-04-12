/**
 * POST /api/[lang]/word-stats — anonymous game results submission.
 */
import { loadAllData } from '../../utils/data-loader';
import { getTodaysIdx } from '../../utils/word-selection';
import { loadWordStats, updateWordStats, isDuplicateSubmission } from '../../utils/word-stats';

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang')!;
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Not found' });
    }

    const body = await readBody(event);
    if (!body) {
        throw createError({ statusCode: 400, message: 'Missing body' });
    }

    const { day_idx, attempts, won } = body;

    if (typeof day_idx !== 'number' || typeof won !== 'boolean') {
        throw createError({ statusCode: 400, message: 'Invalid data' });
    }

    // Only accept stats for today's word
    const tz = data.configs[lang]!.timezone || 'UTC';
    const todaysIdx = getTodaysIdx(tz);
    if (day_idx !== todaysIdx) {
        throw createError({ statusCode: 403, message: 'Not today' });
    }

    // Client-based dedup
    const clientId =
        body.client_id ||
        getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown';

    if (isDuplicateSubmission(lang, day_idx, clientId, todaysIdx)) {
        const existing = await loadWordStats(lang, day_idx);
        return existing || {};
    }

    try {
        await updateWordStats(lang, day_idx, won, attempts);
    } catch {
        console.warn(`[word-stats] Disk write failed for ${lang}`);
    }

    const updated = await loadWordStats(lang, day_idx);
    return updated || {};
});
