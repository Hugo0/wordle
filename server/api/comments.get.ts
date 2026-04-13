/**
 * GET /api/comments — Fetch comments for a target, with real-time badges.
 *
 * Query params:
 *   targetType  — 'word' | 'leaderboard'
 *   targetKey   — e.g. 'en-hello', 'en-classic-1756'
 *   appearances — comma-separated 'mode:dayIdx' pairs (e.g. 'classic:1756,quordle:42')
 *                 Used to look up each commenter's game results for badge display.
 *   lang        — language code (for result lookups)
 *   limit       — page size (default 50, max 100)
 *   cursor      — createdAt ISO string for cursor-based pagination
 */
import { prisma } from '~/server/utils/prisma';
import { parseAppearances, type CommentBadge } from '~/server/utils/comments';

interface CommentRow {
    id: string;
    body: string;
    created_at: Date;
    user_id: string | null;
    username: string | null;
    avatar_url: string | null;
    badges: CommentBadge[] | null;
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event);

    const targetType = query.targetType as string;
    const targetKey = query.targetKey as string;

    if (!targetType || !targetKey) {
        throw createError({ statusCode: 400, message: 'targetType and targetKey are required.' });
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 50));
    const cursor = query.cursor as string | undefined;
    const lang = query.lang as string || '';

    const appearances = parseAppearances((query.appearances as string) || '');

    const hasBadges = appearances.length > 0 && lang;

    // Build the badges subquery — correlated per comment row
    let badgesSubquery = 'NULL::json';
    const params: any[] = [];
    let paramIdx = 1;

    // Base WHERE params
    params.push(targetType);    // $1
    params.push(targetKey);     // $2
    paramIdx = 3;

    if (hasBadges) {
        // Build the IN clause for (mode, day_idx) pairs
        const pairs = appearances.map((a) => {
            const modeParam = `$${paramIdx++}`;
            const dayParam = `$${paramIdx++}`;
            params.push(a.mode, a.dayIdx);
            return `(${modeParam}, ${dayParam})`;
        });
        const langParam = `$${paramIdx++}`;
        params.push(lang);

        badgesSubquery = `(
            SELECT json_agg(json_build_object(
                'mode', r.mode, 'attempts', r.attempts, 'won', r.won
            ))
            FROM wordle.results r
            WHERE r.user_id = c.user_id
              AND r.lang = ${langParam}
              AND r.play_type = 'daily'
              AND r.won IS NOT NULL
              AND (r.mode, r.day_idx) IN (${pairs.join(', ')})
        )`;
    }

    // Cursor filter
    let cursorClause = '';
    if (cursor) {
        const cursorDate = new Date(cursor);
        if (isNaN(cursorDate.getTime())) {
            throw createError({ statusCode: 400, message: 'Invalid cursor.' });
        }
        cursorClause = `AND c.created_at < $${paramIdx++}`;
        params.push(cursorDate);
    }

    const limitParam = `$${paramIdx++}`;
    params.push(limit);

    const sql = `
        SELECT
            c.id, c.body, c.created_at, c.user_id,
            u.username, u.avatar_url,
            ${badgesSubquery} as badges
        FROM wordle.comments c
        LEFT JOIN wordle.users u ON c.user_id = u.id
        WHERE c.type = 'comment'
          AND c.target_type = $1
          AND c.target_key = $2
          AND c.hidden = false
          ${cursorClause}
        ORDER BY c.created_at DESC
        LIMIT ${limitParam}
    `;

    // Skip count query on paginated requests — only needed on first page
    const [rows, total] = await Promise.all([
        prisma.$queryRawUnsafe<CommentRow[]>(sql, ...params),
        cursor
            ? Promise.resolve(-1)
            : prisma.comment.count({
                  where: { type: 'comment', targetType, targetKey, hidden: false },
              }),
    ]);

    return {
        comments: rows.map((r: CommentRow) => ({
            id: r.id,
            body: r.body,
            username: r.username ?? 'Guest',
            avatarUrl: r.avatar_url ?? null,
            createdAt: r.created_at.toISOString(),
            badges: (r.badges ?? []).slice(0, 3),
        })),
        total,
        hasMore: rows.length === limit,
    };
});
