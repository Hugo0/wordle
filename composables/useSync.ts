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
import { getOrCreateId, readJson, writeJson } from '~/utils/storage';
import { buildStatsKey } from '~/utils/game-modes';

interface PendingSyncItem {
    endpoint: string;
    body: Record<string, unknown>;
    addedAt: string;
}

function getPendingQueue(): PendingSyncItem[] {
    return readJson<PendingSyncItem[]>('pending_sync') ?? [];
}

function addToPendingQueue(item: PendingSyncItem) {
    const queue = getPendingQueue();
    queue.push(item);
    // Cap at 50 items to prevent unbounded growth
    writeJson('pending_sync', queue.slice(-50));
}

function clearPendingQueue() {
    writeJson('pending_sync', []);
}

export function useSync() {
    const { loggedIn } = useUserSession();
    const game = useGameStore();
    const stats = useStatsStore();
    const settings = useSettingsStore();

    const deviceId = import.meta.client ? getOrCreateId('client_id') : 'unknown';

    // Track previous speed result count to detect new entries
    let prevSpeedCount = 0;
    if (import.meta.client) {
        prevSpeedCount = Object.values(stats.speedResults).reduce(
            (sum, arr) => sum + arr.length,
            0
        );
    }

    // -----------------------------------------------------------------
    // 1. Per-game sync: watch gameOver to push individual results
    // -----------------------------------------------------------------

    if (import.meta.client) {
        watch(
            () => game.gameOver,
            (isOver) => {
                if (!isOver || !loggedIn.value) return;
                if (game.gameConfig.mode === 'speed') return; // Speed handled separately

                const statsKey = buildStatsKey(game.gameConfig);
                const lang = useLanguageStore();
                const dayIdx =
                    game.gameConfig.playType === 'daily' ? lang.todaysIdx : undefined;

                const requestBody = {
                    statsKey,
                    won: game.gameWon,
                    attempts: Number(game.attempts) || 0,
                    dayIdx,
                    deviceId,
                };

                $fetch('/api/user/game-result', {
                    method: 'POST',
                    body: requestBody,
                })
                    .then((res) => {
                        if (res?.newBadges?.length) {
                            const { addBadges } = useBadgeNotification();
                            addBadges(res.newBadges);
                        }
                    })
                    .catch(() => {
                        addToPendingQueue({
                            endpoint: '/api/user/game-result',
                            body: requestBody,
                            addedAt: new Date().toISOString(),
                        });
                    });
            }
        );

        // Speed results: watch the stats store's speedResults for new entries
        watch(
            () =>
                Object.values(stats.speedResults).reduce(
                    (sum, arr) => sum + arr.length,
                    0
                ),
            (newCount) => {
                if (!loggedIn.value || newCount <= prevSpeedCount) {
                    prevSpeedCount = newCount;
                    return;
                }
                prevSpeedCount = newCount;

                // Find the most recent speed result across all languages
                let latest: { lang: string; result: (typeof stats.speedResults)[string][number] } | null =
                    null;
                for (const [lang, results] of Object.entries(stats.speedResults)) {
                    if (results.length > 0) {
                        const last = results[results.length - 1]!;
                        if (!latest || last.date > latest.result.date) {
                            latest = { lang, result: last };
                        }
                    }
                }

                if (latest) {
                    $fetch('/api/user/speed-result', {
                        method: 'POST',
                        body: {
                            lang: latest.lang,
                            score: latest.result.score,
                            wordsSolved: latest.result.wordsSolved,
                            wordsFailed: latest.result.wordsFailed,
                            maxCombo: latest.result.maxCombo,
                            totalGuesses: latest.result.totalGuesses,
                            deviceId,
                        },
                    }).catch(() => {});
                }
            }
        );
    }

    // -----------------------------------------------------------------
    // 3. Settings sync (debounced)
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
                            preferredLanguage: localStorage.getItem('preferred_language') || undefined,
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
            for (const item of pending) {
                $fetch(item.endpoint, { method: 'POST', body: item.body }).catch(() => {
                    // Re-queue if still failing
                    addToPendingQueue(item);
                });
            }
        }
    }
}
