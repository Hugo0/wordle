/**
 * Semantic Explorer — start a new game session.
 *
 * Deterministic daily target: `hash(lang, day_idx) % targets.length`. Everyone
 * playing the same day in the same language gets the same word.
 *
 * Returns axis metadata needed for compass hints + the target's UMAP position
 * (NOT the target word itself), so the client can center the map on it.
 */

import { createSession } from '~/server/utils/semantic';
import * as semanticDb from '~/server/utils/_semantic-db';
import { EMBEDDING_MODEL } from '~/server/utils/_semantic-db';
import { getTodaysIdx, toModeDayIdx } from '~/server/lib/day-index';

function pickDailyTarget(targets: readonly string[], lang: string, dayIdx: number): string {
    // Simple FNV-1a style hash so different langs on the same day get different words.
    let h = 2166136261;
    const key = `${lang}-${dayIdx}`;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = (h * 16777619) >>> 0;
    }
    return targets[h % targets.length]!;
}

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang') ?? 'en';

    if (lang !== 'en') {
        throw createError({
            statusCode: 404,
            message: 'Semantic Explorer is currently available in English only.',
        });
    }

    const body = await readBody(event).catch(() => ({}));
    const override = (body?.target as string | undefined)?.toLowerCase().trim();
    const debug = Boolean(body?.debug);
    const play = (body?.play as string | undefined) ?? 'daily';

    // TZ-aware day index, 1-based from April 11 2026
    const classicIdx = getTodaysIdx();
    const dayIdx = toModeDayIdx(classicIdx) ?? 1;

    // Load targets from DB
    const targets = await semanticDb.getTargets(lang);
    if (!targets.length) {
        throw createError({ statusCode: 503, message: 'Semantic Explorer is temporarily unavailable.' });
    }

    // Daily pick, unlimited random, or override via debug
    let target: string;
    if (override && (await semanticDb.wordExists(lang, override))) {
        target = override;
    } else if (play === 'unlimited') {
        target = targets[Math.floor(Math.random() * targets.length)]!;
    } else {
        target = pickDailyTarget(targets, lang, dayIdx);
    }

    const targetId = createSession(target);

    // Axis metadata from DB-cached axes (loaded at startup, 140KB)
    const cachedAxes = semanticDb.getCachedAxes();
    const axesNames = semanticDb.getCachedAxesNames();
    const axisAnchors: Record<string, { low: string; high: string }> = {};
    const axesCoherence: Record<string, number> = {};
    if (cachedAxes) {
        for (const axis of cachedAxes) {
            axisAnchors[axis.name] = { low: axis.lowAnchor, high: axis.highAnchor };
            axesCoherence[axis.name] = axis.auc;
        }
    }

    // Target position + vocab size from DB
    const [targetUmapPosition, totalRanked] = await Promise.all([
        semanticDb.get2dPosition(lang, target),
        semanticDb.getTotalRanked(lang),
    ]);

    const response: Record<string, unknown> = {
        targetId,
        lang,
        dayIdx,
        vocabularySize: totalRanked,
        axes: axesNames,
        axesCoherence,
        axisAnchors,
        modelName: EMBEDDING_MODEL,
        targetUmapPosition,
        maxGuesses: 15,
        totalRanked,
    };

    if (debug && process.env.NODE_ENV !== 'production') {
        response.debug = {
            targetWord: target,
            targetPool: targets,
        };
    }

    return response;
});
