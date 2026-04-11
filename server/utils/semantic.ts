import { consola } from 'consola';
// Semantic Explorer — server utility.
//
// Loads embeddings/axes/UMAP once via a Nitro startup plugin
// (server/plugins/semantic-warmup.ts) and provides:
//   - cosine similarity
//   - per-target cosine distribution (rank) with per-session caching
//   - anchor-axis projection + Gram-Schmidt compass selection
//   - UMAP lookup
//   - k-NN neighbours
//   - on-demand OpenAI embedding fetch with disk cache

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type AxisRecord = {
    low_anchor: string;
    high_anchor: string;
    vector: number[]; // unit-length, length D
};

type AxesFile = {
    version: number;
    axes: Record<string, AxisRecord>;
    coherence_auc: Record<string, number>;
    ranges: Record<string, { p5: number; p95: number }>;
};

type EmbeddingsFile = {
    version: number;
    model: string;
    words: string[];
    vectors: number[][];
};

/** 2D projection file — format shared by pca2d.json and umap.json.
 *  The server prefers PCA (better distance faithfulness for the game)
 *  and falls back to UMAP if PCA hasn't been generated yet. Both are
 *  kept on disk so switching is just a config change. */
type Projection2dFile = {
    version: number;
    method?: 'pca' | 'umap';
    coordinates: Record<string, [number, number]>;
};

type TargetsFile = {
    version: number;
    targets: string[];
};

type VocabFile = {
    version: number;
    words: string[];
};

type ValidWordsFile = {
    version: number;
    count: number;
    words: string[];
};

export type SemanticData = {
    modelName: string;
    dims: number;
    words: string[]; // canonical order, matches rows of `embeddings`
    wordIndex: Map<string, number>;
    embeddings: Float32Array; // row-major, N × dims, L2-normalized
    axes: Record<string, AxisRecord>;
    axesNames: string[]; // stable order for UI
    axesVectors: Float32Array; // (A × dims), row-major
    axesRanges: Record<string, { p5: number; p95: number }>;
    axesAuc: Record<string, number>;
    /** 2D projections — both loaded if available. Game uses PCA for
     *  polar angle (better distance preservation), word page uses UMAP
     *  for absolute positions (better cluster visualization). */
    pca2d: Record<string, [number, number]>;
    umap: Record<string, [number, number]>;
    targets: string[];
    vocabulary: string[];
    /** ~75k English words used to spellcheck on-demand guesses */
    validWords: Set<string>;
};

let _cache: SemanticData | null = null;

import { SEMANTIC_RUNTIME_DIR, SEMANTIC_STATIC_DIR } from '~/server/utils/data-loader';

/** Two-tier layout:
 *    STATIC_DIR   = committed artifacts (vocab, targets, axes, umap, valid_words)
 *    RUNTIME_DIR  = generated on first boot + cached on persistent disk
 *                   (embeddings.json, percentiles.json)
 *  Runtime dir lookups fall back to static dir in local dev so a single
 *  `./data/semantic/` works for everything when you run the Python
 *  generator locally. */
function resolveSemanticFile(name: string, runtime = false): string {
    const primary = runtime ? SEMANTIC_RUNTIME_DIR : SEMANTIC_STATIC_DIR;
    const primaryPath = join(primary, name);
    if (existsSync(primaryPath)) return primaryPath;
    // Dev fallback: runtime files may live next to static files in the repo.
    return join(SEMANTIC_STATIC_DIR, name);
}

export class SemanticDataMissingError extends Error {
    constructor(public readonly missing: string[]) {
        super(`[semantic] missing data files: ${missing.join(', ')}`);
    }
}

type EmbeddingsMetaFile = {
    version: number;
    format: string;
    model: string;
    words: string[];
    dims: number;
    count: number;
    endian: string;
};

