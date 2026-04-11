/**
 * useGameLifecycle — single source of truth for game result persistence.
 *
 * All game modes funnel results through this composable:
 *   - Tile modes (classic, dordle, etc.): useSync watches game.gameOver → calls syncGameResult()
 *   - Semantic: semantic page watches sem.gameOver → calls handleGameOver()
 *   - Speed: useSync watches speedResults count → calls syncSpeedResult()
 *
 * Centralizes:
 *   - Saving results to localStorage (stats store)
 *   - Syncing results to the server (with badge notification + offline queue)
 *   - Recalculating stats after save
 *   - Duplicate-save guards (won't re-save on state restore)
 */
import { buildStatsKey } from '~/utils/game-modes';
import type { GameConfig } from '~/utils/game-modes';

interface GameOverEvent {
    won: boolean;
    attempts: number;
    /** True if this game-over was restored from localStorage (not live) */
    isRestore: boolean;
}

interface SyncOptions {
    /** Device ID for deduplication */
    deviceId?: string;
    /** Callback when sync fails — add to pending queue for offline retry */
    onSyncFail?: (payload: { endpoint: string; body: unknown; addedAt: string }) => void;
    /** Callback when new badges are earned */
    onNewBadges?: (badges: Array<{ slug: string; name: string }>) => void;
}

/**
 * Shared game lifecycle — used by both page-level code (semantic)
 * and the sync plugin (tile modes). Single place for result handling.
 */
export function useGameLifecycle(syncOpts: SyncOptions = {}) {
    const stats = useStatsStore();
    const { loggedIn } = useAuth();

    /**
     * Handle game-over for non-speed modes. Saves to localStorage,
     * syncs to server, recalculates stats. No-ops on restore.
     */
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
        syncGameResult({
            statsKey,
            won: event.won,
            attempts: event.attempts,
            dayIdx: config.playType === 'daily' ? config.dayIndex : undefined,
            game_mode: config.mode,
            play_type: config.playType,
        });
    }

    /**
     * Sync a game result to the server. Handles auth check, badge
     * notifications, and offline queue. Used by both handleGameOver()
     * and useSync's tile-mode watcher.
     */
    function syncGameResult(body: Record<string, unknown>) {
        if (!loggedIn.value) return;

        const requestBody = { ...body, deviceId: syncOpts.deviceId };

        $fetch('/api/user/game-result', {
            method: 'POST',
            body: requestBody,
        })
            .then((res: any) => {
                if (res?.newBadges?.length && syncOpts.onNewBadges) {
                    syncOpts.onNewBadges(res.newBadges);
                }
            })
            .catch(() => {
                if (syncOpts.onSyncFail) {
                    syncOpts.onSyncFail({
                        endpoint: '/api/user/game-result',
                        body: requestBody,
                        addedAt: new Date().toISOString(),
                    });
                }
            });
    }

    /**
     * Sync a speed result to the server. Called by useSync's speed watcher.
     */
    function syncSpeedResult(body: Record<string, unknown>) {
        if (!loggedIn.value) return;
        $fetch('/api/user/speed-result', {
            method: 'POST',
            body: { ...body, deviceId: syncOpts.deviceId },
        }).catch(() => {
            /* speed results don't queue for retry */
        });
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

    return { handleGameOver, syncGameResult, syncSpeedResult, initStats };
}
