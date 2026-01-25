/**
 * Unit tests for Wordle game logic
 */
import { describe, it, expect } from 'vitest';

/**
 * Color calculation algorithm - extracted from game.ts updateColors()
 * Returns an array of color states: 'correct', 'semicorrect', or 'incorrect'
 */
export function calculateColors(
    guess: string,
    target: string
): ('correct' | 'semicorrect' | 'incorrect')[] {
    const result: ('correct' | 'semicorrect' | 'incorrect')[] = [];
    const charCounts: Record<string, number> = {};

    // Count characters in target word
    for (const char of target) {
        charCounts[char] = (charCounts[char] || 0) + 1;
    }

    // First pass: mark correct positions (green)
    const guessChars = guess.split('');
    const isCorrect: boolean[] = [];

    for (let i = 0; i < guessChars.length; i++) {
        const char = guessChars[i]!;
        if (char === target[i]) {
            isCorrect[i] = true;
            charCounts[char]!--;
        } else {
            isCorrect[i] = false;
        }
    }

    // Second pass: mark semicorrect (yellow) and incorrect (gray)
    for (let i = 0; i < guessChars.length; i++) {
        const char = guessChars[i]!;
        if (isCorrect[i]) {
            result[i] = 'correct';
        } else if (target.includes(char) && charCounts[char]! > 0) {
            result[i] = 'semicorrect';
            charCounts[char]!--;
        } else {
            result[i] = 'incorrect';
        }
    }

    return result;
}

/**
 * Stats calculation - extracted from game.ts calculateStats()
 */
export interface GameResult {
    won: boolean;
    attempts: string | number;
    date?: Date;
}

export interface GameStats {
    n_wins: number;
    n_losses: number;
    n_games: number;
    n_attempts: number;
    avg_attempts: number;
    win_percentage: number;
    longest_streak: number;
    current_streak: number;
    guessDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number; 6: number };
}

export function calculateStats(results: GameResult[]): GameStats {
    const emptyDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    if (!results?.length) {
        return {
            n_wins: 0,
            n_losses: 0,
            n_games: 0,
            n_attempts: 0,
            avg_attempts: 0,
            win_percentage: 0,
            longest_streak: 0,
            current_streak: 0,
            guessDistribution: { ...emptyDistribution },
        };
    }

    let n_wins = 0,
        n_losses = 0,
        n_attempts = 0;
    let current_streak = 0,
        longest_streak = 0;
    const guessDistribution = { ...emptyDistribution };

    for (const result of results) {
        const attempts =
            typeof result.attempts === 'string'
                ? parseInt(result.attempts, 10) || 0
                : result.attempts;

        if (result.won) {
            n_wins++;
            current_streak++;
            longest_streak = Math.max(longest_streak, current_streak);
            if (attempts >= 1 && attempts <= 6) {
                guessDistribution[attempts as 1 | 2 | 3 | 4 | 5 | 6]++;
            }
        } else {
            n_losses++;
            current_streak = 0;
        }
        n_attempts += attempts;
    }

    const total = n_wins + n_losses;
    return {
        n_wins,
        n_losses,
        n_games: results.length,
        n_attempts,
        avg_attempts: n_attempts / results.length,
        win_percentage: total > 0 ? Math.round((n_wins / total) * 100) : 0,
        longest_streak,
        current_streak,
        guessDistribution,
    };
}

// ================================
// Tests for calculateColors
// ================================

describe('calculateColors', () => {
    it('should mark all letters correct when guess matches target', () => {
        const result = calculateColors('apple', 'apple');
        expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    });

    it('should mark all letters incorrect when no matches', () => {
        const result = calculateColors('xxxxx', 'apple');
        expect(result).toEqual(['incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect']);
    });

    it('should mark correct positions green and wrong positions yellow', () => {
        // Target: "apple", Guess: "papel"
        // p: correct (position 1 in guess matches position 1... wait, let me recalculate)
        // Actually: apple = a,p,p,l,e
        //           papel = p,a,p,e,l
        // Position 0: p vs a -> p is in apple, yellow
        // Position 1: a vs p -> a is in apple, yellow
        // Position 2: p vs p -> correct, green
        // Position 3: e vs l -> e is in apple, yellow
        // Position 4: l vs e -> l is in apple, yellow
        const result = calculateColors('papel', 'apple');
        expect(result).toEqual([
            'semicorrect',
            'semicorrect',
            'correct',
            'semicorrect',
            'semicorrect',
        ]);
    });

    it('should handle duplicate letters correctly - only mark as many yellows as exist in target', () => {
        // Target: "party", Guess: "paapa"
        // p: correct (pos 0)
        // a: correct (pos 1)
        // a: incorrect (only one 'a' in target, already used)
        // p: incorrect (only one 'p' in target, already used)
        // a: incorrect (no more 'a's available)
        const result = calculateColors('paapa', 'party');
        expect(result).toEqual(['correct', 'correct', 'incorrect', 'incorrect', 'incorrect']);
    });

    it('should prioritize green over yellow for duplicate letters', () => {
        // Target: "aback", Guess: "abaca"
        // a: correct (pos 0, 'a' at pos 0 of target)
        // b: correct (pos 1)
        // a: semicorrect (pos 2, there's another 'a' at pos 2 of target)
        // c: correct (pos 3)
        // a: incorrect (no more 'a's - target has 2: pos 0 and 2)
        // Wait, "aback" = a,b,a,c,k - two 'a's at positions 0 and 2
        // "abaca" = a,b,a,c,a
        // pos 0: a=a correct
        // pos 1: b=b correct
        // pos 2: a=a correct
        // pos 3: c=c correct
        // pos 4: a vs k, 'a' is in target but both 'a's are used -> incorrect
        const result = calculateColors('abaca', 'aback');
        expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'incorrect']);
    });

    it('should handle word with all same letters', () => {
        // Target: "aaaaa", Guess: "aaaaa"
        const result = calculateColors('aaaaa', 'aaaaa');
        expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    });

    it('should handle repeated letter where some are correct', () => {
        // Target: "geese", Guess: "eerie"
        // e: semicorrect (pos 0, there's 'e' at pos 1,2,4 of target)
        // e: correct (pos 1)
        // r: incorrect
        // i: incorrect
        // e: correct (pos 4)
        // After greens: e at pos 1 and 4 matched. Target has 3 e's, 2 used for green.
        // Yellow pass: e at pos 0 can use the remaining e (pos 2 in target)
        const result = calculateColors('eerie', 'geese');
        expect(result).toEqual(['semicorrect', 'correct', 'incorrect', 'incorrect', 'correct']);
    });

    it('should work with classic wordle example - crane vs slate', () => {
        // Target: "slate", Guess: "crane"
        // c: incorrect
        // r: incorrect
        // a: correct (a is at pos 2 in both!)
        // n: incorrect
        // e: correct (e is at pos 4 in both)
        const result = calculateColors('crane', 'slate');
        expect(result).toEqual(['incorrect', 'incorrect', 'correct', 'incorrect', 'correct']);
    });
});

