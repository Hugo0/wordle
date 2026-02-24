/**
 * Community stats calculation utilities.
 * Kept separate from game.ts to allow unit testing without browser dependencies.
 */

export interface WordStats {
    total: number;
    losses: number;
    distribution: Record<string, number>;
}

export interface CommunityPercentileResult {
    isTopScore: boolean;
    percentile: number; // percentage of players who did worse (0-100)
}

/**
 * Calculate community percentile from word stats.
 * Returns null if stats are insufficient, otherwise an object with:
 * - isTopScore: true if nobody solved it in fewer attempts
 * - percentile: percentage of players the current player beat (0-100)
 */
export function calculateCommunityPercentile(
    playerAttempts: number,
    stats: WordStats
): CommunityPercentileResult | null {
    if (!stats || !stats.total || playerAttempts < 1 || playerAttempts > 6) return null;

    // Count players who did worse (more attempts or lost)
    let worsePlayers = stats.losses || 0;
    for (let i = playerAttempts + 1; i <= 6; i++) {
        worsePlayers += stats.distribution?.[String(i)] || 0;
    }
    // Count players who did better (fewer attempts)
    let betterPlayers = 0;
    for (let i = 1; i < playerAttempts; i++) {
        betterPlayers += stats.distribution?.[String(i)] || 0;
    }

    return {
        isTopScore: betterPlayers === 0,
        percentile: Math.round((worsePlayers / stats.total) * 100),
    };
}
