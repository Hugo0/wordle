/**
 * Unit tests for community percentile calculation
 */
import { describe, it, expect } from 'vitest';
import { calculateCommunityPercentile, type WordStats } from '../stats';

function makeStats(distribution: Record<number, number>, losses: number = 0): WordStats {
    const wins = Object.values(distribution).reduce((a, b) => a + b, 0);
    return {
        total: wins + losses,
        losses,
        distribution: Object.fromEntries(
            Object.entries(distribution).map(([k, v]) => [String(k), v])
        ),
    };
}

describe('calculateCommunityPercentile', () => {
    // ===== Top score cases =====

    it('should be top score when player is the only one', () => {
        const result = calculateCommunityPercentile(3, makeStats({ 3: 1 }));
        expect(result?.isTopScore).toBe(true);
        expect(result?.percentile).toBe(0);
    });

    it('should be top score when player tied for best', () => {
        const result = calculateCommunityPercentile(2, makeStats({ 2: 5 }));
        expect(result?.isTopScore).toBe(true);
    });

    it('should be top score when player got 1 and others got worse', () => {
        const result = calculateCommunityPercentile(1, makeStats({ 1: 1, 3: 10, 6: 5 }, 3));
        expect(result?.isTopScore).toBe(true);
    });

    it('should be top score for first-guess solve even with many players', () => {
        const stats = makeStats({ 1: 2, 2: 50, 3: 100, 4: 80, 5: 30, 6: 10 }, 20);
        const result = calculateCommunityPercentile(1, stats);
        expect(result?.isTopScore).toBe(true);
    });

    // ===== NOT top score — the original bug =====

    it('should NOT be top score for 6-guess win when others solved in fewer', () => {
        const stats = makeStats({ 2: 3, 4: 5, 6: 1 });
        const result = calculateCommunityPercentile(6, stats);
        expect(result?.isTopScore).toBe(false);
        expect(result?.percentile).toBe(0); // beat 0 out of 9 players
    });

    it('should NOT be top score for worst winning score even with no losses', () => {
        const stats = makeStats({ 2: 10, 6: 1 });
        const result = calculateCommunityPercentile(6, stats);
        expect(result?.isTopScore).toBe(false);
        expect(result?.percentile).toBe(0); // beat 0 out of 11
    });

    it('should NOT be top score for 5-guess when someone got 2', () => {
        const stats = makeStats({ 2: 1, 5: 1 });
        const result = calculateCommunityPercentile(5, stats);
        expect(result?.isTopScore).toBe(false);
    });

    // ===== Normal percentile cases =====

    it('should calculate percentile correctly for middle score', () => {
        // 101 players: 5 got 1, 15 got 2, 41 got 3, 10 got 4, 10 got 5, 10 got 6, 10 lost
        const stats = makeStats({ 1: 5, 2: 15, 3: 41, 4: 10, 5: 10, 6: 10 }, 10);
        const result = calculateCommunityPercentile(3, stats);
        // worse = 10(losses) + 10(6) + 10(5) + 10(4) = 40
        // percentile = round(40/101*100) = 40
        expect(result?.isTopScore).toBe(false);
        expect(result?.percentile).toBe(40);
    });

    it('should give high percentile when most players did worse', () => {
        const stats = makeStats({ 2: 1, 4: 20, 5: 30, 6: 40 }, 10);
        // player got 2, worse = 10+40+30+20 = 100, total = 101
        const result = calculateCommunityPercentile(2, stats);
        expect(result?.isTopScore).toBe(true); // nobody got 1
        expect(result?.percentile).toBe(99); // round(100/101*100) = 99
    });

    it('should give 0 percentile when most players did better', () => {
        const stats = makeStats({ 1: 40, 2: 30, 3: 20, 6: 1 });
        // player got 6, worse = 0, better = 90
        const result = calculateCommunityPercentile(6, stats);
        expect(result?.isTopScore).toBe(false);
        expect(result?.percentile).toBe(0);
    });

    it('should handle case with only losses as worse', () => {
        const stats = makeStats({ 1: 2, 3: 1 }, 5);
        // player got 3, worse = 5(losses), better = 2
        // percentile = round(5/8*100) = 63
        const result = calculateCommunityPercentile(3, stats);
        expect(result?.isTopScore).toBe(false);
        expect(result?.percentile).toBe(63);
    });

    it('should count losses as worse than any win', () => {
        const stats = makeStats({ 6: 1 }, 10);
        // player got 6, worse = 10(losses), total = 11
        const result = calculateCommunityPercentile(6, stats);
        expect(result?.isTopScore).toBe(true); // nobody got fewer
        expect(result?.percentile).toBe(91); // round(10/11*100)
    });

    // ===== Edge cases =====

    it('should return null for invalid attempts (0)', () => {
        expect(calculateCommunityPercentile(0, makeStats({ 3: 10 }))).toBeNull();
    });

    it('should return null for invalid attempts (7)', () => {
        expect(calculateCommunityPercentile(7, makeStats({ 3: 10 }))).toBeNull();
    });

    it('should return null for empty stats', () => {
        expect(
            calculateCommunityPercentile(3, { total: 0, losses: 0, distribution: {} })
        ).toBeNull();
    });

    it('should return null for null-ish stats', () => {
        expect(calculateCommunityPercentile(3, null as unknown as WordStats)).toBeNull();
    });

    it('should handle missing distribution keys gracefully', () => {
        const stats: WordStats = { total: 5, losses: 2, distribution: { '3': 3 } };
        // player got 2, worse = 2(losses) + 3(got 3) = 5, better = 0 (no key "1")
        const result = calculateCommunityPercentile(2, stats);
        expect(result?.isTopScore).toBe(true);
        expect(result?.percentile).toBe(100); // round(5/5*100)
    });

    it('should handle all players lost except current player', () => {
        const stats = makeStats({ 4: 1 }, 99);
        const result = calculateCommunityPercentile(4, stats);
        expect(result?.isTopScore).toBe(true);
        expect(result?.percentile).toBe(99); // round(99/100*100)
    });

    // ===== Rounding =====

    it('should round 1/3 to 33', () => {
        const stats = makeStats({ 1: 1, 3: 1 }, 1);
        // player got 3, worse = 1(loss), better = 1(got 1), total = 3
        const result = calculateCommunityPercentile(3, stats);
        expect(result?.percentile).toBe(33);
    });

    it('should round 2/3 to 67', () => {
        const stats = makeStats({ 1: 1, 3: 1 }, 1);
        // player got 1, worse = 1(loss) + 1(got 3) = 2, total = 3
        const result = calculateCommunityPercentile(1, stats);
        expect(result?.percentile).toBe(67);
    });

    // ===== Boundary: all 6 attempt levels =====

    it('should handle each attempt level correctly', () => {
        const stats = makeStats({ 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10 }, 10);
        // total = 70

        // Got it in 1: worse = 10(losses) + 10*5(attempts 2-6) = 60, better = 0
        const r1 = calculateCommunityPercentile(1, stats);
        expect(r1?.isTopScore).toBe(true);
        expect(r1?.percentile).toBe(86); // round(60/70*100)

        // Got it in 3: worse = 10(losses) + 10(6) + 10(5) + 10(4) = 40, better = 10(1)+10(2) = 20
        const r3 = calculateCommunityPercentile(3, stats);
        expect(r3?.isTopScore).toBe(false);
        expect(r3?.percentile).toBe(57); // round(40/70*100)

        // Got it in 6: worse = 10(losses), better = 10*5 = 50
        const r6 = calculateCommunityPercentile(6, stats);
        expect(r6?.isTopScore).toBe(false);
        expect(r6?.percentile).toBe(14); // round(10/70*100)
    });
});
