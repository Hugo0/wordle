/**
 * PUT /api/user/settings — Sync user settings to DB.
 */
import { prisma } from '~/server/utils/prisma';

const BOOLEAN_KEYS = new Set([
    'darkMode',
    'hardMode',
    'highContrast',
    'feedbackEnabled',
    'wordInfoEnabled',
    'animationsEnabled',
]);

const STRING_KEYS = new Set(['preferredLanguage']);

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const body = await readBody<Record<string, unknown>>(event);

    if (!body || typeof body !== 'object') {
        throw createError({ statusCode: 400, message: 'Invalid settings' });
    }

    const filtered: Record<string, boolean | string> = {};
    for (const [key, value] of Object.entries(body)) {
        if (BOOLEAN_KEYS.has(key) && typeof value === 'boolean') {
            filtered[key] = value;
        } else if (STRING_KEYS.has(key) && typeof value === 'string' && value.length <= 10) {
            filtered[key] = value;
        }
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: { settings: filtered },
    });

    return { ok: true };
});