/** Load embeddings — binary .f32 preferred (sub-second), JSON fallback. */
function loadEmbeddings(resolveFile: (name: string, runtime?: boolean) => string): {
    model: string;
    words: string[];
    dims: number;
    matrix: Float32Array;
} {
    // Try binary first
    const metaPath = resolveFile('embeddings.meta.json', true);
    const f32Path = resolveFile('embeddings.f32', true);
    if (existsSync(metaPath) && existsSync(f32Path)) {
        const meta: EmbeddingsMetaFile = JSON.parse(readFileSync(metaPath, 'utf-8'));
        const buf = readFileSync(f32Path);
        const matrix = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        if (matrix.length !== meta.count * meta.dims) {
            throw new Error(
                `[semantic] embeddings.f32 size mismatch: expected ${meta.count * meta.dims} floats, got ${matrix.length}`
            );
        }
        return { model: meta.model, words: meta.words, dims: meta.dims, matrix };
    }

    // Fallback: legacy JSON
    const jsonPath = resolveFile('embeddings.json', true);
    if (!existsSync(jsonPath)) {
        throw new SemanticDataMissingError(['embeddings.f32', 'embeddings.json']);
    }
    const emb: EmbeddingsFile = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const N = emb.words.length;
    const D = emb.vectors[0]!.length;
    const matrix = new Float32Array(N * D);
    for (let i = 0; i < N; i++) {
        const row = emb.vectors[i]!;
        for (let j = 0; j < D; j++) {
            matrix[i * D + j] = row[j]!;
        }
    }
    return { model: emb.model, words: emb.words, dims: D, matrix };
}

export function loadSemanticData(): SemanticData {
    if (_cache) return _cache;

    const {
        model: modelName,
        words,
        dims: D,
        matrix: embeddings,
    } = loadEmbeddings(resolveSemanticFile);
    const axes: AxesFile = JSON.parse(readFileSync(resolveSemanticFile('axes.json'), 'utf-8'));
    // Load both 2D projections. Game uses PCA for polar angle (faithful
    // distance), word page uses UMAP for absolute layout (better clusters).
    let pca2dCoords: Record<string, [number, number]> = {};
    let umapCoords: Record<string, [number, number]> = {};
    const pca2dPath = resolveSemanticFile('pca2d.json');
    if (existsSync(pca2dPath)) {
        const pca: Projection2dFile = JSON.parse(readFileSync(pca2dPath, 'utf-8'));
        pca2dCoords = pca.coordinates;
    }
    try {
        const umap: Projection2dFile = JSON.parse(
            readFileSync(resolveSemanticFile('umap.json'), 'utf-8')
        );
        umapCoords = umap.coordinates;
    } catch {
        consola.warn('[semantic] umap.json missing');
    }
    // Fallback: if one is missing, use the other for both
    if (!Object.keys(pca2dCoords).length) pca2dCoords = umapCoords;
    if (!Object.keys(umapCoords).length) umapCoords = pca2dCoords;
    const targets: TargetsFile = JSON.parse(
        readFileSync(resolveSemanticFile('targets.json'), 'utf-8')
    );
    const vocab: VocabFile = JSON.parse(
        readFileSync(resolveSemanticFile('vocabulary.json'), 'utf-8')
    );
    let validWordsArr: string[] = [];
    try {
        const vw: ValidWordsFile = JSON.parse(
            readFileSync(resolveSemanticFile('valid_words.json'), 'utf-8')
        );
        validWordsArr = vw.words;
    } catch {
        // Missing file — validator defaults to the embedding vocab only.
        consola.warn('[semantic] valid_words.json missing — spellcheck disabled');
    }

    const N = words.length;

    const wordIndex = new Map<string, number>();
    for (let i = 0; i < N; i++) {
        wordIndex.set(words[i]!, i);
    }

    const axesNames = Object.keys(axes.axes);
    const axesVectors = new Float32Array(axesNames.length * D);
    for (let a = 0; a < axesNames.length; a++) {
        const vec = axes.axes[axesNames[a]!]!.vector;
        for (let j = 0; j < D; j++) {
            axesVectors[a * D + j] = vec[j]!;
        }
    }

    _cache = {
        modelName,
        dims: D,
        words,
        wordIndex,
        embeddings,
        axes: axes.axes,
        axesNames,
        axesVectors,
        axesRanges: axes.ranges,
        axesAuc: axes.coherence_auc,
        pca2d: pca2dCoords,
        umap: umapCoords,
        targets: targets.targets,
        vocabulary: vocab.words,
        validWords: new Set(validWordsArr),
    };

    // Calibrate compass magnitude tiers from the actual data distribution —
    // no hardcoded thresholds. Runs once at load time (~10ms for 200 pairs).
    calibrateMagnitudeTiers(_cache);

    return _cache;
}

/** Load semantic data or throw a clean 503 if embeddings are missing. */
export function loadSemanticDataSafe(): SemanticData {
    try {
        return loadSemanticData();
    } catch (e) {
        if (e instanceof SemanticDataMissingError) {
            throw createError({
                statusCode: 503,
                message: 'Semantic Explorer is temporarily unavailable.',
            });
        }
        throw e;
    }
}

