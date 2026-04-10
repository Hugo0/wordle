/**
 * Semantic Explorer — start a new game session.
 *
 * Deterministic daily target: `hash(lang, day_idx) % targets.length`. Everyone
 * playing the same day in the same language gets the same word.
 *
 * Returns axis metadata needed for compass hints + the target's UMAP position
 * (NOT the target word itself), so the client can center the map on it.
 */

import { createSession, get2dPosition, loadSemanticDataSafe } from '~/server/utils/semantic';
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

    // Semantic Explorer is English-only for v1. The embeddings, targets, axes,
    // and UMAP data are all generated from English corpora. Serving them for
    // other languages would silently produce meaningless results.
    if (lang !== 'en') {
        throw createError({
            statusCode: 404,
            message: 'Semantic Explorer is currently available in English only.',
        });
    }

    const body = await readBody(event).catch(() => ({}));
    const override = (body?.target as string | undefined)?.toLowerCase().trim();
    const debug = Boolean(body?.debug);

    const data = loadSemanticDataSafe();
    // TZ-aware day index, 1-based from April 11 2026
    const classicIdx = getTodaysIdx();
    const dayIdx = toModeDayIdx(classicIdx) ?? 1;

    // Daily pick (or override via debug)
    let target: string;
    if (override && data.wordIndex.has(override)) {
        target = override;
    } else {
        target = pickDailyTarget(data.targets, lang, dayIdx);
    }

    const targetId = createSession(target);

    // Anchor words for compass hint labels (no target word leak)
    const axisAnchors: Record<string, { low: string; high: string }> = {};
    for (const name of data.axesNames) {
        const axis = data.axes[name];
        if (axis) axisAnchors[name] = { low: axis.low_anchor, high: axis.high_anchor };
    }

    const targetUmapPosition = get2dPosition(data, target);

    const response: Record<string, unknown> = {
        targetId,
        lang,
        dayIdx,
        vocabularySize: data.vocabulary.length,
        axes: data.axesNames,
        axesCoherence: data.axesAuc,
        axisAnchors,
        modelName: data.modelName,
        targetUmapPosition,
        maxGuesses: 15,
        totalRanked: data.words.length,
    };

    if (debug) {
        response.debug = {
            targetWord: target,
            targetPool: data.targets,
        };
    }

    return response;
});
