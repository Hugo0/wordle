/**
 * GET /api/[lang]/leaderboard — Daily leaderboard rankings.
 *
 * Query params:
 *   mode    — game mode (default: "classic")
 *   period  — "today" (default), "week", "month"
 *   day     — day index for "today" period (default: today)
 *   offset  — pagination offset (default: 0)
 *   limit   — page size (default: 50, max 100)
 *
 * Returns: { entries, total, you?, period, day_idx }
 *
 * Privacy: only exposes username + avatarUrl. Never email or displayName.
 */
import { prisma } from '~/server/utils/prisma';
import { requireLang, langResponseFields } from '~/server/utils/data-loader';
import { getTodaysIdx } from '~/server/lib/day-index';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

// In-memory cache: key → { data, expiresAt }
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_TODAY = 60_000; // 60s
const CACHE_TTL_AGG = 300_000; // 5min for week/month

interface LeaderboardEntry {
    rank: number;
    username: string;
    avatarUrl: string | null;
    attempts: number; // for today: actual attempts; for week/month: avg (×10 for precision)
    daysPlayed?: number; // week/month only
    playedAt: string;
}

type Period = 'today' | 'week' | 'month';
const VALID_PERIODS: Period[] = ['today', 'week', 'month'];
const MIN_DAYS: Record<Period, number> = { today: 1, week: 3, month: 10 };

