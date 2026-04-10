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

export async function evaluateBadges(
    userId: string,
    result: GameResultContext
): Promise<string[]> {
    // Fetch what the user already has
    const existingBadges = await prisma.userBadge.findMany({
        where: { userId },
        select: { badge: { select: { slug: true } } },
    });
    const earned = new Set(existingBadges.map((ub) => ub.badge.slug));

    const newBadges: string[] = [];

    function award(slug: string) {
        if (!earned.has(slug)) {
            newBadges.push(slug);
            earned.add(slug);
        }
    }

    // --- Milestone badges (check against this game) ---

    if (result.won) {
        // First Blood: first win ever
        if (!earned.has('first-blood')) {
            const totalWins = await prisma.gameResult.count({
                where: { userId, won: true },
            });
            if (totalWins >= 1) award('first-blood');
        }

        // Perfect Game: win in 1 guess
        if (result.attempts === 1) {
            award('perfect-game');
        }

        // Persistence: win on the very last guess
        if (result.attempts === result.maxGuesses) {
            award('persistence');
        }
    }

    // --- Polyglot badges (distinct languages with wins) ---

    const polyglotNeeded = [
        { slug: 'polyglot-5', threshold: 5 },
        { slug: 'polyglot-10', threshold: 10 },
        { slug: 'polyglot-20', threshold: 20 },
        { slug: 'polyglot-40', threshold: 40 },
        { slug: 'polyglot-80', threshold: 80 },
    ];

    const unearned = polyglotNeeded.filter((p) => !earned.has(p.slug));
    if (unearned.length > 0 && result.won) {
        const distinctLangs = await prisma.gameResult.groupBy({
            by: ['lang'],
            where: { userId, won: true },
            _count: true,
        });
        const langCount = distinctLangs.length;
        for (const p of unearned) {
            if (langCount >= p.threshold) award(p.slug);
        }
    }

    // --- Streak badges (consecutive daily days) ---

    const streakNeeded = [
        { slug: 'streak-7', threshold: 7 },
        { slug: 'streak-30', threshold: 30 },
        { slug: 'streak-100', threshold: 100 },
        { slug: 'streak-365', threshold: 365 },
    ];

    const unearnedStreaks = streakNeeded.filter((s) => !earned.has(s.slug));
    if (unearnedStreaks.length > 0 && result.playType === 'daily') {
        const streak = await calculateStreak(userId);
        for (const s of unearnedStreaks) {
            if (streak >= s.threshold) award(s.slug);
        }
    }

    // --- Mode Master: 50 wins in any single mode ---

    if (!earned.has('mode-master') && result.won) {
        const modeCounts = await prisma.gameResult.groupBy({
            by: ['mode'],
            where: { userId, won: true },
            _count: true,
        });
        if (modeCounts.some((m) => m._count >= 50)) {
            award('mode-master');
        }
    }

    // --- Special: daily completionist (all modes in one day) ---

    if (!earned.has('daily-completionist') && result.playType === 'daily') {
        const todaysIdx = getTodaysIdx();
        const todaysModes = await prisma.gameResult.groupBy({
            by: ['mode'],
            where: { userId, playType: 'daily', dayIdx: todaysIdx },
        });
        // 8 daily modes: classic, dordle, tridle, quordle, octordle, sedecordle, duotrigordle, semantic
        // (speed doesn't have a "daily" play type in the same sense)
        if (todaysModes.length >= 8) {
            award('daily-completionist');
        }
    }

    // --- Special: language conqueror (10+ languages in one day) ---

    if (!earned.has('language-conqueror') && result.playType === 'daily') {
        const todaysIdx = getTodaysIdx();
        const todaysLangs = await prisma.gameResult.groupBy({
            by: ['lang'],
            where: { userId, playType: 'daily', dayIdx: todaysIdx },
        });
        if (todaysLangs.length >= 10) {
            award('language-conqueror');
        }
    }

    // --- The Impossible: all modes × all languages in one day ---
    // This is aspirational — checking would be expensive and it's
    // practically unachievable. We check a simplified version:
    // 8+ modes AND 10+ languages in one day.
    if (!earned.has('the-impossible') && result.playType === 'daily') {
        const todaysIdx = getTodaysIdx();
        const [todaysModes, todaysLangs] = await Promise.all([
            prisma.gameResult.groupBy({
                by: ['mode'],
                where: { userId, playType: 'daily', dayIdx: todaysIdx },
            }),
            prisma.gameResult.groupBy({
                by: ['lang'],
                where: { userId, playType: 'daily', dayIdx: todaysIdx },
            }),
        ]);
        if (todaysModes.length >= 8 && todaysLangs.length >= 40) {
            award('the-impossible');
        }
    }

    return newBadges;
}

/**
 * Calculate current daily streak by walking backwards from today.
 */
async function calculateStreak(userId: string): Promise<number> {
    const todaysIdx = getTodaysIdx();

    // Get all distinct dayIdx values for daily results, sorted desc
    const days = await prisma.gameResult.groupBy({
        by: ['dayIdx'],
        where: {
            userId,
            playType: 'daily',
            dayIdx: { not: null },
        },
        orderBy: { dayIdx: 'desc' },
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
