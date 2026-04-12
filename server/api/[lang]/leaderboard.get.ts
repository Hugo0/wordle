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
import { getTodaysIdx, idxToDate } from '~/server/lib/day-index';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

// In-memory cache with max size eviction
const MAX_CACHE_SIZE = 500;
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_TODAY = 60_000; // 60s
const CACHE_TTL_AGG = 300_000; // 5min for week/month
const CACHE_TTL_GLOBAL = 600_000; // 10min for global streaks/records

function cacheSet(key: string, data: any, ttl: number) {
    // Evict expired entries when cache grows large
    if (cache.size >= MAX_CACHE_SIZE) {
        const now = Date.now();
        for (const [k, v] of cache) {
            if (v.expiresAt <= now) cache.delete(k);
        }
        // If still too large, drop oldest half
        if (cache.size >= MAX_CACHE_SIZE) {
            const keys = [...cache.keys()];
            for (let i = 0; i < keys.length / 2; i++) cache.delete(keys[i]!);
        }
    }
    cache.set(key, { data, expiresAt: Date.now() + ttl });
}

interface LeaderboardEntry {
    rank: number;
    username: string;
    avatarUrl: string | null;
    attempts: number; // for today: actual attempts; for week/month: avg
    score?: number; // speed mode: points
    wordsSolved?: number; // speed mode: words completed
    daysPlayed?: number; // week/month only
    playedAt: string;
}

type Period = 'today' | 'week' | 'month' | 'streaks' | 'records';
const VALID_PERIODS: Period[] = ['today', 'week', 'month', 'streaks', 'records'];
const MIN_DAYS: Record<Period, number> = { today: 1, week: 3, month: 10, streaks: 1, records: 1 };

