/**
 * useGameLifecycle — shared game result handling for all modes.
 *
 * Centralizes:
 *   - Saving results to localStorage (stats store)
 *   - Syncing results to the server (logged-in users)
 *   - Recalculating stats after save
 *   - Duplicate-save guards (won't re-save on state restore)
 *
 * Architecture note: tile-based modes (classic, dordle, quordle, etc.)
 * signal game-over via `game.gameOver` in the Pinia store, and useSync.ts
 * watches that flag for server sync. Non-tile modes (Semantic Explorer)
 * have their own state machine and must call handleGameOver() directly.
 * This composable is the single source of truth for result persistence
 * regardless of which state machine triggers it.
 */
import { buildStatsKey } from '~/utils/game-modes';
import type { GameConfig } from '~/utils/game-modes';

interface GameOverEvent {
    won: boolean;
    attempts: number;
    /** True if this game-over was restored from localStorage (not live) */
    isRestore: boolean;
}

/**
 * Call this when a non-tile game mode ends (win or loss).
 * Handles localStorage save, server sync, and stats recalculation.
 * No-ops on restore to prevent duplicate saves.
 */
export function useGameLifecycle() {
    const stats = useStatsStore();
    const { loggedIn } = useAuth();

    function handleGameOver(config: GameConfig, event: GameOverEvent) {
        if (event.isRestore) return;

        const statsKey = buildStatsKey(config);

        // Save to localStorage
        try {
            stats.saveResult(statsKey, event.won, event.attempts);
            stats.calculateStats(statsKey, config.maxGuesses);
        } catch (e) {
            console.warn('[game-lifecycle] stats save failed', e);
        }

        // Sync to server
        if (loggedIn.value) {
            const dayIdx = config.playType === 'daily' ? config.dayIndex : undefined;
            $fetch('/api/user/game-result', {
                method: 'POST',
                body: {
                    statsKey,
                    won: event.won,
                    attempts: event.attempts,
                    dayIdx,
                    game_mode: config.mode,
                    play_type: config.playType,
                },
            }).catch(() => {
                /* non-fatal — will sync on next full sync */
            });
        }
    }

    /** Load and calculate stats for a mode on page mount. */
    function initStats(langCode: string, config: GameConfig) {
        try {
            stats.loadGameResults(langCode);
            stats.calculateStats(buildStatsKey(config), config.maxGuesses);
            stats.calculateTotalStats();
        } catch {
            /* non-fatal */
        }
    }

    return { handleGameOver, initStats };
}
