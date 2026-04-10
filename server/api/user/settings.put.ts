/**
 * PUT /api/user/settings — Sync user settings to DB.
 */
import { prisma } from '~/server/utils/prisma';

const VALID_KEYS = new Set([
    'darkMode',
    'hardMode',
    'highContrast',
    'feedbackEnabled',
    'wordInfoEnabled',
    'animationsEnabled',
]);

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const body = await readBody<Record<string, boolean>>(event);

    if (!body || typeof body !== 'object') {
        throw createError({ statusCode: 400, message: 'Invalid settings' });
    }

    // Only persist known setting keys
    const filtered: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(body)) {
        if (VALID_KEYS.has(key) && typeof value === 'boolean') {
            filtered[key] = value;
        }
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: { settings: filtered },
    });

    return { ok: true };
});
