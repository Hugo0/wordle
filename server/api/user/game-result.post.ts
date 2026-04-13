/**
 * POST /api/user/game-result — Save a single game result.
 *
 * Called after each game completion for logged-in users.
 * For daily results (with dayIdx), uses upsert to handle retries.
 * After saving, evaluates badges and returns any newly earned ones.
 */
import { prisma } from '~/server/utils/prisma';
import { parseStatsKey } from '~/server/utils/stats-key-parser';
import { evaluateBadges } from '~/server/utils/badge-evaluator';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

interface GameResultBody {
    statsKey: string;
    won: boolean;
    attempts: number;
    dayIdx?: number;
    deviceId?: string;
}

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const userId = session.user.id;
    const body = await readBody<GameResultBody>(event);

    if (!body?.statsKey || typeof body.won !== 'boolean' || typeof body.attempts !== 'number') {
        throw createError({ statusCode: 400, message: 'Invalid game result' });
    }
    // Validate stats key format: lang code with optional mode/play type suffixes
    if (!/^[a-z]{2,5}(?:_[a-z0-9]+)*$/.test(body.statsKey)) {
        throw createError({ statusCode: 400, message: 'Invalid stats key format' });
    }
    if (body.attempts < 0 || body.attempts > 50) {
        throw createError({ statusCode: 400, message: 'Invalid attempts value' });
    }

    const parsed = parseStatsKey(body.statsKey);
    const playedAt = new Date();
    const dayIdx = body.dayIdx ?? null;

    let resultId: string;

    // For daily results with dayIdx, upsert to handle client retries
    if (dayIdx !== null) {
        const result = await prisma.result.upsert({
            where: {
                unique_daily_result: {
                    userId,
                    lang: parsed.lang,
                    mode: parsed.mode,
                    playType: parsed.playType,
                    dayIdx,
                },
            },
            create: {
                userId,
                deviceId: body.deviceId ?? null,
                lang: parsed.lang,
                mode: parsed.mode,
                playType: parsed.playType,
                dayIdx,
                won: body.won,
                attempts: body.attempts,
                playedAt,
            },
            update: {},
        });
        resultId = result.id;
    } else {
        // Unlimited results: always create (no dedup)
        const result = await prisma.result.create({
            data: {
                userId,
                deviceId: body.deviceId ?? null,
                lang: parsed.lang,
                mode: parsed.mode,
                playType: parsed.playType,
                dayIdx: null,
                won: body.won,
                attempts: body.attempts,
                playedAt,
            },
        });
        resultId = result.id;
    }

    // Evaluate badges
    const modeConfig = GAME_MODE_CONFIG[parsed.mode as keyof typeof GAME_MODE_CONFIG];
    const maxGuesses = modeConfig?.maxGuesses ?? 6;

    let newBadges: Array<{ slug: string; name: string; description: string; icon: string }> = [];
    try {
        const newSlugs = await evaluateBadges(userId, {
            won: body.won,
            attempts: body.attempts,
            maxGuesses,
            mode: parsed.mode,
            lang: parsed.lang,
            playType: parsed.playType,
        });

        if (newSlugs.length > 0) {
            // Look up badge details for the newly earned ones
            const badges = await prisma.badge.findMany({
                where: { slug: { in: newSlugs } },
                select: { id: true, slug: true, name: true, description: true, icon: true },
            });

            // Create UserBadge rows
            await prisma.userBadge.createMany({
                data: badges.map(
                    (b: {
                        id: string;
                        slug: string;
                        name: string;
                        description: string;
                        icon: string;
                    }) => ({
                        userId,
                        badgeId: b.id,
                    })
                ),
                skipDuplicates: true,
            });

            newBadges = badges.map(
                (b: {
                    id: string;
                    slug: string;
                    name: string;
                    description: string;
                    icon: string;
                }) => ({
                    slug: b.slug,
                    name: b.name,
                    description: b.description,
                    icon: b.icon,
                })
            );
        }
    } catch (e) {
        // Badge evaluation is non-critical — don't fail the game result save
        console.error('[badges] evaluation failed:', (e as Error).message);
    }

    return { id: resultId, newBadges };
});
