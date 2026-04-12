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
 * Atomic increment of word stats. Uses raw SQL for ON CONFLICT upsert
 * with per-column increments — no read-modify-write, no lockfile.
 */
export async function incrementWordStats(
    lang: string,
    dayIdx: number,
    won: boolean,
    attempts: number
): Promise<void> {
    const distCol = attempts >= 1 && attempts <= 6 ? `dist_${attempts}` : null;

    try {
        await prisma.$executeRaw`
            INSERT INTO wordle.word_stats (lang, day_idx, total, wins, losses, ${distCol ? prisma.$raw(`${distCol}`) : prisma.$raw('dist_1')})
            VALUES (${lang}, ${dayIdx}, 1, ${won ? 1 : 0}, ${won ? 0 : 1}, ${distCol && won ? 1 : 0})
            ON CONFLICT (lang, day_idx) DO UPDATE SET
                total = word_stats.total + 1,
                wins = word_stats.wins + ${won ? 1 : 0},
                losses = word_stats.losses + ${won ? 0 : 1}
                ${distCol && won ? prisma.$raw(`, ${distCol} = word_stats.${distCol} + 1`) : prisma.$raw('')}
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
