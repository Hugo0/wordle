/**
 * Sync composable — bridges localStorage stats with the server.
 *
 * Architecture:
 *   - Stores remain pure (localStorage-only, untouched)
 *   - This composable watches reactive store state and syncs as a side effect
 *   - Must be called from component setup context (useGamePage)
 *   - All syncs are fire-and-forget: failures never block gameplay
 *
 * Two responsibilities:
 *   1. Per-game sync: watch gameOver and push individual results
 *   2. Settings sync: watch settings changes (debounced)
 *
 * Initial sync (localStorage upload on first login) is handled by
 * plugins/sync.client.ts so it works on any page, not just game pages.
 */
import { getOrCreateId, readJson, writeJson, STORAGE_KEYS } from '~/utils/storage';
import { buildStatsKey } from '~/utils/game-modes';

interface PendingSyncItem {
    endpoint: string;
    body: Record<string, unknown>;
    addedAt: string;
}

function getPendingQueue(): PendingSyncItem[] {
    return readJson<PendingSyncItem[]>(STORAGE_KEYS.PENDING_SYNC) ?? [];
}

function addToPendingQueue(item: PendingSyncItem) {
    const queue = getPendingQueue();
    queue.push(item);
    // Cap at 50 items to prevent unbounded growth
    writeJson(STORAGE_KEYS.PENDING_SYNC, queue.slice(-50));
}

function clearPendingQueue() {
    writeJson(STORAGE_KEYS.PENDING_SYNC, []);
}

export function useSync() {
    const { loggedIn } = useUserSession();
    const game = useGameStore();
    const stats = useStatsStore();
    const settings = useSettingsStore();

    const deviceId = import.meta.client ? getOrCreateId(STORAGE_KEYS.CLIENT_ID) : 'unknown';

    // Track previous speed result count to detect new entries
    let prevSpeedCount = 0;
    if (import.meta.client) {
        prevSpeedCount = Object.values(stats.speedResults).reduce(
            (sum, arr) => sum + arr.length,
            0
        );
    }

    // -----------------------------------------------------------------
    // Per-game sync via shared lifecycle (DRY: one place for server sync)
    // -----------------------------------------------------------------

    const lifecycle = useGameLifecycle({
        deviceId,
        onSyncFail: (item) => addToPendingQueue(item as PendingSyncItem),
        onNewBadges: (badges) => {
            const { addBadges } = useBadgeNotification();
            addBadges(badges);
        },
    });

    if (import.meta.client) {
        // Tile-based modes: watch game.gameOver
        watch(
            () => game.gameOver,
            (isOver) => {
                if (!isOver || !loggedIn.value) return;
                if (game.gameConfig.mode === 'speed') return;

                const lang = useLanguageStore();
                lifecycle.syncGameResult({
                    statsKey: buildStatsKey(game.gameConfig),
                    won: game.gameWon,
                    attempts: Number(game.attempts) || 0,
                    dayIdx: game.gameConfig.playType === 'daily' ? lang.todaysIdx : undefined,
                });
            }
        );

        // Speed results: watch for new entries
        watch(
            () => Object.values(stats.speedResults).reduce((sum, arr) => sum + arr.length, 0),
            (newCount) => {
                if (!loggedIn.value || newCount <= prevSpeedCount) {
                    prevSpeedCount = newCount;
                    return;
                }
                prevSpeedCount = newCount;

                let latest: {
                    lang: string;
                    result: (typeof stats.speedResults)[string][number];
                } | null = null;
                for (const [lang, results] of Object.entries(stats.speedResults)) {
                    if (results.length > 0) {
                        const last = results[results.length - 1]!;
                        if (!latest || last.date > latest.result.date) {
                            latest = { lang, result: last };
                        }
                    }
                }

                if (latest) {
                    lifecycle.syncSpeedResult({
                        lang: latest.lang,
                        score: latest.result.score,
                        wordsSolved: latest.result.wordsSolved,
                        wordsFailed: latest.result.wordsFailed,
                        maxCombo: latest.result.maxCombo,
                        totalGuesses: latest.result.totalGuesses,
                    });
                }
            }
        );
    }

    // -----------------------------------------------------------------
    // Settings sync (debounced)
    // -----------------------------------------------------------------

    if (import.meta.client) {
        let settingsTimer: ReturnType<typeof setTimeout> | null = null;
        let settingsInitialized = false;

        watch(
            [
                () => settings.darkMode,
                () => settings.hardMode,
                () => settings.highContrast,
                () => settings.feedbackEnabled,
                () => settings.wordInfoEnabled,
                () => settings.animationsEnabled,
            ],
            () => {
                // Skip the first emission (hydration from localStorage)
                if (!settingsInitialized) {
                    settingsInitialized = true;
                    return;
                }
                if (!loggedIn.value) return;
                if (settingsTimer) clearTimeout(settingsTimer);
                settingsTimer = setTimeout(() => {
                    $fetch('/api/user/settings', {
                        method: 'PUT',
                        body: {
                            darkMode: settings.darkMode,
                            hardMode: settings.hardMode,
                            highContrast: settings.highContrast,
                            feedbackEnabled: settings.feedbackEnabled,
                            wordInfoEnabled: settings.wordInfoEnabled,
                            animationsEnabled: settings.animationsEnabled,
                            preferredLanguage:
                                localStorage.getItem(STORAGE_KEYS.PREFERRED_LANGUAGE) || undefined,
                        },
                    }).catch(() => {});
                }, 1000);
            }
        );
    }

    // -----------------------------------------------------------------
    // 4. Retry pending sync queue (from previous failed syncs)
    // -----------------------------------------------------------------

    if (import.meta.client && loggedIn.value) {
        const pending = getPendingQueue();
        if (pending.length > 0) {
            clearPendingQueue();
            const maxAge = 24 * 60 * 60 * 1000; // Drop items older than 24h
            for (const item of pending) {
                if (Date.now() - new Date(item.addedAt).getTime() > maxAge) continue;
                $fetch(item.endpoint, { method: 'POST', body: item.body }).catch((err: any) => {
                    // Only re-queue on network errors, not 4xx (permanent failures)
                    if (err?.response?.status && err.response.status < 500) return;
                    addToPendingQueue(item);
                });
            }
        }
    }
}
