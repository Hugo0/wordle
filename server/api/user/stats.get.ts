/**
 * GET /api/user/stats — Get user results + settings from DB.
 *
 * Bundles settings into the response to save a separate round-trip.
 * Supports incremental sync via ?since=ISO8601 — only returns results
 * created after that timestamp. Without `since`, returns everything.
 */
import { prisma } from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const query = getQuery(event);
    const since = query.since ? new Date(query.since as string) : null;

    const where: { userId: string; createdAt?: { gt: Date } } = { userId: session.user.id };
    if (since && !isNaN(since.getTime())) {
        where.createdAt = { gt: since };
    }

    const [results, user] = await Promise.all([
        prisma.result.findMany({
            where,
            orderBy: { playedAt: 'asc' },
            select: {
                lang: true,
                mode: true,
                playType: true,
                dayIdx: true,
                won: true,
                attempts: true,
                score: true,
                wordsSolved: true,
                wordsFailed: true,
                maxCombo: true,
                totalGuesses: true,
                playedAt: true,
                createdAt: true,
            },
        }),
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { settings: true },
        }),
    ]);

    return {
        results,
        settings: (user?.settings as Record<string, unknown>) ?? {},
    };
});
