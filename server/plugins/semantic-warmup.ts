import { consola } from 'consola';
/**
 * Semantic Explorer — Nitro startup plugin.
 *
 * Loads only lightweight data at startup:
 *   - Axis vectors from Postgres (70 × 512 = 140KB)
 *   - Valid words for spellcheck from disk (~2MB)
 *
 * Embeddings (98-230MB) live in Postgres via pgvector — NOT loaded into memory.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Valid words set — loaded for spellcheck, shared with guess endpoint
let _validWords: Set<string> | null = null;

export function getValidWords(): Set<string> {
    if (_validWords) return _validWords;

    // Try runtime dir first, then static dir
    const dirs = [join(process.cwd(), 'semantic-runtime'), join(process.cwd(), 'data', 'semantic')];

    for (const dir of dirs) {
        const path = join(dir, 'valid_words.json');
        if (existsSync(path)) {
            try {
                const data = JSON.parse(readFileSync(path, 'utf-8'));
                const words = data.words ?? data;
                _validWords = new Set(Array.isArray(words) ? words : []);
                return _validWords;
            } catch {
                // try next
            }
        }
    }

    _validWords = new Set();
    return _validWords;
}

export default defineNitroPlugin(async () => {
    // 1. Load axes from Postgres (140KB, for compass computation)
    try {
        const { loadAxes } = await import('~/server/utils/_semantic-db');
        const t0 = Date.now();
        const axes = await loadAxes('en');
        consola.info(`[semantic warmup] loaded ${axes.length} axes in ${Date.now() - t0}ms`);
    } catch (e) {
        consola.warn('[semantic warmup] axis load failed:', e);
    }

    // 2. Load valid words for spellcheck (2MB, from disk)
    const validWords = getValidWords();
    consola.info(`[semantic warmup] loaded ${validWords.size} valid words for spellcheck`);
});
