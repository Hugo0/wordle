/**
 * GET /api/[lang]/word-explore/[slug]
 *
 * Semantic exploration data for a word: normalized axis projections,
 * nearest neighbors, UMAP coordinates. For out-of-vocab words,
 * fetches an embedding on-demand via OpenAI (stored in DB).
 * Non-English languages return `available: false`.
 */
import { cosineSimilarity } from '../../../utils/semantic';
import * as semanticDb from '~/server/utils/_semantic-db';
import { resolveWordSlug } from '../../../utils/word-selection';
import { loadAllData } from '../../../utils/data-loader';

const EMPTY_RESPONSE = {
    projections: [] as Array<unknown>,
    nearest: [] as Array<{ word: string; similarity: number }>,
    umap: null as [number, number] | null,
    similarityTo: null as number | null,
    available: false,
};

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang')!;
    const slug = decodeURIComponent(getRouterParam(event, 'slug')!);
    const query = getQuery(event);
    const relativeTo = typeof query.relativeTo === 'string' ? query.relativeTo.toLowerCase() : null;

    const data = loadAllData();
    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Unknown language' });
    }

    const resolved = resolveWordSlug(lang, slug);
    if (resolved.kind === 'invalid') {
        throw createError({ statusCode: 400, message: 'Invalid slug' });
    }
    const word = resolved.word;
    if (!word) {
        throw createError({ statusCode: 404, message: 'Word not found' });
    }

    if (lang !== 'en') {
        return { word, inVocab: false, ...EMPTY_RESPONSE };
    }

    // Get embedding from DB (or fetch on-demand via OpenAI)
    let vec = await semanticDb.getEmbedding(lang, word);
    const inVocab = vec !== null;
    if (!vec) {
        vec = await semanticDb.fetchOnDemandEmbedding(lang, word);
    }
    if (!vec) {
        return { word, inVocab: false, ...EMPTY_RESPONSE };
    }

    // Per-axis projections from DB-cached axes
    const cachedAxes = semanticDb.getCachedAxes();
    const axesVectors = semanticDb.getCachedAxesVectors();
    const axesNames = semanticDb.getCachedAxesNames();
    const D = vec.length;
    const projections = [];

    if (cachedAxes && axesVectors) {
        for (let a = 0; a < axesNames.length; a++) {
            const axis = cachedAxes[a]!;
            if (axis.auc < 0.8) continue;
            let raw = 0;
            const rowOffset = a * D;
            for (let j = 0; j < D; j++) {
                raw += vec[j]! * axesVectors[rowOffset + j]!;
            }
            // Normalize using p5/p95 range
            let normalized = 0.5;
            if (axis.rangeP95 !== axis.rangeP5) {
                normalized = Math.max(0, Math.min(1,
                    (raw - axis.rangeP5) / (axis.rangeP95 - axis.rangeP5)
                ));
            }
            projections.push({
                axis: axis.name,
                lowAnchor: axis.lowAnchor,
                highAnchor: axis.highAnchor,
                normalized,
                rawProjection: raw,
            });
        }
    }

    // Nearest neighbors via pgvector HNSW — includes UMAP coords
    const neighbors = await semanticDb.knnNearest(lang, word, 80, [word]);
    const nearest = neighbors.map((n) => ({
        word: n.word,
        similarity: n.similarity,
        umap: n.umapX != null ? [n.umapX, n.umapY] as [number, number] : null,
    }));

    // UMAP position for this word
    const umap = await semanticDb.get2dPosition(lang, word);

    // Cosine similarity to relativeTo word (for context word layout)
    let similarityTo: number | null = null;
    if (relativeTo) {
        if (relativeTo === word) {
            similarityTo = 1;
        } else {
            let otherVec = await semanticDb.getEmbedding(lang, relativeTo);
            if (!otherVec) otherVec = await semanticDb.fetchOnDemandEmbedding(lang, relativeTo);
            if (otherVec) similarityTo = cosineSimilarity(vec, otherVec);
        }
    }

    return {
        word,
        inVocab,
        projections,
        nearest,
        umap,
        similarityTo,
        available: true,
    };
});
