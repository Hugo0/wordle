import { consola } from 'consola';
/**
 * Semantic Explorer — Nitro startup plugin.
 *
 * Two responsibilities:
 *
 *   1. Warm the in-memory semantic data cache BEFORE the first request, so
 *      the multi-megabyte `embeddings.json` parse doesn't stall the event
 *      loop while a player is waiting.
 *
 *   2. On first boot (or whenever `embeddings.json` is missing from the
 *      persistent disk), regenerate it via OpenAI by calling the
 *      TypeScript-native generator. No Python runtime needed in production.
 *
 * The generated files land in SEMANTIC_RUNTIME_DIR (persistent disk on
 * Render). Delete them to force regeneration on the next boot.
 */

import { loadSemanticData, SemanticDataMissingError } from '~/server/utils/semantic';
import {
    generateSemanticRuntimeData,
    semanticRuntimeCacheExists,
} from '~/server/utils/semanticGenerate';

export default defineNitroPlugin(async () => {
    // Fast path: files already on disk → just warm the in-memory cache.
    if (semanticRuntimeCacheExists()) {
        try {
            const t0 = Date.now();
            const data = loadSemanticData();
            const ms = Date.now() - t0;
            consola.info(
                `[semantic warmup] loaded ${data.words.length} embeddings, ` +
                    `${data.targets.length} targets, ${data.validWords.size} validator words in ${ms}ms`
            );
        } catch (e) {
            consola.warn('[semantic warmup] load failed:', e);
        }
        return;
    }

    // Missing runtime files → regenerate before the first request lands.
    consola.info('[semantic warmup] runtime cache missing — regenerating from OpenAI');
    try {
        const ok = await generateSemanticRuntimeData();
        if (!ok) {
            consola.warn('[semantic warmup] regeneration skipped (missing key or static data)');
            return;
        }
        const data = loadSemanticData();
        consola.info(
            `[semantic warmup] regenerated + loaded ${data.words.length} embeddings, ` +
                `${data.targets.length} targets`
        );
    } catch (e) {
        if (e instanceof SemanticDataMissingError) {
            consola.warn('[semantic warmup] post-generation load still missing files:', e.missing);
        } else {
            consola.warn('[semantic warmup] regeneration failed:', e);
        }
    }
});