/** Canonical 2D position for a word — used by start, guess, and reveal
 *  endpoints for the map's polar-angle projection. Single source of truth
 *  so all dots share the same coordinate space and the target position
 *  doesn't jump when reveal fires. Prefers PCA (better distance preservation)
 *  with UMAP fallback, and [0.5, 0.5] for unknown words. */
export function get2dPosition(data: SemanticData, word: string): [number, number] {
    return (data.pca2d[word] ?? data.umap[word] ?? [0.5, 0.5]) as [number, number];
}

export function getEmbedding(data: SemanticData, word: string): Float32Array | null {
    const i = data.wordIndex.get(word);
    if (i === undefined) {
        const cached = _ondemandCache.get(word);
        if (cached) return cached;
        return null;
    }
    return data.embeddings.subarray(i * data.dims, (i + 1) * data.dims);
}

// ---------------- On-demand embedding fallback ----------------
// Words outside the precomputed vocab are embedded via OpenAI. Each result
// is cached in memory AND on disk at `word-defs/semantic-embeddings/{word}.json`,
// so server restarts don't re-spend on the same words. Mirrors the disk cache
// pattern used by semantic-hints and word definitions.

const _ondemandCache = new Map<string, Float32Array>();
const ONDEMAND_CACHE_MAX = 5000;
function ondemandCacheSet(word: string, vec: Float32Array): void {
    _ondemandCache.set(word, vec);
    if (_ondemandCache.size > ONDEMAND_CACHE_MAX) {
        const oldest = _ondemandCache.keys().next().value;
        if (oldest !== undefined) _ondemandCache.delete(oldest);
    }
}
const EMBED_CACHE_DIR = join(process.cwd(), 'word-defs', 'semantic-embeddings');

function embedCachePath(word: string): string {
    // Word is lowercased + regex-validated upstream, but sanitize anyway to
    // avoid ever writing outside the cache dir on a bad input.
    const safe = word.replace(/[^a-z0-9\-']/g, '_');
    return join(EMBED_CACHE_DIR, `${safe}.json`);
}

function readDiskEmbedding(word: string, dims: number, model: string): Float32Array | null {
    const p = embedCachePath(word);
    if (!existsSync(p)) return null;
    try {
        const payload = JSON.parse(readFileSync(p, 'utf-8')) as {
            word: string;
            model: string;
            dims: number;
            vector: number[];
        };
        // Reject stale cache entries from a previous embedding model — returning
        // wrong-model vectors would silently corrupt cosine comparisons.
        if (payload.model !== model || payload.dims !== dims || !Array.isArray(payload.vector)) {
            return null;
        }
        const vec = new Float32Array(dims);
        for (let i = 0; i < dims; i++) vec[i] = payload.vector[i] ?? 0;
        return vec;
    } catch {
        return null;
    }
}

function writeDiskEmbedding(word: string, model: string, vec: Float32Array): void {
    try {
        mkdirSync(EMBED_CACHE_DIR, { recursive: true });
        const payload = {
            word,
            model,
            dims: vec.length,
            vector: Array.from(vec).map((x) => Math.round(x * 1e5) / 1e5),
            createdAt: Date.now(),
        };
        writeFileSync(embedCachePath(word), JSON.stringify(payload));
    } catch (e) {
        consola.warn('[semantic] ondemand embedding disk write failed', e);
    }
}

export async function fetchEmbeddingOnDemand(
    data: SemanticData,
    word: string
): Promise<Float32Array | null> {
    if (data.wordIndex.has(word)) {
        return getEmbedding(data, word);
    }
    // 1. In-memory
    const mem = _ondemandCache.get(word);
    if (mem) return mem;

    // 2. Disk (model-gated so a model swap invalidates stale entries)
    const disk = readDiskEmbedding(word, data.dims, data.modelName);
    if (disk) {
        ondemandCacheSet(word, disk);
        return disk;
    }

    // 3. OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const modelName = data.modelName; // e.g. "text-embedding-3-small-512"
    const match = modelName.match(/^(.+)-(\d+)$/);
    const openaiModel = match ? match[1] : 'text-embedding-3-small';
    const dims = match ? Number(match[2]) : data.dims;

    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: openaiModel,
                input: [word],
                dimensions: dims,
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            consola.warn('[semantic] ondemand embedding failed', response.status);
            return null;
        }
        const payload = await response.json();
        const raw = payload?.data?.[0]?.embedding as number[] | undefined;
        if (!raw || raw.length !== dims) return null;

        // L2-normalize (matches generation script)
        let norm = 0;
        for (let i = 0; i < raw.length; i++) norm += raw[i]! * raw[i]!;
        norm = Math.sqrt(norm);
        if (norm === 0) norm = 1;
        const vec = new Float32Array(dims);
        for (let i = 0; i < dims; i++) vec[i] = raw[i]! / norm;

        ondemandCacheSet(word, vec);
        writeDiskEmbedding(word, modelName, vec);
        return vec;
    } catch (e) {
        consola.warn('[semantic] ondemand embedding error', e);
        return null;
    }
}

