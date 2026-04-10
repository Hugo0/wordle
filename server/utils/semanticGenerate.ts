import { consola } from 'consola';
/**
 * Semantic Explorer — runtime embedding generator.
 *
 * Runs on first boot (or whenever the embeddings file is missing from the
 * persistent disk) to regenerate the heavy derivable artifacts:
 *
 *   - embeddings.json: OpenAI embeddings for every word in vocabulary.json
 *   - percentiles.json: per-target cosine quantile arrays for rank display
 *
 * Why this exists: UMAP / axes / targets / validator are small + offline
 * LLM-curated and live in the repo. Embeddings are 40+ MB and we don't want
 * to commit them. This generator fetches them once from OpenAI and caches
 * on the persistent disk. Deterministic for a given (model, vocabulary)
 * tuple, so axes.json + umap.json generated offline stay valid.
 *
 * TypeScript-native so no Python runtime is needed in production.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { SEMANTIC_RUNTIME_DIR, SEMANTIC_STATIC_DIR } from '~/server/utils/data-loader';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 512;
const BATCH_SIZE = 256;

type VocabFile = { words: string[] };
type TargetsFile = { targets: string[] };

/** True when the runtime files are available somewhere (runtime dir OR
 *  the static dir fallback used in local dev). Checks binary .f32 first,
 *  then legacy JSON. Regeneration only needed when neither exists. */
export function semanticRuntimeCacheExists(): boolean {
    const embOk =
        // Binary (preferred)
        (existsSync(join(SEMANTIC_RUNTIME_DIR, 'embeddings.f32')) &&
            existsSync(join(SEMANTIC_RUNTIME_DIR, 'embeddings.meta.json'))) ||
        (existsSync(join(SEMANTIC_STATIC_DIR, 'embeddings.f32')) &&
            existsSync(join(SEMANTIC_STATIC_DIR, 'embeddings.meta.json'))) ||
        // Legacy JSON fallback
        existsSync(join(SEMANTIC_RUNTIME_DIR, 'embeddings.json')) ||
        existsSync(join(SEMANTIC_STATIC_DIR, 'embeddings.json'));
    const pctOk =
        existsSync(join(SEMANTIC_RUNTIME_DIR, 'percentiles.json')) ||
        existsSync(join(SEMANTIC_STATIC_DIR, 'percentiles.json'));
    return embOk && pctOk;
}

/**
 * Fetch embeddings for every word in vocabulary.json and write the result
 * to `{SEMANTIC_RUNTIME_DIR}/embeddings.json`. Also computes per-target
 * cosine percentiles and writes `percentiles.json` alongside.
 *
 * Idempotent: safe to call when files already exist (will overwrite).
 * No-op safe when OPENAI_API_KEY is missing — returns false so the caller
 * can report the degraded state without crashing.
 */
