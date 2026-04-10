/**
 * POST /api/user/sync — Bulk upload localStorage data on first login.
 *
 * Accepts game_results and speed_results from localStorage,
 * parses stats keys, computes dayIdx for daily results, and bulk-inserts
 * into the unified results table with skipDuplicates (idempotent).
 * Also evaluates badges retroactively after import.
 */
import { prisma } from '~/server/utils/prisma';
import { parseStatsKey } from '~/server/utils/stats-key-parser';
import { dateToDayIdx } from '~/server/utils/day-index';
import { evaluateBadges } from '~/server/utils/badge-evaluator';

interface SyncBody {
    gameResults: Record<string, Array<{ won: boolean; attempts: number | string; date: string }>>;
    speedResults: Record<
        string,
        Array<{
            date: string;
            score: number;
            wordsSolved: number;
            wordsFailed: number;
            maxCombo: number;
            totalGuesses: number;
        }>
    >;
    settings?: Record<string, boolean>;
    deviceId?: string;
}

export default defineEventHandler(async (event) => {
    rateLimit(event, 'user:sync', 5, 60 * 60 * 1000); // 5 per hour
    const session = await requireUserSession(event);
    const userId = session.user.id;
    const body = await readBody<SyncBody>(event);

    if (!body?.gameResults && !body?.speedResults) {
        throw createError({ statusCode: 400, message: 'No data to sync' });
    }

    // Payload size guard — prevent DoS via massive arrays
    const MAX_KEYS = 200;
    const MAX_RESULTS_PER_KEY = 500;
    const gameKeys = body.gameResults ? Object.keys(body.gameResults) : [];
    const speedKeys = body.speedResults ? Object.keys(body.speedResults) : [];
    if (gameKeys.length > MAX_KEYS || speedKeys.length > MAX_KEYS) {
        throw createError({ statusCode: 413, message: 'Too many languages in sync payload' });
    }
    for (const key of gameKeys) {
        if (body.gameResults[key]?.length > MAX_RESULTS_PER_KEY) {
            throw createError({ statusCode: 413, message: 'Too many results per language' });
        }
    }
    for (const key of speedKeys) {
        if (body.speedResults[key]?.length > MAX_RESULTS_PER_KEY) {
            throw createError({ statusCode: 413, message: 'Too many results per language' });
        }
    }

    let importedResults = 0;

    // --- Game results (classic, dordle, quordle, semantic, etc.) ---
    if (body.gameResults && typeof body.gameResults === 'object') {
        const rows: Parameters<typeof prisma.result.createMany>[0]['data'] = [];

        for (const [statsKey, results] of Object.entries(body.gameResults)) {
            if (!Array.isArray(results)) continue;
            const parsed = parseStatsKey(statsKey);

            for (const r of results) {
                const playedAt = new Date(r.date);
                if (isNaN(playedAt.getTime())) continue;

                const attempts =
                    typeof r.attempts === 'string' ? parseInt(r.attempts, 10) || 0 : r.attempts;
                const dayIdx = parsed.playType === 'daily' ? dateToDayIdx(playedAt) : null;

                rows.push({
                    userId,
                    deviceId: body.deviceId ?? null,
                    lang: parsed.lang,
                    mode: parsed.mode,
                    playType: parsed.playType,
                    dayIdx,
                    won: !!r.won,
                    attempts,
                    playedAt,
                });
            }
        }

        if (rows.length > 0) {
            const result = await prisma.result.createMany({ data: rows, skipDuplicates: true });
            importedResults += result.count;
        }
    }

    // --- Speed results ---
    if (body.speedResults && typeof body.speedResults === 'object') {
        const rows: Parameters<typeof prisma.result.createMany>[0]['data'] = [];

        for (const [langCode, results] of Object.entries(body.speedResults)) {
            if (!Array.isArray(results)) continue;

            for (const r of results) {
                const playedAt = new Date(r.date);
                if (isNaN(playedAt.getTime())) continue;

                rows.push({
                    userId,
                    deviceId: body.deviceId ?? null,
                    lang: langCode,
                    mode: 'speed',
                    playType: 'unlimited',
                    won: null,
                    attempts: null,
                    score: r.score ?? 0,
                    wordsSolved: r.wordsSolved ?? 0,
                    wordsFailed: r.wordsFailed ?? 0,
                    maxCombo: r.maxCombo ?? 0,
                    totalGuesses: r.totalGuesses ?? 0,
                    playedAt,
                });
            }
        }

        if (rows.length > 0) {
            const result = await prisma.result.createMany({ data: rows, skipDuplicates: true });
            importedResults += result.count;
        }
    }

    // --- Settings ---
    if (body.settings && typeof body.settings === 'object') {
        await prisma.user.update({
            where: { id: userId },
            data: { settings: body.settings },
        });
    }

    // --- Retroactive badge evaluation ---
    // Use won: false so per-game badges (perfect-game, persistence) don't fire.
    // Only aggregate badges (first-blood, polyglot, streak, mode-master) are checked.
    try {
        const newBadges = await evaluateBadges(userId, {
            won: false,
            attempts: 0,
            maxGuesses: 6,
            mode: 'classic',
            lang: 'en',
            playType: 'daily',
        });
        if (newBadges.length > 0) {
            const badges = await prisma.badge.findMany({
                where: { slug: { in: newBadges } },
                select: { id: true },
            });
            await prisma.userBadge.createMany({
                data: badges.map((b) => ({ userId, badgeId: b.id })),
                skipDuplicates: true,
            });
        }
    } catch {
        // Badge evaluation is non-critical
    }

    return { imported: { results: importedResults } };
});
