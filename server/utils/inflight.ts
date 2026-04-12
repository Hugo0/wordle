/**
 * In-flight request deduplication.
 *
 * When multiple requests need the same expensive result (LLM call, embedding
 * fetch, etc.), only the first one actually runs. Subsequent callers for the
 * same key receive the same Promise. Once the Promise settles, the key is
 * removed so future requests can trigger a fresh computation.
 *
 * Usage:
 *   const result = await dedup('definitions', `${lang}:${word}`, () => callLlm(word, lang));
 */

const _pools = new Map<string, Map<string, Promise<any>>>();

function getPool(namespace: string): Map<string, Promise<any>> {
    let pool = _pools.get(namespace);
    if (!pool) {
        pool = new Map();
        _pools.set(namespace, pool);
    }
    return pool;
}

/**
 * Deduplicate concurrent calls for the same key within a namespace.
 * Only the first caller runs `fn()`; others await the same Promise.
 */
export function dedup<T>(namespace: string, key: string, fn: () => Promise<T>): Promise<T> {
    const pool = getPool(namespace);
    const inflight = pool.get(key);
    if (inflight) return inflight as Promise<T>;

    const promise = fn().finally(() => {
        pool.delete(key);
    });
    pool.set(key, promise);
    return promise;
}