export default defineEventHandler(async (event) => {
    const { lang, config } = requireLang(event);
    const query = getQuery(event);

    const mode = (query.mode as string) || 'classic';
    if (!(mode in GAME_MODE_CONFIG)) {
        throw createError({ statusCode: 400, message: `Invalid mode: ${mode}` });
    }

    const period = ((query.period as string) || 'today') as Period;
    if (!VALID_PERIODS.includes(period)) {
        throw createError({ statusCode: 400, message: `Invalid period: ${period}` });
    }

    const tz = config.timezone || 'UTC';
    const todaysIdx = getTodaysIdx(tz);
    const dayIdx = query.day ? parseInt(query.day as string, 10) : todaysIdx;
    if (isNaN(dayIdx) || dayIdx < 0 || dayIdx > todaysIdx) {
        throw createError({ statusCode: 400, message: 'Invalid day index' });
    }

    const offset = Math.max(0, parseInt(query.offset as string, 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 50));

    // Compute day range for week/month
    const { startIdx, endIdx } = getDayRange(period, dayIdx, todaysIdx);

    const cacheTtl = period === 'today' ? CACHE_TTL_TODAY : CACHE_TTL_AGG;
    const cacheKey = `${lang}:${mode}:${period}:${startIdx}-${endIdx}:${offset}:${limit}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    let publicData: { entries: LeaderboardEntry[]; total: number };

    if (cached && cached.expiresAt > now) {
        publicData = cached.data;
    } else {
        publicData =
            period === 'today'
                ? await fetchToday(lang, mode, dayIdx, offset, limit)
                : await fetchAggregate(lang, mode, startIdx, endIdx, MIN_DAYS[period], offset, limit);
        cache.set(cacheKey, { data: publicData, expiresAt: now + cacheTtl });
    }

    // Optional auth: include caller's rank
    let you: (LeaderboardEntry & { percentile: number }) | null = null;
    try {
        const session = await getUserSession(event);
        const userId = (session?.user as any)?.id;
        if (userId) {
            you =
                period === 'today'
                    ? await fetchYourRankToday(userId, lang, mode, dayIdx, publicData.total)
                    : await fetchYourRankAggregate(
                          userId,
                          lang,
                          mode,
                          startIdx,
                          endIdx,
                          MIN_DAYS[period],
                          publicData.total
                      );
        }
    } catch {
        // Not logged in
    }

    return {
        ...langResponseFields(lang, config),
        day_idx: dayIdx,
        todays_idx: todaysIdx,
        mode,
        period,
        min_days: MIN_DAYS[period],
        entries: publicData.entries,
        total: publicData.total,
        you,
    };
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDayRange(period: Period, dayIdx: number, todaysIdx: number) {
    if (period === 'today') return { startIdx: dayIdx, endIdx: dayIdx };

    if (period === 'week') {
        // Current week: go back to the most recent Monday (dayIdx % 7 alignment)
        // Simple approach: last 7 days ending today
        const startIdx = Math.max(0, todaysIdx - 6);
        return { startIdx, endIdx: todaysIdx };
    }

    // month: last 30 days
    const startIdx = Math.max(0, todaysIdx - 29);
    return { startIdx, endIdx: todaysIdx };
}

// ─── Today queries ──────────────────────────────────────────────────────────

async function fetchToday(
    lang: string,
    mode: string,
    dayIdx: number,
    offset: number,
    limit: number
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const isSpeed = mode === 'speed';
    const where = { lang, mode, playType: 'daily' as const, dayIdx, won: true };

    const [total, results] = await Promise.all([
        prisma.result.count({ where }),
        prisma.result.findMany({
            where,
            orderBy: isSpeed
                ? [{ wordsSolved: 'desc' }, { maxCombo: 'desc' }, { totalGuesses: 'asc' }]
                : [{ attempts: 'asc' }, { playedAt: 'asc' }],
            skip: offset,
            take: limit,
            select: {
                attempts: true,
                wordsSolved: true,
                maxCombo: true,
                playedAt: true,
                user: { select: { username: true, avatarUrl: true } },
            },
        }),
    ]);

    const entries: LeaderboardEntry[] = results.map(
        (r: (typeof results)[number], i: number) => ({
            rank: offset + i + 1,
            username: r.user.username,
            avatarUrl: r.user.avatarUrl,
            attempts: isSpeed ? (r.wordsSolved ?? 0) : (r.attempts ?? 0),
            playedAt: r.playedAt.toISOString(),
        })
    );

    return { entries, total };
}

async function fetchYourRankToday(
    userId: string,
    lang: string,
    mode: string,
    dayIdx: number,
    total: number
): Promise<(LeaderboardEntry & { percentile: number }) | null> {
    const isSpeed = mode === 'speed';
    const myResult = await prisma.result.findFirst({
        where: { userId, lang, mode, playType: 'daily', dayIdx, won: true },
        select: {
            attempts: true,
            wordsSolved: true,
            maxCombo: true,
            totalGuesses: true,
            playedAt: true,
            user: { select: { username: true, avatarUrl: true } },
        },
    });
    if (!myResult) return null;

    let rankAbove: number;
    if (isSpeed) {
        const ws = myResult.wordsSolved ?? 0;
        const mc = myResult.maxCombo ?? 0;
        const tg = myResult.totalGuesses ?? 999;
        rankAbove = await prisma.result.count({
            where: {
                lang,
                mode,
                playType: 'daily',
                dayIdx,
                won: true,
                OR: [
                    { wordsSolved: { gt: ws } },
                    { wordsSolved: ws, maxCombo: { gt: mc } },
                    { wordsSolved: ws, maxCombo: mc, totalGuesses: { lt: tg } },
                ],
            },
        });
    } else {
        const att = myResult.attempts ?? 999;
        const pat = myResult.playedAt;
        rankAbove = await prisma.result.count({
            where: {
                lang,
                mode,
                playType: 'daily',
                dayIdx,
                won: true,
                OR: [{ attempts: { lt: att } }, { attempts: att, playedAt: { lt: pat } }],
            },
        });
    }

    const rank = rankAbove + 1;
    const percentile = total > 0 ? Math.round((rank / total) * 100) : 0;

    return {
        rank,
        username: myResult.user.username,
        avatarUrl: myResult.user.avatarUrl,
        attempts: isSpeed ? (myResult.wordsSolved ?? 0) : (myResult.attempts ?? 0),
        playedAt: myResult.playedAt.toISOString(),
        percentile,
    };
}

// ─── Week/Month aggregate queries ───────────────────────────────────────────

interface AggRow {
    user_id: string;
    username: string;
    avatar_url: string | null;
    avg_attempts: number;
    days_played: number;
}

async function fetchAggregate(
    lang: string,
    mode: string,
    startIdx: number,
    endIdx: number,
    minDays: number,
    offset: number,
    limit: number
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const isSpeed = mode === 'speed';

    // Count qualifying players
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM (
            SELECT r.user_id FROM wordle.results r
            WHERE r.lang = $1 AND r.mode = $2 AND r.play_type = 'daily'
              AND r.day_idx >= $3 AND r.day_idx <= $4 AND r.won = true
            GROUP BY r.user_id HAVING COUNT(*) >= $5
        ) sub`,
        lang,
        mode,
        startIdx,
        endIdx,
        minDays
    );
    const total = Number(countResult[0]?.count ?? 0);

    const orderCol = isSpeed ? 'AVG(r.words_solved)' : 'AVG(r.attempts)';
    const orderDir = isSpeed ? 'DESC' : 'ASC';

    const rows = await prisma.$queryRawUnsafe<AggRow[]>(
        `SELECT r.user_id, u.username, u.avatar_url,
            ${isSpeed ? 'AVG(r.words_solved)' : 'AVG(r.attempts)'} as avg_attempts,
            COUNT(*)::int as days_played
         FROM wordle.results r
         JOIN wordle.users u ON r.user_id = u.id
         WHERE r.lang = $1 AND r.mode = $2 AND r.play_type = 'daily'
           AND r.day_idx >= $3 AND r.day_idx <= $4 AND r.won = true
         GROUP BY r.user_id, u.username, u.avatar_url
         HAVING COUNT(*) >= $5
         ORDER BY ${orderCol} ${orderDir}, MIN(r.played_at) ASC
         OFFSET $6 LIMIT $7`,
        lang,
        mode,
        startIdx,
        endIdx,
        minDays,
        offset,
        limit
    );

    const entries: LeaderboardEntry[] = rows.map((r: AggRow, i: number) => ({
        rank: offset + i + 1,
        username: r.username,
        avatarUrl: r.avatar_url,
        attempts: Math.round(Number(r.avg_attempts) * 10) / 10, // 1 decimal place
        daysPlayed: Number(r.days_played),
        playedAt: '',
    }));

    return { entries, total };
}