// ── Rank-based scoring ───────────────────────────────────────────────────
// The canonical "how close" signal is the guess's rank within the target's
// sorted vocab neighbour list. No model-specific magic constants, no stretch
// curves — just "your guess is the Nth closest word to the target out of M."
//
// Display percent is a log transform: display = 1 - log(rank) / log(N).
// This compresses the long tail so rank 1 = 100%, rank 100 = 50%, rank 10000
// ≈ 0% for an N=10k vocab. Every order of magnitude is equal movement.
//
// Per-target sorted cosines are computed lazily on first guess for that
// target and cached by session in `_targetCosineCache`. The computation is
// ~10ms for 10k vocab (one vector-matrix multiply + sort).

type TargetCosineDist = {
    /** Parallel arrays: words[i] has cosine cosines[i] to the target, sorted desc */
    words: string[];
    cosines: Float32Array;
    /** word → rank (1-indexed, 1 = target itself) */
    rankByWord: Map<string, number>;
};

const _targetCosineCache = new Map<string, TargetCosineDist>();

/** Compute (or fetch from cache) the target's sorted vocab neighbour list. */
export function getTargetDistribution(data: SemanticData, target: string): TargetCosineDist | null {
    const cached = _targetCosineCache.get(target);
    if (cached) return cached;

    const targetVec = getEmbedding(data, target);
    if (!targetVec) return null;

    const N = data.words.length;
    const D = data.dims;
    const cosines = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        let dot = 0;
        for (let j = 0; j < D; j++) {
            dot += targetVec[j]! * data.embeddings[i * D + j]!;
        }
        cosines[i] = dot;
    }

    // Sort words by descending cosine (closest first).
    const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => cosines[b]! - cosines[a]!);
    const sortedWords: string[] = new Array(N);
    const sortedCos = new Float32Array(N);
    const rankByWord = new Map<string, number>();
    for (let i = 0; i < N; i++) {
        const idx = order[i]!;
        sortedWords[i] = data.words[idx]!;
        sortedCos[i] = cosines[idx]!;
        rankByWord.set(data.words[idx]!, i + 1); // rank 1 = target
    }

    const dist: TargetCosineDist = {
        words: sortedWords,
        cosines: sortedCos,
        rankByWord,
    };
    _targetCosineCache.set(target, dist);
    if (_targetCosineCache.size > 20) {
        const oldest = _targetCosineCache.keys().next().value;
        if (oldest !== undefined) _targetCosineCache.delete(oldest);
    }
    return dist;
}

/**
 * Rank of a guess within the target's distribution. For in-vocab words, it's
 * a map lookup. For on-demand words (not in vocab), we count how many vocab
 * words have higher cosine to target than the guess — that's its rank.
 *
 * Returns 1 if guess IS the target (or on-demand equivalent), otherwise the
 * position in the sorted neighbour list, or null if computation fails.
 */
export function computeGuessRank(
    data: SemanticData,
    target: string,
    guess: string,
    guessVec: Float32Array
): number | null {
    if (guess === target) return 1;
    const dist = getTargetDistribution(data, target);
    if (!dist) return null;

    // Fast path: guess is in the precomputed vocab
    const cached = dist.rankByWord.get(guess);
    if (cached !== undefined) return cached;

    // Slow path: on-demand guess. Compute cosine to target, count how many
    // vocab cosines strictly exceed it. Binary search on the sorted array.
    const targetVec = getEmbedding(data, target);
    if (!targetVec) return null;
    let guessCos = 0;
    for (let i = 0; i < data.dims; i++) guessCos += guessVec[i]! * targetVec[i]!;

    // dist.cosines is sorted DESCENDING. Find first index where cos < guessCos.
    let lo = 0;
    let hi = dist.cosines.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (dist.cosines[mid]! > guessCos) lo = mid + 1;
        else hi = mid;
    }
    return lo + 1; // +1 for 1-indexed rank
}

