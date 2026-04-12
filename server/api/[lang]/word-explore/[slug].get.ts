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

    let vec = await semanticDb.getEmbedding(lang, word);
    const inVocab = vec !== null;
    if (!vec) {
        vec = await semanticDb.fetchOnDemandEmbedding(lang, word);
    }
    if (!vec) {
        return { word, inVocab: false, ...EMPTY_RESPONSE };
    }

    const projections = semanticDb.projectAxesDetailed(vec, 0.8);

    // Parallel: neighbors + position (vec already in hand, use knnNearestByVector)
    const [neighbors, umap] = await Promise.all([
        semanticDb.knnNearestByVector(lang, vec, 80, [word]),
        semanticDb.get2dPosition(lang, word),
    ]);

    const nearest = neighbors.map((n) => ({
        word: n.word,
        similarity: n.similarity,
        umap: n.umapX != null ? [n.umapX, n.umapY] as [number, number] : null,
    }));

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