// ================================
// Tests for calculateStats
// ================================

describe('calculateStats', () => {
    it('should return zeros for empty results', () => {
        const stats = calculateStats([]);
        expect(stats.n_wins).toBe(0);
        expect(stats.n_losses).toBe(0);
        expect(stats.n_games).toBe(0);
        expect(stats.win_percentage).toBe(0);
        expect(stats.current_streak).toBe(0);
        expect(stats.longest_streak).toBe(0);
    });

    it('should calculate basic win stats', () => {
        const results: GameResult[] = [
            { won: true, attempts: '3' },
            { won: true, attempts: '4' },
            { won: true, attempts: '2' },
        ];
        const stats = calculateStats(results);
        expect(stats.n_wins).toBe(3);
        expect(stats.n_losses).toBe(0);
        expect(stats.n_games).toBe(3);
        expect(stats.win_percentage).toBe(100);
        expect(stats.n_attempts).toBe(9);
        expect(stats.avg_attempts).toBe(3);
    });

    it('should calculate win percentage correctly', () => {
        const results: GameResult[] = [
            { won: true, attempts: '3' },
            { won: false, attempts: '6' },
            { won: true, attempts: '4' },
            { won: false, attempts: '6' },
        ];
        const stats = calculateStats(results);
        expect(stats.n_wins).toBe(2);
        expect(stats.n_losses).toBe(2);
        expect(stats.win_percentage).toBe(50);
    });

    it('should track current streak correctly', () => {
        const results: GameResult[] = [
            { won: true, attempts: '3' },
            { won: true, attempts: '4' },
            { won: false, attempts: '6' }, // Breaks streak
            { won: true, attempts: '2' },
            { won: true, attempts: '5' },
            { won: true, attempts: '3' },
        ];
        const stats = calculateStats(results);
        expect(stats.current_streak).toBe(3); // Last 3 wins
        expect(stats.longest_streak).toBe(3); // Tied between first 2 and last 3
    });

    it('should track longest streak even if current is broken', () => {
        const results: GameResult[] = [
            { won: true, attempts: '3' },
            { won: true, attempts: '4' },
            { won: true, attempts: '2' },
            { won: true, attempts: '5' },
            { won: true, attempts: '3' }, // 5 win streak
            { won: false, attempts: '6' }, // Breaks streak
            { won: true, attempts: '2' }, // New streak of 1
        ];
        const stats = calculateStats(results);
        expect(stats.current_streak).toBe(1);
        expect(stats.longest_streak).toBe(5);
    });

    it('should build guess distribution correctly', () => {
        const results: GameResult[] = [
            { won: true, attempts: '1' },
            { won: true, attempts: '3' },
            { won: true, attempts: '3' },
            { won: true, attempts: '4' },
            { won: true, attempts: '6' },
            { won: false, attempts: '6' }, // Losses don't count in distribution
        ];
        const stats = calculateStats(results);
        expect(stats.guessDistribution).toEqual({
            1: 1,
            2: 0,
            3: 2,
            4: 1,
            5: 0,
            6: 1,
        });
    });

    it('should handle numeric attempts (not just strings)', () => {
        const results: GameResult[] = [
            { won: true, attempts: 3 },
            { won: true, attempts: 4 },
        ];
        const stats = calculateStats(results);
        expect(stats.n_attempts).toBe(7);
        expect(stats.guessDistribution[3]).toBe(1);
        expect(stats.guessDistribution[4]).toBe(1);
    });

    it('should reset current streak on loss', () => {
        const results: GameResult[] = [
            { won: true, attempts: '3' },
            { won: true, attempts: '4' },
            { won: true, attempts: '2' },
            { won: false, attempts: '6' }, // Streak broken
        ];
        const stats = calculateStats(results);
        expect(stats.current_streak).toBe(0);
        expect(stats.longest_streak).toBe(3);
    });
});
