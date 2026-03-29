/**
 * Word analysis utilities for SEO content pages.
 *
 * Computes letter frequency distributions, best starting words,
 * and letter coverage scores from a word list. Used by:
 * - /[lang]/best-starting-words page
 * - API endpoint for starting word data
 */

interface WordEntry {
    word: string;
    tier?: string;
    frequency?: number;
}

export interface LetterFrequency {
    letter: string;
    count: number;
    percentage: number;
}

export interface ScoredWord {
    word: string;
    /** Sum of letter frequencies for unique letters in the word */
    coverageScore: number;
    /** Number of unique letters (5 = all different = ideal) */
    uniqueLetters: number;
    /** Zipf frequency score from wordfreq (higher = more common word) */
    wordFrequency: number;
    /** Combined rank score (coverage * uniqueness bonus * familiarity) */
    overallScore: number;
}

/**
 * Compute letter frequency distribution from a word list.
 * Only counts each letter once per word (position-independent).
 */
export function computeLetterFrequency(words: string[]): LetterFrequency[] {
    const counts = new Map<string, number>();
    for (const word of words) {
        const seen = new Set<string>();
        for (const ch of word.toLowerCase()) {
            if (!seen.has(ch)) {
                seen.add(ch);
                counts.set(ch, (counts.get(ch) || 0) + 1);
            }
        }
    }

    const total = words.length;
    return Array.from(counts.entries())
        .map(([letter, count]) => ({
            letter,
            count,
            percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Score and rank words by how good they are as starting guesses.
 *
 * A good starting word:
 * 1. Uses frequent letters (high coverage score)
 * 2. Has all unique letters (no repeats — maximizes information)
 * 3. Is a common/familiar word (easy to remember)
 */
export function rankStartingWords(
    words: WordEntry[],
    opts: { limit?: number; tierFilter?: string } = {}
): ScoredWord[] {
    const { limit = 20, tierFilter = 'daily' } = opts;

    // Filter to daily-tier words (higher quality, more likely valid guesses)
    const filtered = tierFilter ? words.filter((w) => w.tier === tierFilter) : words;

    if (filtered.length === 0) return [];

    // Compute letter frequencies from the filtered pool
    const wordStrings = filtered.map((w) => w.word);
    const freqs = computeLetterFrequency(wordStrings);
    const freqMap = new Map(freqs.map((f) => [f.letter, f.percentage]));

    // Score each word
    const scored: ScoredWord[] = filtered.map((entry) => {
        const word = entry.word.toLowerCase();
        const uniqueChars = new Set(word);
        const uniqueLetters = uniqueChars.size;

        // Coverage: sum of frequency percentages for unique letters
        let coverageScore = 0;
        for (const ch of uniqueChars) {
            coverageScore += freqMap.get(ch) || 0;
        }

        // Uniqueness bonus: 5 unique letters = 1.0, 4 = 0.85, 3 = 0.7, etc.
        const uniquenessMultiplier = 0.4 + 0.12 * uniqueLetters;

        // Familiarity: prefer common words (Zipf frequency)
        const wordFrequency = entry.frequency || 0;
        const familiarityBonus = Math.min(wordFrequency / 7, 1); // Normalize 0-7 to 0-1

        const overallScore = coverageScore * uniquenessMultiplier * (0.7 + 0.3 * familiarityBonus);

        return {
            word: word.toUpperCase(),
            coverageScore: Math.round(coverageScore * 10) / 10,
            uniqueLetters,
            wordFrequency: Math.round(wordFrequency * 100) / 100,
            overallScore: Math.round(overallScore * 10) / 10,
        };
    });

    // Sort by overall score, return top N
    scored.sort((a, b) => b.overallScore - a.overallScore);

    // Deduplicate and prefer 5-unique-letter words
    return scored.filter((w) => w.uniqueLetters === 5).slice(0, limit);
}
