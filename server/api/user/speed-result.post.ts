/**
 * POST /api/user/speed-result — Save a single speed session result.
 */
import { prisma } from '~/server/utils/prisma';

interface SpeedResultBody {
    lang: string;
    score: number;
    wordsSolved: number;
    wordsFailed: number;
    maxCombo: number;
    totalGuesses: number;
    deviceId?: string;
}

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const userId = session.user.id;
    const body = await readBody<SpeedResultBody>(event);

    if (!body?.lang || typeof body.score !== 'number') {
        throw createError({ statusCode: 400, message: 'Invalid speed result' });
    }

    const result = await prisma.speedResult.create({
        data: {
            userId,
            deviceId: body.deviceId ?? null,
            lang: body.lang,
            score: body.score,
            wordsSolved: body.wordsSolved ?? 0,
            wordsFailed: body.wordsFailed ?? 0,
            maxCombo: body.maxCombo ?? 0,
            totalGuesses: body.totalGuesses ?? 0,
            playedAt: new Date(),
        },
    });

    return { id: result.id };
});
