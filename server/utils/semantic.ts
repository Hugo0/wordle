/**
 * Semantic Explorer — shared server utilities.
 *
 * Lightweight functions used by multiple endpoints:
 *   - cosine similarity (pre-normalized dot product)
 *   - rank-to-display transform
 *   - session management (target ID ↔ word mapping)
 *   - compass hint generation (Gram-Schmidt matching pursuit)
 *
 * Heavy operations (embeddings, kNN, rank lookup) live in _semantic-db.ts
 * (pgvector-backed). This module has no file I/O, no startup cost.
 */

// ---------------------------------------------------------------------------
// Cosine similarity & rank display
// ---------------------------------------------------------------------------

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    // Embeddings are pre-normalized, so cosine = dot product.
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
    return dot;
}

/** Log-transform rank to a 0..1 display value. */
export function rankToDisplay(rank: number, totalRanked: number): number {
    if (!Number.isFinite(rank) || rank < 1) return 0;
    if (rank === 1) return 1;
    if (totalRanked <= 1) return 0;
    const v = 1 - Math.log(rank) / Math.log(totalRanked);
    return Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------------
// Target session management
// ---------------------------------------------------------------------------

const _sessions = new Map<string, { target: string; createdAt: number }>();

export function createSession(target: string): string {
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    _sessions.set(id, { target, createdAt: Date.now() });
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

// ---------------------------------------------------------------------------
// Compass hint generation
// ---------------------------------------------------------------------------

export type CompassHint = {
    axis: string;
    lowAnchor: string;
    highAnchor: string;
    direction: 'positive' | 'negative';
    magnitudeTier: 'slight' | 'clear' | 'strong';
    delta: number;
    explained: number;
};

export type CompassResult = {
    hints: CompassHint[];
    status: 'ok' | 'close';
    totalExplained: number;
};

const COMPASS_MIN_R_NORM_SQ = 0.09;

// Static magnitude tiers — calibrated from empirical data.
// In 512-dim space, best axis typically explains 4-8% of travel direction.
let MAGNITUDE_STRONG = 0.04;
let MAGNITUDE_CLEAR = 0.015;

function magnitudeTierFromExplained(explained: number): 'slight' | 'clear' | 'strong' {
    if (explained >= MAGNITUDE_STRONG) return 'strong';
    if (explained >= MAGNITUDE_CLEAR) return 'clear';
    return 'slight';
}

/**
 * Compute compass hints for a (guess, target) pair.
 *
 * Uses iterative matching pursuit (Gram-Schmidt) to find the k axes that
 * best explain the direction r = target - guess in embedding space.
 *
 * The `data` parameter is a lightweight shim with only axes data — NOT the
 * full SemanticData object. Required fields: dims, axesNames, axesVectors,
 * axes (for anchor labels), axesAuc.
 */
export function computeCompass(
    data: {
        dims: number;
        axesNames: string[];
        axesVectors: Float32Array;
        axes: Record<string, { low_anchor: string; high_anchor: string }>;
        axesAuc: Record<string, number>;
    },
    guessVec: Float32Array,
    targetVec: Float32Array,
    k: number = 5,
    excludeAxes: string[] = []
): CompassResult {
    const D = data.dims;

    const r = new Float32Array(D);
    let rNormSq = 0;
    for (let i = 0; i < D; i++) {
        const v = targetVec[i]! - guessVec[i]!;
        r[i] = v;
        rNormSq += v * v;
    }

    if (rNormSq < COMPASS_MIN_R_NORM_SQ) {
        return { hints: [], status: 'close', totalExplained: 0 };
    }

    const excludeSet = new Set(excludeAxes);

    type Scored = {
        name: string;
        rowIdx: number;
        delta: number;
        explained: number;
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

    // Matching pursuit with Gram-Schmidt orthogonalization
    const picked: Scored[] = [];
    const basis: Float32Array[] = [];
    const basisDotR: number[] = [];
    let totalExplained = 0;

    for (let iter = 0; iter < kCap; iter++) {
        let best: Scored | null = null;
        let bestDelta = 0;
        let bestExplained = 0;
        let bestBasisDots: Float32Array | null = null;

        for (const b of scored) {
            if (picked.some((p) => p.rowIdx === b.rowIdx)) continue;
            const bRow = b.rowIdx * D;

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

            let bPerpNormSq = 1;
            for (let i = 0; i < basis.length; i++) {
                bPerpNormSq -= dots[i]! * dots[i]!;
            }
            if (bPerpNormSq < 1e-9) continue;

            const orthExplained = (bPerpDotR * bPerpDotR) / (bPerpNormSq * rNormSq);

            if (orthExplained > bestExplained) {
                bestExplained = orthExplained;
                bestDelta = bPerpDotR / Math.sqrt(bPerpNormSq);
                best = b;
                bestBasisDots = dots;
            }
        }

        if (!best) break;

        picked.push(best);
        totalExplained += bestExplained;

        // Extend orthonormal basis
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
        if (newNorm < 1e-6) break;
        for (let j = 0; j < D; j++) newBasis[j] /= newNorm;
        basis.push(newBasis);
        basisDotR.push(bestDelta);
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
