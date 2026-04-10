/**
 * GET /api/[lang]/word-explore/[slug]
 *
 * Semantic exploration data for a word: normalized axis projections,
 * nearest + farthest neighbors, UMAP coordinates. For out-of-vocab words,
 * fetches an embedding on-demand via OpenAI (cached to disk). Non-English
 * languages return `available: false` — the semantic data is English-only.
 */
import {
    cosineSimilarity,
    fetchEmbeddingOnDemand,
    getEmbedding,
    getTargetDistribution,
    loadSemanticData,
    normalizeProjection,
} from '../../../utils/semantic';
import { resolveWordSlug } from '../../../utils/word-selection';
import { loadAllData } from '../../../utils/data-loader';

const EMPTY_RESPONSE = {
    projections: [] as Array<unknown>,
    nearest: [] as Array<{ word: string; similarity: number }>,
    farthest: [] as Array<{ word: string; similarity: number }>,
    umap: null as [number, number] | null,
    similarityTo: null as number | null,
    available: false,
};

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang')!;
    const slug = decodeURIComponent(getRouterParam(event, 'slug')!);
    const query = getQuery(event);
    const relativeTo =
        typeof query.relativeTo === 'string'
            ? query.relativeTo.toLowerCase()
            : null;

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

    // Semantic data is English-only for now; other languages get a graceful
    // empty response so the page can render the fallback section.
    if (lang !== 'en') {
        return { word, inVocab: false, ...EMPTY_RESPONSE };
    }

    const sem = loadSemanticData();
    let vec = getEmbedding(sem, word);
    const inVocab = vec !== null;
    if (!vec) vec = await fetchEmbeddingOnDemand(sem, word);
    if (!vec) {
        return { word, inVocab: false, ...EMPTY_RESPONSE };
    }

    // Per-axis projections — compute inline (not projectAllAxes) so we can
    // skip low-AUC axes in one pass rather than projecting then filtering.
    const D = sem.dims;
    const projections = [];
    for (let a = 0; a < sem.axesNames.length; a++) {
        const name = sem.axesNames[a]!;
        if ((sem.axesAuc[name] ?? 0) < 0.8) continue;
        let raw = 0;
        const rowOffset = a * D;
        for (let j = 0; j < D; j++) {
            raw += vec[j]! * sem.axesVectors[rowOffset + j]!;
        }
        const rec = sem.axes[name]!;
        projections.push({
            axis: name,
            lowAnchor: rec.low_anchor,
            highAnchor: rec.high_anchor,
            normalized: normalizeProjection(sem, name, raw),
            rawProjection: raw,
        });
    }

    // Top-80 nearest + top-20 farthest. 80 near lets the Word Explorer
    // show a small prominent foreground (~12 top dots) + a muted
    // "extended neighborhood" background (~60 faded dots) in the same
    // polar coordinate system. UMAP coords come along so the client can
    // compute real angular directions via polarProject — without them,
    // every muted dot would stack at (0.5, 0.5).
    const dist = getTargetDistribution(sem, word);
    type NeighborOut = {
        word: string;
        similarity: number;
        umap: [number, number] | null;
    };
    const nearest: NeighborOut[] = [];
    const farthest: NeighborOut[] = [];
    if (dist) {
        const N = dist.words.length;
        for (let i = 1; i <= 80 && i < N; i++) {
            const w = dist.words[i]!;
            nearest.push({
                word: w,
                similarity: dist.cosines[i]!,
                umap: sem.umap[w] ?? null,
            });
        }
        for (let i = Math.max(1, N - 20); i < N; i++) {
            const w = dist.words[i]!;
            farthest.push({
                word: w,
                similarity: dist.cosines[i]!,
                umap: sem.umap[w] ?? null,
            });
        }
    }

    // When `?relativeTo=X` is passed, compute cosine similarity to X so
    // the client can lay out user-added context words at a radius that
    // reflects their distance from the primary word. Same-word => 1.
    let similarityTo: number | null = null;
    if (relativeTo) {
        if (relativeTo === word) {
            similarityTo = 1;
        } else {
            let otherVec = getEmbedding(sem, relativeTo);
            if (!otherVec) otherVec = await fetchEmbeddingOnDemand(sem, relativeTo);
            if (otherVec) similarityTo = cosineSimilarity(vec, otherVec);
        }
    }

    return {
        word,
        inVocab,
        projections,
        nearest,
        farthest,
        umap: sem.umap[word] ?? null,
        similarityTo,
        available: true,
    };
});
