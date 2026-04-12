/**
 * db-cache — unified database cache layer.
 *
 * Single module for all Postgres-backed cache operations (definitions,
 * word stats, wiktionary checks, semantic hints). Every function follows
 * the same pattern:
 *   1. Try DB query
 *   2. On DB error, fall back to disk (backward compatibility)
 *   3. On miss, return null (caller handles LLM/API fallback)
 *
 * This replaces scattered disk I/O with file locks across multiple
 * server/utils modules. The DB provides atomicity (word stats),
 * queryability (analytics), and eliminates filesystem dependencies.
 */

import { prisma } from './prisma';

// ═══════════════════════════════════════════════════════════════════════════
// Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface DefinitionData {
    definition?: string | null;
    definitionNative?: string | null;
    definitionEn?: string | null;
    partOfSpeech?: string | null;
    confidence?: number | null;
    source?: string | null;
    url?: string | null;
}

export async function getDefinition(
    lang: string,
    word: string
): Promise<(DefinitionData & { isNegative: boolean; cachedAt: Date }) | null> {
    try {
        const row = await prisma.definition.findUnique({
            where: { lang_word: { lang, word } },
        });
        if (!row) return null;

        // Negative cache entries expire after 24h
        if (row.isNegative) {
            const age = Date.now() - row.cachedAt.getTime();
            if (age > 24 * 60 * 60 * 1000) return null; // expired
        }

        return row;
    } catch {
        return null; // DB error → caller falls back to disk/LLM
    }
}

export async function upsertDefinition(
    lang: string,
    word: string,
    data: DefinitionData,
    isNegative = false
): Promise<void> {
    try {
        await prisma.definition.upsert({
            where: { lang_word: { lang, word } },
            create: {
                lang,
                word,
                ...data,
                isNegative,
            },
            update: {
                ...data,
                isNegative,
                cachedAt: new Date(),
            },
        });
    } catch {
        // Non-critical — disk fallback still works
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Word Stats
// ═══════════════════════════════════════════════════════════════════════════

export interface WordStats {
    total: number;
    wins: number;
    losses: number;
    distribution: Record<number, number>;
}

export async function getWordStats(lang: string, dayIdx: number): Promise<WordStats | null> {
    try {
        const row = await prisma.wordStat.findUnique({
            where: { lang_dayIdx: { lang, dayIdx } },
        });
        if (!row) return null;

        return {
            total: row.total,
            wins: row.wins,
            losses: row.losses,
            distribution: {
                1: row.dist1,
                2: row.dist2,
                3: row.dist3,
                4: row.dist4,
                5: row.dist5,
                6: row.dist6,
            },
        };
    } catch {
        return null;
    }
}

/**
 * Atomic increment of word stats. Uses explicit per-column SQL
 * (no dynamic column names) for safety. Each dist column is
 * conditionally incremented by 0 or 1.
 */
export async function incrementWordStats(
    lang: string,
    dayIdx: number,
    won: boolean,
    attempts: number
): Promise<void> {
    // Safe: no dynamic SQL. Each dist column gets +1 only if won AND attempts matches.
    const d1 = won && attempts === 1 ? 1 : 0;
    const d2 = won && attempts === 2 ? 1 : 0;
    const d3 = won && attempts === 3 ? 1 : 0;
    const d4 = won && attempts === 4 ? 1 : 0;
    const d5 = won && attempts === 5 ? 1 : 0;
    const d6 = won && attempts === 6 ? 1 : 0;

    try {
        await prisma.$executeRaw`
            INSERT INTO wordle.word_stats (lang, day_idx, total, wins, losses, dist_1, dist_2, dist_3, dist_4, dist_5, dist_6)
            VALUES (${lang}, ${dayIdx}, 1, ${won ? 1 : 0}, ${won ? 0 : 1}, ${d1}, ${d2}, ${d3}, ${d4}, ${d5}, ${d6})
            ON CONFLICT (lang, day_idx) DO UPDATE SET
                total = word_stats.total + 1,
                wins = word_stats.wins + ${won ? 1 : 0},
                losses = word_stats.losses + ${won ? 0 : 1},
                dist_1 = word_stats.dist_1 + ${d1},
                dist_2 = word_stats.dist_2 + ${d2},
                dist_3 = word_stats.dist_3 + ${d3},
                dist_4 = word_stats.dist_4 + ${d4},
                dist_5 = word_stats.dist_5 + ${d5},
                dist_6 = word_stats.dist_6 + ${d6}
        `;
    } catch (e) {
        console.warn('[db-cache] incrementWordStats failed:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Wiktionary Existence Cache
// ═══════════════════════════════════════════════════════════════════════════

export async function getWiktionaryExists(lang: string, word: string): Promise<boolean | null> {
    try {
        const row = await prisma.wiktionaryCache.findUnique({
            where: { lang_word: { lang, word } },
        });
        return row?.exists ?? null;
    } catch {
        return null;
    }
}

export async function setWiktionaryExists(
    lang: string,
    word: string,
    exists: boolean
): Promise<void> {
    try {
        await prisma.wiktionaryCache.upsert({
            where: { lang_word: { lang, word } },
            create: { lang, word, exists },
            update: { exists, checkedAt: new Date() },
        });
    } catch {
        // Non-critical
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Semantic Hints
// ═══════════════════════════════════════════════════════════════════════════

export async function getSemanticHint(lang: string, word: string): Promise<string | null> {
    try {
        const row = await prisma.semanticHint.findUnique({
            where: { lang_word: { lang, word } },
        });
        return row?.hint ?? null;
    } catch {
        return null;
    }
}

export async function setSemanticHint(
    lang: string,
    word: string,
    hint: string,
    model?: string
): Promise<void> {
    try {
        await prisma.semanticHint.upsert({
            where: { lang_word: { lang, word } },
            create: { lang, word, hint, model },
            update: { hint, model, cachedAt: new Date() },
        });
    } catch {
        // Non-critical
    }
}