export async function generateSemanticRuntimeData(): Promise<boolean> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        consola.warn(
            '[semantic generate] OPENAI_API_KEY missing — cannot regenerate embeddings'
        );
        return false;
    }

    const vocabPath = join(SEMANTIC_STATIC_DIR, 'vocabulary.json');
    const targetsPath = join(SEMANTIC_STATIC_DIR, 'targets.json');
    if (!existsSync(vocabPath) || !existsSync(targetsPath)) {
        consola.warn(
            '[semantic generate] vocabulary.json or targets.json missing from static dir'
        );
        return false;
    }

    const vocab: VocabFile = JSON.parse(readFileSync(vocabPath, 'utf-8'));
    const targetsFile: TargetsFile = JSON.parse(readFileSync(targetsPath, 'utf-8'));
    const words = vocab.words;
    const N = words.length;

    consola.info(
        `[semantic generate] fetching ${N} embeddings from ${EMBEDDING_MODEL} @ ${EMBEDDING_DIMS}d...`
    );
    const t0 = Date.now();

    const matrix = new Float32Array(N * EMBEDDING_DIMS);
    for (let i = 0; i < N; i += BATCH_SIZE) {
        const batch = words.slice(i, i + BATCH_SIZE);
        const vectors = await fetchEmbeddingBatch(apiKey, batch);
        for (let j = 0; j < vectors.length; j++) {
            const raw = vectors[j]!;
            const row = (i + j) * EMBEDDING_DIMS;
            // L2-normalize so cosine = dot product downstream
            let norm = 0;
            for (let k = 0; k < EMBEDDING_DIMS; k++) norm += raw[k]! * raw[k]!;
            norm = Math.sqrt(norm) || 1;
            for (let k = 0; k < EMBEDDING_DIMS; k++) {
                matrix[row + k] = raw[k]! / norm;
            }
        }
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(N / BATCH_SIZE);
        consola.info(`[semantic generate]   batch ${batchNum}/${totalBatches}`);
    }

    consola.info(
        `[semantic generate] embeddings fetched in ${Math.round((Date.now() - t0) / 1000)}s`
    );

    // Write binary .f32 + meta JSON (fast load) instead of the monolithic
    // embeddings.json. Sub-second parse vs ~4s for 230MB JSON.
    mkdirSync(SEMANTIC_RUNTIME_DIR, { recursive: true });

    // Binary: raw Float32Array dump
    writeFileSync(
        join(SEMANTIC_RUNTIME_DIR, 'embeddings.f32'),
        Buffer.from(matrix.buffer, matrix.byteOffset, matrix.byteLength)
    );
    consola.info('[semantic generate] wrote embeddings.f32');

    // Meta: word list + metadata (no vectors)
    writeFileSync(
        join(SEMANTIC_RUNTIME_DIR, 'embeddings.meta.json'),
        JSON.stringify({
            version: 2,
            format: 'f32',
            model: `${EMBEDDING_MODEL}-${EMBEDDING_DIMS}`,
            words,
            dims: EMBEDDING_DIMS,
            count: N,
            endian: 'little',
        })
    );
    consola.info('[semantic generate] wrote embeddings.meta.json');

    // Per-target cosine percentiles — 100 quantile bins per target. Pure
    // math, no external libraries needed.
    consola.info(
        `[semantic generate] computing percentiles for ${targetsFile.targets.length} targets...`
    );
    const percentiles = computePercentiles(matrix, words, targetsFile.targets);
    writeFileSync(
        join(SEMANTIC_RUNTIME_DIR, 'percentiles.json'),
        JSON.stringify({
            version: 1,
            bins: 100,
            model: `${EMBEDDING_MODEL}-${EMBEDDING_DIMS}`,
            targets: percentiles,
        })
    );
    consola.info('[semantic generate] wrote percentiles.json');

    return true;
}

async function fetchEmbeddingBatch(
    apiKey: string,
    words: string[]
): Promise<number[][]> {
    // Simple retry loop: 3 attempts with backoff. OpenAI occasionally 503s
    // during large batch fills.
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const resp = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: EMBEDDING_MODEL,
                    input: words,
                    dimensions: EMBEDDING_DIMS,
                }),
                signal: AbortSignal.timeout(60000),
            });
            if (!resp.ok) {
                throw new Error(`OpenAI embeddings ${resp.status}: ${await resp.text()}`);
            }
            const payload = (await resp.json()) as {
                data: Array<{ embedding: number[]; index: number }>;
            };
            // Sort by original index in case OpenAI returned them out of order
            const sorted = [...payload.data].sort((a, b) => a.index - b.index);
            return sorted.map((d) => d.embedding);
        } catch (e) {
            lastError = e;
            if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
            }
        }
    }
    throw lastError;
}

function computePercentiles(
    matrix: Float32Array,
    words: string[],
    targets: string[]
): Record<string, number[]> {
    const wordIndex = new Map<string, number>();
    for (let i = 0; i < words.length; i++) wordIndex.set(words[i]!, i);
    const N = words.length;
    const D = EMBEDDING_DIMS;
    const BINS = 100;

    const result: Record<string, number[]> = {};
    const cosines = new Float32Array(N); // reused across targets

    for (const target of targets) {
        const tIdx = wordIndex.get(target);
        if (tIdx === undefined) continue;

        // cosines[i] = dot(target, words[i]) — unit vectors, so cosine = dot
        const tOffset = tIdx * D;
        for (let i = 0; i < N; i++) {
            let dot = 0;
            const wOffset = i * D;
            for (let k = 0; k < D; k++) {
                dot += matrix[tOffset + k]! * matrix[wOffset + k]!;
            }
            cosines[i] = dot;
        }

        // Take 100 quantile points at centers of each bin (matches Python:
        // np.linspace(0, 1, 100, endpoint=False) + 0.5/100).
        const sorted = Array.from(cosines).sort((a, b) => a - b);
        const quantiles: number[] = new Array(BINS);
        for (let b = 0; b < BINS; b++) {
            const q = (b + 0.5) / BINS;
            const idx = Math.min(N - 1, Math.floor(q * N));
            quantiles[b] = Math.round(sorted[idx]! * 1e5) / 1e5;
        }
        result[target] = quantiles;
    }

    return result;
}
