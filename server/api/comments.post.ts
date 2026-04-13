/**
 * POST /api/comments — Create a comment.
 *
 * Requires authentication. Rate-limited: 5 per 10 minutes per user.
 * Runs basic moderation (profanity, spam, URLs).
 * Returns the new comment with real-time badges from the Results table.
 */
import { prisma } from '~/server/utils/prisma';
import { rateLimit } from '~/server/utils/rate-limit';
import { moderateComment } from '~/server/utils/moderation';
import { parseAppearances, type CommentBadge } from '~/server/utils/comments';

interface CommentBody {
    targetType: string;
    targetKey: string;
    body: string;
    /** Comma-separated 'mode:dayIdx' pairs for badge lookup */
    appearances?: string;
    lang?: string;
}

const VALID_TARGET_TYPES = ['word', 'leaderboard'];

export default defineEventHandler(async (event) => {
    // Auth required
    const session = await getUserSession(event);
    const userId = (session?.user as any)?.id;
    if (!userId) {
        throw createError({ statusCode: 401, message: 'Sign in to comment.' });
    }

    rateLimit(event, 'comments', 5, 10 * 60 * 1000);

    const body = await readBody<CommentBody>(event);

    if (!body.targetType || !VALID_TARGET_TYPES.includes(body.targetType)) {
        throw createError({ statusCode: 400, message: 'Invalid target type.' });
    }
    if (!body.targetKey || typeof body.targetKey !== 'string') {
        throw createError({ statusCode: 400, message: 'Target key is required.' });
    }
    if (!body.body || typeof body.body !== 'string') {
        throw createError({ statusCode: 400, message: 'Comment body is required.' });
    }

    const text = body.body.trim().slice(0, 500);
    if (text.length < 1) {
        throw createError({ statusCode: 400, message: 'Comment is too short.' });
    }

    // Moderation check
    const modResult = moderateComment(text);
    if (!modResult.ok) {
        throw createError({ statusCode: 422, message: modResult.reason! });
    }

    const comment = await prisma.comment.create({
        data: {
            userId,
            type: 'comment',
            targetType: body.targetType,
            targetKey: body.targetKey,
            body: text,
        },
        select: {
            id: true,
            body: true,
            createdAt: true,
            user: {
                select: {
                    username: true,
                    avatarUrl: true,
                },
            },
        },
    });

    let badges: CommentBadge[] = [];
    const lang = body.lang || '';
    const appearances = parseAppearances(body.appearances || '');

    if (appearances.length > 0 && lang) {
        const results = await prisma.result.findMany({
            where: {
                userId,
                lang,
                playType: 'daily',
                won: { not: null },
                OR: appearances.map((a) => ({
                    mode: a.mode,
                    dayIdx: a.dayIdx,
                })),
            },
            select: { mode: true, attempts: true, won: true },
        });
        badges = results
            .map((r: { mode: string; attempts: number | null; won: boolean | null }) => ({
                mode: r.mode,
                attempts: r.attempts ?? 0,
                won: r.won ?? false,
            }))
            .slice(0, 3);
    }

    return {
        id: comment.id,
        body: comment.body,
        username: comment.user?.username ?? 'Guest',
        avatarUrl: comment.user?.avatarUrl ?? null,
        createdAt: comment.createdAt.toISOString(),
        badges,
    };
});