interface RecordEntry {
    label: string;
    value: string;
    username: string;
    avatarUrl: string | null;
}

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
    const rawDay = query.day as string | undefined;
    const dayIdx = rawDay && rawDay !== 'null' && rawDay !== '' ? parseInt(rawDay, 10) : todaysIdx;
    if (isNaN(dayIdx) || dayIdx < 0 || dayIdx > todaysIdx) {
        throw createError({ statusCode: 400, message: 'Invalid day index' });
    }

    const offset = Math.max(0, parseInt(query.offset as string, 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 50));

    // Compute day range for week/month
    const { startIdx, endIdx } = getDayRange(period, dayIdx, todaysIdx);

    // Records: global (all languages, all modes)
    if (period === 'records') {
        const recordsCacheKey = 'global:records';
        const now = Date.now();
        const cachedRecords = cache.get(recordsCacheKey);
        let records: RecordEntry[];
        if (cachedRecords && cachedRecords.expiresAt > now) {
            records = cachedRecords.data;
        } else {
            records = await fetchRecords(todaysIdx);
            cacheSet(recordsCacheKey, records, CACHE_TTL_GLOBAL);
        }
        return {
            ...langResponseFields(lang, config),
            day_idx: dayIdx,
            todays_idx: todaysIdx,
            mode,
            period,
            min_days: 1,
            entries: [],
            total: 0,
            you: null,
            records,
        };
    }

    const isStreaksPeriod = period === 'streaks';
    const cacheTtl = isStreaksPeriod
        ? CACHE_TTL_GLOBAL
        : period === 'today'
          ? CACHE_TTL_TODAY
          : CACHE_TTL_AGG;
    const cacheKey = isStreaksPeriod
        ? `global:streaks:${offset}:${limit}`
        : `${lang}:${mode}:${period}:${startIdx}-${endIdx}:${offset}:${limit}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    let publicData: { entries: LeaderboardEntry[]; total: number };

    if (cached && cached.expiresAt > now) {
        publicData = cached.data;
    } else {
        publicData =
            period === 'today'
                ? await fetchToday(lang, mode, dayIdx, offset, limit)
                : isStreaksPeriod
                  ? await fetchStreaks(todaysIdx, offset, limit)
                  : await fetchAggregate(
                        lang,
                        mode,
                        startIdx,
                        endIdx,
                        MIN_DAYS[period],
                        offset,
                        limit
                    );
        cacheSet(cacheKey, publicData, cacheTtl);
    }

    // Optional auth: include caller's rank
    let you: (LeaderboardEntry & { percentile: number }) | null = null;
    try {
        const session = await getUserSession(event);
        const userId = (session?.user as any)?.id;
        if (userId) {
            if (period === 'streaks') {
                you = await fetchYourStreak(userId, todaysIdx, publicData.total);
            } else if (period === 'today') {
                you = await fetchYourRankToday(userId, lang, mode, dayIdx, publicData.total);
            } else {
                you = await fetchYourRankAggregate(
                    userId,
                    lang,
                    mode,
                    startIdx,
                    endIdx,
                    MIN_DAYS[period],
                    publicData.total
                );
            }
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

// Speed results are stored differently: playType='unlimited', won=null, no dayIdx.
// Filter by date range (today's UTC day) instead of dayIdx.
function speedWhereForDay(lang: string, dayIdx: number) {
    const date = idxToDate(dayIdx);
    const dayStart = new Date(date);
    const dayEnd = new Date(date.getTime() + 86400000);
    return {
        lang,
        mode: 'speed' as const,
        playedAt: { gte: dayStart, lt: dayEnd },
    };
}

async function fetchToday(
    lang: string,
    mode: string,
    dayIdx: number,
    offset: number,
    limit: number
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const isSpeed = mode === 'speed';
    const where = isSpeed
        ? speedWhereForDay(lang, dayIdx)
        : { lang, mode, playType: 'daily' as const, dayIdx, won: true };

    const [total, results] = await Promise.all([
        prisma.result.count({ where }),
        prisma.result.findMany({
            where,
            orderBy: isSpeed
                ? [{ score: 'desc' }, { wordsSolved: 'desc' }, { maxCombo: 'desc' }]
                : [{ attempts: 'asc' }, { playedAt: 'asc' }],
            skip: offset,
            take: limit,
            select: {
                attempts: true,
                score: true,
                wordsSolved: true,
                maxCombo: true,
                playedAt: true,
                user: { select: { username: true, avatarUrl: true } },
            },
        }),
    ]);

    const entries: LeaderboardEntry[] = results.map((r: (typeof results)[number], i: number) => ({
        rank: offset + i + 1,
        username: r.user.username,
        avatarUrl: r.user.avatarUrl,
        attempts: isSpeed ? (r.score ?? 0) : (r.attempts ?? 0),
        score: isSpeed ? (r.score ?? 0) : undefined,
        wordsSolved: isSpeed ? (r.wordsSolved ?? 0) : undefined,
        playedAt: r.playedAt.toISOString(),
    }));

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
    const myWhere = isSpeed
        ? { userId, ...speedWhereForDay(lang, dayIdx) }
        : { userId, lang, mode, playType: 'daily' as const, dayIdx, won: true };
    const myResult = await prisma.result.findFirst({
        where: myWhere,
        ...(isSpeed ? { orderBy: { score: 'desc' as const } } : {}),
        select: {
            attempts: true,
            score: true,
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
        const sc = myResult.score ?? 0;
        const ws = myResult.wordsSolved ?? 0;
        const mc = myResult.maxCombo ?? 0;
        rankAbove = await prisma.result.count({
            where: {
                ...speedWhereForDay(lang, dayIdx),
                OR: [
                    { score: { gt: sc } },
                    { score: sc, wordsSolved: { gt: ws } },
                    { score: sc, wordsSolved: ws, maxCombo: { gt: mc } },
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
        attempts: isSpeed ? (myResult.score ?? 0) : (myResult.attempts ?? 0),
        score: isSpeed ? (myResult.score ?? 0) : undefined,
        wordsSolved: isSpeed ? (myResult.wordsSolved ?? 0) : undefined,
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
    avg_words_solved?: number;
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

    const orderCol = isSpeed ? 'AVG(r.score)' : 'AVG(r.attempts)';
    const orderDir = isSpeed ? 'DESC' : 'ASC';

    const rows = await prisma.$queryRawUnsafe<AggRow[]>(
        `SELECT r.user_id, u.username, u.avatar_url,
            ${isSpeed ? 'AVG(r.score)' : 'AVG(r.attempts)'} as avg_attempts
            ${isSpeed ? ', AVG(r.words_solved) as avg_words_solved' : ''},
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
        wordsSolved:
            isSpeed && r.avg_words_solved != null
                ? Math.round(Number(r.avg_words_solved) * 10) / 10
                : undefined,
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
    const avgCol = isSpeed ? 'AVG(r.score)' : 'AVG(r.attempts)';

    // Get my aggregate
    const myRows = await prisma.$queryRawUnsafe<AggRow[]>(
        `SELECT r.user_id, u.username, u.avatar_url,
            ${avgCol} as avg_attempts
            ${isSpeed ? ', AVG(r.words_solved) as avg_words_solved' : ''},
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
        wordsSolved:
            isSpeed && my.avg_words_solved != null
                ? Math.round(Number(my.avg_words_solved) * 10) / 10
                : undefined,
        daysPlayed: Number(my.days_played),
        playedAt: '',
        percentile,
    };
}

// ─── Streaks (global — all languages, all modes) ────────────────────────────

// Global streaks CTE: any daily win across any lang/mode counts toward the streak.
const GLOBAL_STREAKS_CTE = `WITH daily_plays AS (
    SELECT DISTINCT user_id, day_idx FROM wordle.results
    WHERE play_type = 'daily' AND won = true
), gaps AS (
    SELECT user_id, day_idx,
           day_idx - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day_idx) AS grp
    FROM daily_plays
), streaks AS (
    SELECT user_id, COUNT(*)::int AS streak_len, MAX(day_idx) AS last_day
    FROM gaps GROUP BY user_id, grp
)`;

interface StreakRow {
    user_id: string;
    username: string;
    avatar_url: string | null;
    streak_len: number;
    last_day: number;
}

async function fetchStreaks(
    todaysIdx: number,
    offset: number,
    limit: number
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const [countResult, rows] = await Promise.all([
        prisma.$queryRawUnsafe<[{ count: bigint }]>(
            `${GLOBAL_STREAKS_CTE} SELECT COUNT(*)::bigint as count FROM streaks WHERE last_day >= $1 - 1`,
            todaysIdx
        ),
        prisma.$queryRawUnsafe<StreakRow[]>(
            `${GLOBAL_STREAKS_CTE} SELECT s.user_id, u.username, u.avatar_url, s.streak_len, s.last_day
             FROM streaks s JOIN wordle.users u ON s.user_id = u.id
             WHERE s.last_day >= $1 - 1
             ORDER BY s.streak_len DESC, s.last_day DESC
             OFFSET $2 LIMIT $3`,
            todaysIdx,
            offset,
            limit
        ),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const entries: LeaderboardEntry[] = rows.map((r: StreakRow, i: number) => ({
        rank: offset + i + 1,
        username: r.username,
        avatarUrl: r.avatar_url,
        attempts: Number(r.streak_len),
        daysPlayed: Number(r.streak_len),
        playedAt: '',
    }));

    return { entries, total };
}

async function fetchYourStreak(
    userId: string,
    todaysIdx: number,
    total: number
): Promise<(LeaderboardEntry & { percentile: number }) | null> {
    const rows = await prisma.$queryRawUnsafe<StreakRow[]>(
        `WITH daily_plays AS (
            SELECT DISTINCT user_id, day_idx FROM wordle.results
            WHERE user_id = $1 AND play_type = 'daily' AND won = true
        ), gaps AS (
            SELECT user_id, day_idx, day_idx - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day_idx) AS grp
            FROM daily_plays
        ), streaks AS (
            SELECT user_id, COUNT(*)::int AS streak_len, MAX(day_idx) AS last_day
            FROM gaps GROUP BY user_id, grp
        )
        SELECT s.user_id, u.username, u.avatar_url, s.streak_len, s.last_day
        FROM streaks s JOIN wordle.users u ON s.user_id = u.id
        WHERE s.last_day >= $2 - 1
        ORDER BY s.streak_len DESC LIMIT 1`,
        userId,
        todaysIdx
    );

    if (rows.length === 0) return null;
    const my = rows[0]!;
    const myStreak = Number(my.streak_len);

    const rankResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `${GLOBAL_STREAKS_CTE} SELECT COUNT(*)::bigint as count FROM streaks
         WHERE last_day >= $1 - 1 AND streak_len > $2`,
        todaysIdx,
        myStreak
    );

    const rank = Number(rankResult[0]?.count ?? 0) + 1;
    const percentile = total > 0 ? Math.round((rank / total) * 100) : 0;

    return {
        rank,
        username: my.username,
        avatarUrl: my.avatar_url,
        attempts: myStreak,
        daysPlayed: myStreak,
        playedAt: '',
        percentile,
    };
}

// ─── Records (Hall of Fame) ─────────────────────────────────────────────────

async function fetchRecords(_todaysIdx: number): Promise<RecordEntry[]> {
    // All records are global — across all languages and modes
    const [streakRows, gamesRows, langsRows, avgRows] = await Promise.all([
        // 1. Longest streak ever (global)
        prisma.$queryRawUnsafe<StreakRow[]>(
            `${GLOBAL_STREAKS_CTE} SELECT s.user_id, u.username, u.avatar_url, s.streak_len, s.last_day
             FROM streaks s JOIN wordle.users u ON s.user_id = u.id
             ORDER BY s.streak_len DESC LIMIT 1`
        ),
        // 2. Most games played (global, all modes)
        prisma.$queryRawUnsafe<
            { username: string; avatar_url: string | null; game_count: number }[]
        >(
            `SELECT u.username, u.avatar_url, COUNT(*)::int AS game_count
             FROM wordle.results r JOIN wordle.users u ON r.user_id = u.id
             WHERE r.play_type = 'daily' AND r.won = true
             GROUP BY u.id, u.username, u.avatar_url
             ORDER BY game_count DESC LIMIT 1`
        ),
        // 3. Most languages played (global)
        prisma.$queryRawUnsafe<{ username: string; avatar_url: string | null; val: number }[]>(
            `SELECT u.username, u.avatar_url, COUNT(DISTINCT r.lang)::int AS val
             FROM wordle.results r JOIN wordle.users u ON r.user_id = u.id
             WHERE r.play_type = 'daily' AND r.won = true
             GROUP BY u.id, u.username, u.avatar_url
             ORDER BY val DESC LIMIT 1`
        ),
        // 4. Best speed score ever (global)
        prisma.$queryRawUnsafe<
            { username: string; avatar_url: string | null; best_score: number }[]
        >(
            `SELECT u.username, u.avatar_url, MAX(r.score)::int AS best_score
             FROM wordle.results r JOIN wordle.users u ON r.user_id = u.id
             WHERE r.mode = 'speed' AND r.play_type = 'daily' AND r.score IS NOT NULL
             GROUP BY u.id, u.username, u.avatar_url
             ORDER BY best_score DESC LIMIT 1`
        ),
    ]);

    const records: RecordEntry[] = [];

    if (streakRows.length > 0) {
        const s = streakRows[0]!;
        records.push({
            label: 'Longest Streak',
            value: `${s.streak_len} days`,
            username: s.username,
            avatarUrl: s.avatar_url,
        });
    }
    if (gamesRows.length > 0) {
        const g = gamesRows[0]!;
        records.push({
            label: 'Most Games Won',
            value: `${g.game_count} wins`,
            username: g.username,
            avatarUrl: g.avatar_url,
        });
    }
    if (langsRows.length > 0) {
        const l = langsRows[0]!;
        records.push({
            label: 'Most Languages',
            value: `${l.val} languages`,
            username: l.username,
            avatarUrl: l.avatar_url,
        });
    }
    if (avgRows.length > 0) {
        const sp = avgRows[0]!;
        records.push({
            label: 'Best Speed Score',
            value: `${Number(sp.best_score).toLocaleString()} pts`,
            username: sp.username,
            avatarUrl: sp.avatar_url,
        });
    }

    return records;
}
