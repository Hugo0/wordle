/**
 * Badge evaluation — checks which badges a user has newly earned.
 *
 * Called after each game result is saved. Returns slugs of newly
 * earned badges (empty array if none). The caller creates UserBadge rows.
 */
import { prisma } from '~/server/utils/prisma';
import { getTodaysIdx } from '~/server/lib/day-index';

interface GameResultContext {
    won: boolean;
    attempts: number;
    maxGuesses: number;
    mode: string;
    lang: string;
    playType: string;
}

export async function evaluateBadges(userId: string, result: GameResultContext): Promise<string[]> {
    // Fetch what the user already has
    const existingBadges = await prisma.userBadge.findMany({
        where: { userId },
        select: { badge: { select: { slug: true } } },
    });
    const earned = new Set(existingBadges.map((ub: { badge: { slug: string } }) => ub.badge.slug));

    const newBadges: string[] = [];

    function award(slug: string) {
        if (!earned.has(slug)) {
            newBadges.push(slug);
            earned.add(slug);
        }
    }

    // --- Per-game milestones (only if current game was a win) ---

    if (result.won) {
        if (result.attempts === 1) award('perfect-game');
        if (result.attempts === result.maxGuesses) award('persistence');
    }

    // --- Parallel aggregate queries ---
    // Run all independent DB checks concurrently to minimize latency.

    const needsFirstBlood = !earned.has('first-blood');
    const needsPolyglot = [2, 5, 10, 20, 40, 80].some((t) => !earned.has(`polyglot-${t}`));
    const needsStreak = [3, 7, 30, 100, 365].some((t) => !earned.has(`streak-${t}`));
    const needsModeMaster = !earned.has('mode-master') || !earned.has('mode-master-10');
    const needsDaily =
        result.playType === 'daily' &&
        (!earned.has('daily-completionist') ||
            !earned.has('language-conqueror') ||
            !earned.has('the-impossible'));
    const todaysIdx = needsDaily ? getTodaysIdx() : 0;

    const [totalWins, distinctLangs, streak, modeCounts, todaysModes, todaysLangs] =
        await Promise.all([
            needsFirstBlood ? prisma.result.count({ where: { userId, won: true } }) : 0,
            needsPolyglot
                ? prisma.result.groupBy({ by: ['lang'], where: { userId, won: true } })
                : [],
            needsStreak ? calculateStreak(userId) : 0,
            needsModeMaster
                ? prisma.result.groupBy({
                      by: ['mode'],
                      where: { userId, won: true },
                      _count: true,
                  })
                : [],
            needsDaily
                ? prisma.result.groupBy({
                      by: ['mode'],
                      where: { userId, playType: 'daily', dayIdx: todaysIdx },
                  })
                : [],
            needsDaily
                ? prisma.result.groupBy({
                      by: ['lang'],
                      where: { userId, playType: 'daily', dayIdx: todaysIdx },
                  })
                : [],
        ]);

    // First Blood
    if (needsFirstBlood && totalWins >= 1) award('first-blood');

    // Polyglot series
    const langCount = (distinctLangs as { lang: string }[]).length;
    for (const t of [2, 5, 10, 20, 40, 80]) {
        if (!earned.has(`polyglot-${t}`) && langCount >= t) award(`polyglot-${t}`);
    }

    // Streak series
    for (const t of [3, 7, 30, 100, 365]) {
        if (!earned.has(`streak-${t}`) && (streak as number) >= t) award(`streak-${t}`);
    }

    // Mode mastery series
    const maxModeCount = Math.max(0, ...(modeCounts as { _count: number }[]).map((m) => m._count));
    if (!earned.has('mode-master-10') && maxModeCount >= 10) award('mode-master-10');
    if (!earned.has('mode-master') && maxModeCount >= 50) award('mode-master');

    // Daily specials (reuse todaysModes/todaysLangs — one query each, not duplicated)
    if (needsDaily) {
        const modesCount = (todaysModes as unknown[]).length;
        const langsCount = (todaysLangs as unknown[]).length;

        if (!earned.has('daily-completionist') && modesCount >= 8) award('daily-completionist');
        if (!earned.has('language-conqueror') && langsCount >= 10) award('language-conqueror');
        if (!earned.has('the-impossible') && modesCount >= 8 && langsCount >= 40)
            award('the-impossible');
    }

    return newBadges;
}

/**
 * Compute current progress values for each badge group.
 * Returns raw counts keyed by group name — the frontend divides by
 * each badge's threshold to get a percentage.
 */
export async function computeBadgeProgress(userId: string): Promise<Record<string, number>> {
    const [totalWins, distinctLangs, streak, modeCounts] = await Promise.all([
        prisma.result.count({ where: { userId, won: true } }),
        prisma.result.groupBy({ by: ['lang'], where: { userId, won: true } }),
        calculateStreak(userId),
        prisma.result.groupBy({ by: ['mode'], where: { userId, won: true }, _count: true }),
    ]);

    return {
        'first-blood': totalWins,
        polyglot: distinctLangs.length,
        streak: streak,
        mode: Math.max(0, ...modeCounts.map((m: { mode: string; _count: number }) => m._count)),
    };
}

/**
 * Calculate current daily streak by walking backwards from today.
 */
async function calculateStreak(userId: string): Promise<number> {
    const todaysIdx = getTodaysIdx();

    // Get recent distinct dayIdx values (limit 400 — max badge is 365-day streak)
    const days = await prisma.result.groupBy({
        by: ['dayIdx'],
        where: {
            userId,
            playType: 'daily',
            dayIdx: { not: null },
        },
        orderBy: { dayIdx: 'desc' },
        take: 400,
    });

    if (days.length === 0) return 0;

    let streak = 0;
    let expectedIdx = todaysIdx;

    for (const day of days) {
        if (day.dayIdx === expectedIdx) {
            streak++;
            expectedIdx--;
        } else if (day.dayIdx === todaysIdx - 1 && streak === 0) {
            // Today not yet played, start from yesterday
            expectedIdx = todaysIdx - 1;
            if (day.dayIdx === expectedIdx) {
                streak++;
                expectedIdx--;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    return streak;
}