/** Log-transform rank to a 0..1 display value. */
export function rankToDisplay(rank: number, totalRanked: number): number {
    if (!Number.isFinite(rank) || rank < 1) return 0;
    if (rank === 1) return 1;
    if (totalRanked <= 1) return 0;
    const v = 1 - Math.log(rank) / Math.log(totalRanked);
    return Math.max(0, Math.min(1, v));
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    // Embeddings are pre-normalized in the generation script, so cosine = dot.
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
    return dot;
}

export function projectOntoAxis(
    data: SemanticData,
    wordVec: Float32Array,
    axisName: string
): number {
    const axisIdx = data.axesNames.indexOf(axisName);
    if (axisIdx < 0) return 0;
    const D = data.dims;
    let dot = 0;
    for (let i = 0; i < D; i++) {
        dot += wordVec[i]! * data.axesVectors[axisIdx * D + i]!;
    }
    return dot;
}

/** Returns all 12 axis projections at once — one dot product per axis. */
export function projectAllAxes(data: SemanticData, wordVec: Float32Array): Record<string, number> {
    const out: Record<string, number> = {};
    const D = data.dims;
    for (let a = 0; a < data.axesNames.length; a++) {
        let dot = 0;
        for (let i = 0; i < D; i++) {
            dot += wordVec[i]! * data.axesVectors[a * D + i]!;
        }
        out[data.axesNames[a]!] = dot;
    }
    return out;
}

/** Normalize a raw projection into [0, 1] using the precomputed 5th/95th percentiles. */
export function normalizeProjection(
    data: SemanticData,
    axisName: string,
    rawValue: number
): number {
    const range = data.axesRanges[axisName];
    if (!range) return 0.5;
    const { p5, p95 } = range;
    if (p95 === p5) return 0.5;
    const v = (rawValue - p5) / (p95 - p5);
    return Math.max(0, Math.min(1, v));
}

/**
 * Returns k nearest neighbours (cosine similarity) in the full embedding space.
 *
 * Uses a bounded sorted array (min-heap approximation) so we do O(N) work
 * with at most O(k log k) insertions, instead of sorting all N scores.
 */
export function knnNearest(
    data: SemanticData,
    wordVec: Float32Array,
    k: number,
    excludeWords: Set<string> = new Set()
): Array<{ word: string; similarity: number }> {
    const N = data.words.length;
    const D = data.dims;
    // Bounded sorted array — keeps top k results, highest similarity first
    const topK: Array<{ word: string; similarity: number }> = [];
    let threshold = -Infinity; // similarity of the k-th best so far

    for (let i = 0; i < N; i++) {
        const word = data.words[i]!;
        if (excludeWords.has(word)) continue;
        let dot = 0;
        for (let j = 0; j < D; j++) {
            dot += wordVec[j]! * data.embeddings[i * D + j]!;
        }
        if (dot <= threshold && topK.length >= k) continue;

        // Binary search for insertion point (descending order)
        let lo = 0,
            hi = topK.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (topK[mid]!.similarity > dot) lo = mid + 1;
            else hi = mid;
        }
        topK.splice(lo, 0, { word, similarity: dot });
        if (topK.length > k) topK.pop();
        threshold = topK.length >= k ? topK[topK.length - 1]!.similarity : -Infinity;
    }
    return topK;
}

// ---------------- Target session management ----------------

const _sessions = new Map<string, { target: string; createdAt: number }>();

export function createSession(target: string): string {
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    _sessions.set(id, { target, createdAt: Date.now() });
    // Evict stale sessions only when the map grows large enough to matter
    if (_sessions.size > 1000) {
        const cutoff = Date.now() - 3600_000;
        for (const [k, v] of _sessions.entries()) {
            if (v.createdAt < cutoff) _sessions.delete(k);
        }
    }
    return id;
}

export function getSessionTarget(id: string): string | null {
    return _sessions.get(id)?.target ?? null;
}

// ---------------- Compass hint generation ----------------
//
// Given a guess and target, find the 2 most informative axes that jointly
// explain the direction `r = target − guess` in embedding space. Principled
// geometry:
//
//   explained(a) = (a · r)² / ‖r‖²      (fraction of travel direction axis a captures)
//
// Axis 1 = argmax explained(a). Axis 2 = axis best explaining the residual
// after projecting out axis 1 — Gram-Schmidt selection. This is matching
// pursuit with 2 atoms, and (a·r)² + (a2_perp·r)² / ‖r‖² is exactly the
// fraction of ‖r‖² captured by the 2D subspace span(a1, a2).
//
// Signal floors protect against garbage hints on close-neighbour pairs:
//   - Pair-level ‖r‖ < 0.3 → no hints; target and guess are too similar
//   - Per-axis explained < 4% → that axis is noise, don't include it
//   - Pair-level total explained < 10% → drop the whole compass
//
// Copy is rendered from anchor words directly ("more like X than Y") — no
// template dictionary, no per-axis hand-curated prose, no Math.random. Scales
// to any axis with named anchors.

