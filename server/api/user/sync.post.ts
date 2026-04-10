/**
 * POST /api/user/sync — Bulk upload localStorage data on first login.
 *
 * Accepts the full game_results and speed_results from localStorage,
 * parses stats keys, computes dayIdx for daily results, and bulk-inserts
 * with skipDuplicates (idempotent).
 */
import { prisma } from '~/server/utils/prisma';
import { parseStatsKey } from '~/server/utils/stats-key-parser';
import { dateToDayIdx } from '~/server/utils/day-index';

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
    const session = await requireUserSession(event);
    const userId = session.user.id;
    const body = await readBody<SyncBody>(event);

    if (!body?.gameResults && !body?.speedResults) {
        throw createError({ statusCode: 400, message: 'No data to sync' });
    }

    let importedGameResults = 0;
    let importedSpeedResults = 0;

    // --- Game results ---
    if (body.gameResults && typeof body.gameResults === 'object') {
        const rows: Array<{
            userId: string;
            deviceId: string | null;
            lang: string;
            mode: string;
            playType: string;
            dayIdx: number | null;
            won: boolean;
            attempts: number;
            playedAt: Date;
        }> = [];

        for (const [statsKey, results] of Object.entries(body.gameResults)) {
            if (!Array.isArray(results)) continue;
            const parsed = parseStatsKey(statsKey);

            for (const r of results) {
                const playedAt = new Date(r.date);
                if (isNaN(playedAt.getTime())) continue;

                const attempts =
                    typeof r.attempts === 'string' ? parseInt(r.attempts, 10) || 0 : r.attempts;

                // Compute dayIdx for daily results so unique constraint deduplicates properly
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
            const result = await prisma.gameResult.createMany({
                data: rows,
                skipDuplicates: true,
            });
            importedGameResults = result.count;
        }
    }

    // --- Speed results ---
    if (body.speedResults && typeof body.speedResults === 'object') {
        const rows: Array<{
            userId: string;
            deviceId: string | null;
            lang: string;
            score: number;
            wordsSolved: number;
            wordsFailed: number;
            maxCombo: number;
            totalGuesses: number;
            playedAt: Date;
        }> = [];

        for (const [langCode, results] of Object.entries(body.speedResults)) {
            if (!Array.isArray(results)) continue;

            for (const r of results) {
                const playedAt = new Date(r.date);
                if (isNaN(playedAt.getTime())) continue;

                rows.push({
                    userId,
                    deviceId: body.deviceId ?? null,
                    lang: langCode,
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
            const result = await prisma.speedResult.createMany({
                data: rows,
                skipDuplicates: true,
            });
            importedSpeedResults = result.count;
        }
    }

    // --- Settings ---
    if (body.settings && typeof body.settings === 'object') {
        await prisma.user.update({
            where: { id: userId },
            data: { settings: body.settings },
        });
    }

    return {
        imported: {
            gameResults: importedGameResults,
            speedResults: importedSpeedResults,
        },
    };
});