async function fetchYourRankAggregate(
    userId: string,
    lang: string,
    mode: string,
    startIdx: number,
    endIdx: number,
    minDays: number,
    total: number
): Promise<(LeaderboardEntry & { percentile: number }) | null> {
    const isSpeed = mode === 'speed';
    const avgCol = isSpeed ? 'AVG(r.words_solved)' : 'AVG(r.attempts)';

    // Get my aggregate
    const myRows = await prisma.$queryRawUnsafe<AggRow[]>(
        `SELECT r.user_id, u.username, u.avatar_url,
            ${avgCol} as avg_attempts,
            COUNT(*)::int as days_played
         FROM wordle.results r
         JOIN wordle.users u ON r.user_id = u.id
         WHERE r.user_id = $1 AND r.lang = $2 AND r.mode = $3 AND r.play_type = 'daily'
           AND r.day_idx >= $4 AND r.day_idx <= $5 AND r.won = true
         GROUP BY r.user_id, u.username, u.avatar_url
         HAVING COUNT(*) >= $6`,
        userId,
        lang,
        mode,
        startIdx,
        endIdx,
        minDays
    );

    if (myRows.length === 0) return null;
    const my = myRows[0]!;
    const myAvg = Number(my.avg_attempts);

    // Count players who rank above me
    const orderOp = isSpeed ? '>' : '<';
    const rankResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM (
            SELECT r.user_id, ${avgCol} as avg_att
            FROM wordle.results r
            WHERE r.lang = $1 AND r.mode = $2 AND r.play_type = 'daily'
              AND r.day_idx >= $3 AND r.day_idx <= $4 AND r.won = true
            GROUP BY r.user_id HAVING COUNT(*) >= $5
        ) sub WHERE sub.avg_att ${orderOp} $6`,
        lang,
        mode,
        startIdx,
        endIdx,
        minDays,
        myAvg
    );

    const rank = Number(rankResult[0]?.count ?? 0) + 1;
    const percentile = total > 0 ? Math.round((rank / total) * 100) : 0;

    return {
        rank,
        username: my.username,
        avatarUrl: my.avatar_url,
        attempts: Math.round(myAvg * 10) / 10,
        daysPlayed: Number(my.days_played),
        playedAt: '',
        percentile,
    };
}