export type CompassHint = {
    axis: string;
    lowAnchor: string;
    highAnchor: string;
    direction: 'positive' | 'negative'; // sign of a · r
    magnitudeTier: 'slight' | 'clear' | 'strong';
    delta: number; // signed projection a · r in raw embedding space
    explained: number; // (a · r)² / ‖r‖² — fraction of travel direction captured
};

export type CompassResult = {
    hints: CompassHint[]; // 0, 1, or 2 hints
    status: 'ok' | 'close'; // 'close' = target and guess too similar for useful hints
    totalExplained: number; // 2D subspace explained fraction
};

// Signal-floor calibration note: in a 512-dim embedding space, even the best
// axis for a typical pair only explains 4-8% of the travel direction (random
// axis would be ~0.2%). So "meaningful" is closer to 2% than 10%. We use:
//   MIN_R_NORM_SQ  : very-close-neighbour filter (‖r‖ ≈ cos > 0.955)
//   PER_AXIS_FLOOR : each axis must project meaningfully above noise
//   PAIR_FLOOR     : single-axis fallback must clear a higher bar before we
//                    accept a lone hint with no second axis
const COMPASS_MIN_R_NORM_SQ = 0.09;
// Per-axis and pair floors removed — the 20 hand-picked axes cover a small
// fraction of the 512D space, so even the best axis often explains < 2% of
// the travel direction. Showing a "slight" hint that explains 1% is still
// more useful than "no clear bearing." The only suppression is the close-pair
// floor (cos > 0.955) where the guess is genuinely near-identical to target.
const COMPASS_PER_AXIS_FLOOR = 0;
const COMPASS_PAIR_FLOOR = 0;

/** Magnitude tier thresholds, computed empirically from the actual data at
 *  load time. Zero magic numbers — the thresholds adapt automatically to
 *  any vocab size, axis count, or embedding model.
 *
 *  Computed by `calibrateMagnitudeTiers()`: sample 200 random (target, guess)
 *  pairs, collect ALL per-axis explained fractions, then:
 *    - "strong" threshold = p90 of the distribution (top 10% of signals)
 *    - "clear"  threshold = p75 (top 25%)
 *    - below p75 = "slight"
 *
 *  These are set once at startup and reused for every compass call. */
let MAGNITUDE_STRONG = 0.04; // fallback until calibrated
let MAGNITUDE_CLEAR = 0.015;

function calibrateMagnitudeTiers(data: SemanticData): void {
    const N = data.words.length;
    const D = data.dims;
    const A = data.axesNames.length;
    if (A === 0 || N < 100) return;

    // Deterministic pseudo-random sampling via simple LCG
    let seed = 42;
    function rand() {
        seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
        return seed / 0x7fffffff;
    }

    const targetIndices: number[] = [];
    const targetSet = new Set(data.targets);
    for (let i = 0; i < N && targetIndices.length < 50; i++) {
        if (targetSet.has(data.words[i]!)) targetIndices.push(i);
    }

    const explained: number[] = [];
    for (const ti of targetIndices) {
        const tv = data.embeddings.subarray(ti * D, (ti + 1) * D);
        // 4 random guesses per target
        for (let g = 0; g < 4; g++) {
            const gi = Math.floor(rand() * Math.min(N, 5000));
            if (gi === ti) continue;
            const gv = data.embeddings.subarray(gi * D, (gi + 1) * D);
            // r = target - guess
            let rNormSq = 0;
            for (let j = 0; j < D; j++) {
                const d = tv[j]! - gv[j]!;
                rNormSq += d * d;
            }
            if (rNormSq < 0.01) continue;
            // Explained fraction for each axis
            for (let a = 0; a < A; a++) {
                let dot = 0;
                for (let j = 0; j < D; j++) {
                    dot += data.axesVectors[a * D + j]! * (tv[j]! - gv[j]!);
                }
                explained.push((dot * dot) / rNormSq);
            }
        }
    }

    if (explained.length < 100) return;

    // We need the distribution of the BEST axis per pair (what the compass
    // actually shows), not all axes. Group by pair and take max.
    const pairsCount = Math.floor(explained.length / A);
    const bestPerPair: number[] = [];
    for (let p = 0; p < pairsCount; p++) {
        let best = 0;
        for (let a = 0; a < A; a++) {
            const v = explained[p * A + a]!;
            if (v > best) best = v;
        }
        bestPerPair.push(best);
    }
    bestPerPair.sort((a, b) => a - b);

    if (bestPerPair.length < 10) return;
    // "strong" = top 25% of best-axis-per-pair → compass is unusually clear
    // "clear"  = top 50% → typical compass quality
    // "slight" = bottom 50% → compass is below average
    MAGNITUDE_STRONG = bestPerPair[Math.floor(bestPerPair.length * 0.75)]!;
    MAGNITUDE_CLEAR = bestPerPair[Math.floor(bestPerPair.length * 0.5)]!;
}

