/**
 * GET /api/user/stats — Get all user stats from DB.
 *
 * Returns game results and speed results grouped for client consumption.
 */
import { prisma } from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const userId = session.user.id;

    const [gameResults, speedResults] = await Promise.all([
        prisma.gameResult.findMany({
            where: { userId },
            orderBy: { playedAt: 'asc' },
            select: {
                lang: true,
                mode: true,
                playType: true,
                dayIdx: true,
                won: true,
                attempts: true,
                playedAt: true,
            },
        }),
        prisma.speedResult.findMany({
            where: { userId },
            orderBy: { playedAt: 'asc' },
            select: {
                lang: true,
                score: true,
                wordsSolved: true,
                wordsFailed: true,
                maxCombo: true,
                totalGuesses: true,
                playedAt: true,
            },
        }),
    ]);

    return { gameResults, speedResults };
});