function magnitudeTierFromExplained(explained: number): 'slight' | 'clear' | 'strong' {
    if (explained >= MAGNITUDE_STRONG) return 'strong';
    if (explained >= MAGNITUDE_CLEAR) return 'clear';
    return 'slight';
}

/**
 * Compute compass hints for a (guess, target) pair. Returns up to `k` hints
 * (default 5) ordered by iterative matching-pursuit: each axis is the best
 * explainer of the residual after removing the contribution of all previously
 * chosen axes. The top 2 are guaranteed to be a Gram-Schmidt orthogonal pair
 * in the original embedding space, which is what the UI cares about; the
 * rest (positions 3-5) are fallbacks for the slice-view filter, which hides
 * axes currently displayed on the map canvas.
 *
 * Returns status='close' + empty hints when:
 *   - ‖r‖ < 0.3 (target and guess are near-identical, any hint would be noise)
 *   - best axis's explained fraction < per-axis floor
 *   - only 1 axis survives the floor AND its explained < pair-level floor
 *
 * `totalExplained` is the fraction of ‖r‖² captured by the full chosen subspace
 * (matching-pursuit style — sum of orthogonal residual components), not just
 * the top 2. Use for debugging / "how confident is the compass".
 */
export function computeCompass(
    data: SemanticData,
    guessVec: Float32Array,
    targetVec: Float32Array,
    k: number = 5,
    excludeAxes: string[] = []
): CompassResult {
    const D = data.dims;

    // r = target − guess
    const r = new Float32Array(D);
    let rNormSq = 0;
    for (let i = 0; i < D; i++) {
        const v = targetVec[i]! - guessVec[i]!;
        r[i] = v;
        rNormSq += v * v;
    }

    // Close-neighbour fallback: the two are near-identical and any axis pick
    // would be noise. Show the "you're close" UI instead.
    if (rNormSq < COMPASS_MIN_R_NORM_SQ) {
        return { hints: [], status: 'close', totalExplained: 0 };
    }

    const excludeSet = new Set(excludeAxes);

    // Score every eligible axis: signed projection (a · r) and explained fraction.
    // These are the "level 0" scores — before any Gram-Schmidt orthogonalization.
    type Scored = {
        name: string;
        rowIdx: number;
        delta: number; // signed (a · r) in the original embedding space
        explained: number; // (a · r)² / ‖r‖² — raw individual contribution
    };
    const scored: Scored[] = [];
    for (let a = 0; a < data.axesNames.length; a++) {
        const name = data.axesNames[a]!;
        if (excludeSet.has(name)) continue;
        if ((data.axesAuc[name] ?? 0) < 0.8) continue;
        let delta = 0;
        const rowOffset = a * D;
        for (let i = 0; i < D; i++) {
            delta += data.axesVectors[rowOffset + i]! * r[i]!;
        }
        scored.push({
            name,
            rowIdx: a,
            delta,
            explained: (delta * delta) / rNormSq,
        });
    }

    if (scored.length < 1) {
        return { hints: [], status: 'close', totalExplained: 0 };
    }

    const kCap = Math.max(1, Math.min(k, scored.length));

    // Matching pursuit: iteratively pick the axis that best explains the
    // current residual of r. We represent the residual implicitly by tracking
    // which already-chosen axes we've orthogonalized against. For each new
    // candidate, we orthogonalize it against every previously-chosen axis
    // using classical Gram-Schmidt, then score the orthogonalized candidate
    // against the ORIGINAL r (mathematically equivalent to scoring against
    // the residual, much simpler to reason about).
    //
    // All work is in scalar form, using the identity
    //     (b_perp · r) = (b · r) − Σᵢ (b · pᵢ) · (pᵢ · r)
    // where pᵢ are the orthonormal basis vectors built during the iteration.
    // We store pᵢ as Float32Arrays of length D; at most k=5 of them.

    const picked: Scored[] = [];
    const basis: Float32Array[] = []; // orthonormal basis so far (length D)
    const basisDotR: number[] = []; // (basis_i · r)
    let totalExplained = 0;

    for (let iter = 0; iter < kCap; iter++) {
        // For each remaining scored axis, compute its projection onto the
        // residual direction: (b_perp · r) where b_perp = b − Σ (b · basis_i) basis_i
        let best: Scored | null = null;
        let bestDelta = 0;
        let bestExplained = 0;
        let bestBasisDots: Float32Array | null = null;

        for (const b of scored) {
            if (picked.some((p) => p.rowIdx === b.rowIdx)) continue;
            const bRow = b.rowIdx * D;

            // Compute (b · basis_i) for each current basis vector, AND
            // (b_perp · r) using the scalar identity above.
            const dots = new Float32Array(basis.length);
            let sumBasisProj = 0;
            for (let i = 0; i < basis.length; i++) {
                let d = 0;
                const bi = basis[i]!;
                for (let j = 0; j < D; j++) {
                    d += data.axesVectors[bRow + j]! * bi[j]!;
                }
                dots[i] = d;
                sumBasisProj += d * basisDotR[i]!;
            }
            const bPerpDotR = b.delta - sumBasisProj;

            // ‖b_perp‖² = 1 − Σ (b · basis_i)²  (b is unit, basis is orthonormal)
            let bPerpNormSq = 1;
            for (let i = 0; i < basis.length; i++) {
                bPerpNormSq -= dots[i]! * dots[i]!;
            }
            if (bPerpNormSq < 1e-9) continue; // b is in span of already-picked

            const orthExplained = (bPerpDotR * bPerpDotR) / (bPerpNormSq * rNormSq);

            if (orthExplained > bestExplained) {
                bestExplained = orthExplained;
                bestDelta = bPerpDotR / Math.sqrt(bPerpNormSq);
                best = b;
                bestBasisDots = dots;
            }
        }

        if (!best) break;

        // First-axis floor: if even the best axis fails the per-axis floor on
        // the first iteration, there's nothing useful to say.
        if (iter === 0 && bestExplained < COMPASS_PER_AXIS_FLOOR) {
            return { hints: [], status: 'close', totalExplained: 0 };
        }
        // Subsequent axes: stop iterating once we drop below the floor.
        if (bestExplained < COMPASS_PER_AXIS_FLOOR) break;

        picked.push(best);
        totalExplained += bestExplained;

        // Extend the orthonormal basis with best_perp / ‖best_perp‖.
        // best_perp = best − Σ (best · basis_i) basis_i
        const bRow = best.rowIdx * D;
        const newBasis = new Float32Array(D);
        for (let j = 0; j < D; j++) {
            let v = data.axesVectors[bRow + j]!;
            for (let i = 0; i < basis.length; i++) {
                v -= bestBasisDots![i]! * basis[i]![j]!;
            }
            newBasis[j] = v;
        }
        let newNorm = 0;
        for (let j = 0; j < D; j++) newNorm += newBasis[j]! * newBasis[j]!;
        newNorm = Math.sqrt(newNorm);
        if (newNorm < 1e-6) break; // degenerate, stop
        for (let j = 0; j < D; j++) newBasis[j] /= newNorm;
        basis.push(newBasis);
        // (newBasis · r) = bestDelta (by construction)
        basisDotR.push(bestDelta);
    }

    // Pair-level floor: if we only got one axis AND its explained fraction is
    // below the pair floor, drop the whole thing. (One strong axis that
    // clears the pair floor on its own is fine.)
    if (picked.length === 1 && totalExplained < COMPASS_PAIR_FLOOR) {
        return { hints: [], status: 'close', totalExplained };
    }

    if (picked.length === 0) {
        return { hints: [], status: 'close', totalExplained: 0 };
    }

    const hints: CompassHint[] = picked.map((p) => {
        const rec = data.axes[p.name]!;
        return {
            axis: p.name,
            lowAnchor: rec.low_anchor,
            highAnchor: rec.high_anchor,
            direction: p.delta >= 0 ? 'positive' : 'negative',
            magnitudeTier: magnitudeTierFromExplained(p.explained),
            delta: p.delta,
            explained: p.explained,
        };
    });

    return { hints, status: 'ok', totalExplained };
}
