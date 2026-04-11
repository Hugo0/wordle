/**
 * Sync Plugin (client-only) — bidirectional sync between localStorage and server.
 *
 * Architecture (Pattern B):
 *   - Server is source of truth for authenticated users
 *   - localStorage is a user-scoped cache (`game_results:{userId}`)
 *   - Anonymous users use unscoped keys (`game_results`)
 *
 * Storage migration:
 *   On first load after deploy, `runStorageMigration()` upgrades from
 *   v1 (unscoped) to v2 (user-scoped) keys. Idempotent, runs once.
 *
 * Sync triggers:
 *   1. Login → push unclaimed anonymous results, then pull from server
 *   2. Session start → pull delta (once per tab, via sessionStorage flag)
 *   3. visibilitychange → pull delta if stale (>5min since last pull)
 *   4. Per-game results are pushed by composables/useSync.ts
 *
 * Results are never deleted — each user's data lives in its own
 * namespaced bucket, so user switching is safe by construction.
 */
import {
    readJson,
    readLocal,
    writeLocal,
    writeJson,
    getOrCreateId,
    setActiveUserId,
    scopedKey,
    runStorageMigration,
    STORAGE_KEYS,
} from '~/utils/storage';
import type { GameResults, SpeedResults } from '~/utils/types';

interface ServerResult {
    lang: string;
    mode: string;
    playType: string;
    dayIdx: number | null;
    won: boolean | null;
    attempts: number | null;
    score: number | null;
    wordsSolved: number | null;
    wordsFailed: number | null;
    maxCombo: number | null;
    totalGuesses: number | null;
    playedAt: string;
    createdAt: string;
}

/** How stale the cache can be before visibilitychange triggers a pull (ms) */
const PULL_STALENESS_MS = 5 * 60 * 1000;

function serverResultToStatsKey(r: ServerResult): string {
    if (r.mode === 'classic' && r.playType === 'daily') return r.lang;
    if (r.mode === 'classic' && r.playType === 'unlimited') return `${r.lang}_unlimited`;
    if (r.mode === 'unlimited') return `${r.lang}_unlimited`;
    if (r.playType === 'daily') return `${r.lang}_${r.mode}_daily`;
    return `${r.lang}_${r.mode}`;
}

function scheduleIdle(fn: () => void) {
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(fn, { timeout: 5000 });
    } else {
        setTimeout(fn, 100);
    }
}

export default defineNuxtPlugin(() => {
    const { loggedIn, user } = useUserSession();

    // Run storage migration on every page load (idempotent, checks version flag)
    runStorageMigration();

    watch(
        loggedIn,
        (isLoggedIn) => {
            if (!isLoggedIn || !user.value?.id) {
                // Logged out — switch to anonymous storage
                setActiveUserId(null);
                reloadStores();
                return;
            }

            const userId = user.value.id;

            // Set the active user so all scopedKey() calls resolve correctly
            setActiveUserId(userId);

            // Reload stores from the user's namespaced keys
            reloadStores();

            // Only run full sync once per browser session (tab)
            const sessionFlag = `synced_session_${userId}`;
            if (sessionStorage.getItem(sessionFlag)) return;
            sessionStorage.setItem(sessionFlag, '1');

            // Run sync after initial render, not blocking page load
            scheduleIdle(() => doSync(userId));
        },
        { immediate: true }
    );

    // Pull delta when tab becomes visible and cache is stale
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        if (!loggedIn.value || !user.value?.id) return;

        const lastPull = readLocal(scopedKey(STORAGE_KEYS.LAST_PULL_AT));
        if (!lastPull) return; // Never synced — will be handled by doSync on next login

        const elapsed = Date.now() - new Date(lastPull).getTime();
        if (elapsed > PULL_STALENESS_MS) {
            pullResults(user.value.id);
        }
    });
});

/** Reload Pinia stores from localStorage (reads from current scopedKey) */
function reloadStores() {
    const stats = useStatsStore();
    stats.loadGameResults();
    stats.loadSpeedResults();
    stats.calculateTotalStats();
}

async function doSync(userId: string) {
    const settings = useSettingsStore();

    // ─── Phase 1: Push anonymous results (first-ever login on this browser) ───
    // If there's unclaimed data in the anonymous keys, push it to the server
    // and move it to the user's namespaced bucket.
    const anonGameResults = readJson<GameResults>(STORAGE_KEYS.GAME_RESULTS);
    const anonSpeedResults = readJson<SpeedResults>(STORAGE_KEYS.SPEED_RESULTS);
    const hasAnonData =
        (anonGameResults && Object.keys(anonGameResults).length > 0) ||
        (anonSpeedResults && Object.keys(anonSpeedResults).length > 0);

    if (hasAnonData) {
        const deviceId = getOrCreateId(STORAGE_KEYS.CLIENT_ID);
        try {
            await $fetch('/api/user/sync', {
                method: 'POST',
                body: {
                    gameResults: anonGameResults ?? {},
                    speedResults: anonSpeedResults ?? {},
                    settings: {
                        darkMode: settings.darkMode,
                        hardMode: settings.hardMode,
                        highContrast: settings.highContrast,
                        feedbackEnabled: settings.feedbackEnabled,
                        wordInfoEnabled: settings.wordInfoEnabled,
                        animationsEnabled: settings.animationsEnabled,
                    },
                    deviceId,
                },
            });

            // Move anonymous data to user's bucket, then clear anonymous keys
            const userGameKey = scopedKey(STORAGE_KEYS.GAME_RESULTS);
            const userSpeedKey = scopedKey(STORAGE_KEYS.SPEED_RESULTS);
            const existingUserGame = readJson<GameResults>(userGameKey) ?? {};
            const existingUserSpeed = readJson<SpeedResults>(userSpeedKey) ?? {};

            // Merge anonymous into user bucket (user bucket wins on conflict)
            if (anonGameResults) {
                for (const [key, results] of Object.entries(anonGameResults)) {
                    if (!existingUserGame[key]) existingUserGame[key] = [];
                    for (const r of results) {
                        const dateStr = new Date(r.date as string).toISOString();
                        if (
                            !existingUserGame[key].some(
                                (e) => new Date(e.date as string).toISOString() === dateStr
                            )
                        ) {
                            existingUserGame[key].push(r);
                        }
                    }
                }
                writeJson(userGameKey, existingUserGame);
            }
            if (anonSpeedResults) {
                for (const [key, results] of Object.entries(anonSpeedResults)) {
                    if (!existingUserSpeed[key]) existingUserSpeed[key] = [];
                    for (const r of results) {
                        if (!existingUserSpeed[key].some((e) => e.date === r.date)) {
                            existingUserSpeed[key].push(r);
                        }
                    }
                }
                writeJson(userSpeedKey, existingUserSpeed);
            }

            // Clear anonymous keys
            writeJson(STORAGE_KEYS.GAME_RESULTS, {});
            writeJson(STORAGE_KEYS.SPEED_RESULTS, {});

            // Reload stores from the now-populated user bucket
            reloadStores();
        } catch {
            // Will retry next session
        }
    }

    // ─── Phase 2: Pull results from server (incremental) ───
    await pullResults(userId);
}

async function pullResults(userId: string) {
    const settings = useSettingsStore();

    try {
        const lastSync = readLocal(scopedKey(STORAGE_KEYS.LAST_PULL_AT));
        const url = lastSync
            ? `/api/user/stats?since=${encodeURIComponent(lastSync)}`
            : '/api/user/stats';

        const { results, settings: serverSettings } = (await $fetch(url)) as {
            results: ServerResult[];
            settings: Record<string, boolean | string>;
        };

        if (results?.length) {
            const gameKey = scopedKey(STORAGE_KEYS.GAME_RESULTS);
            const speedKey = scopedKey(STORAGE_KEYS.SPEED_RESULTS);
            const localGameResults = readJson<GameResults>(gameKey) ?? {};
            const localSpeedResults = readJson<SpeedResults>(speedKey) ?? {};
            let latestCreatedAt = lastSync || '';

            for (const r of results) {
                // Track newest createdAt for next incremental sync
                if (r.createdAt > latestCreatedAt) latestCreatedAt = r.createdAt;

                if (r.mode === 'speed') {
                    if (!localSpeedResults[r.lang]) localSpeedResults[r.lang] = [];
                    const existing = localSpeedResults[r.lang];
                    const playedAt = new Date(r.playedAt).toISOString();
                    if (!existing.some((e) => e.date === playedAt)) {
                        existing.push({
                            date: playedAt,
                            score: r.score ?? 0,
                            wordsSolved: r.wordsSolved ?? 0,
                            wordsFailed: r.wordsFailed ?? 0,
                            maxCombo: r.maxCombo ?? 0,
                            totalGuesses: r.totalGuesses ?? 0,
                        });
                    }
                } else {
                    const statsKey = serverResultToStatsKey(r);
                    if (!localGameResults[statsKey]) localGameResults[statsKey] = [];
                    const existing = localGameResults[statsKey];
                    const playedAt = new Date(r.playedAt);
                    const dateStr = playedAt.toISOString().slice(0, 10);

                    const alreadyExists =
                        r.playType === 'daily'
                            ? existing.some(
                                  (e) =>
                                      new Date(e.date as string).toISOString().slice(0, 10) ===
                                      dateStr
                              )
                            : existing.some(
                                  (e) =>
                                      new Date(e.date as string).toISOString() ===
                                      playedAt.toISOString()
                              );

                    if (!alreadyExists && r.won !== null) {
                        existing.push({
                            won: r.won,
                            attempts: r.attempts ?? 0,
                            date: playedAt.toISOString(),
                        });
                    }
                }
            }

            writeJson(gameKey, localGameResults);
            writeJson(speedKey, localSpeedResults);
            writeLocal(scopedKey(STORAGE_KEYS.LAST_PULL_AT), latestCreatedAt);

            // Reload stats store so UI reflects merged data
            reloadStores();
        } else if (!lastSync) {
            // No results on server either — mark as synced
            writeLocal(scopedKey(STORAGE_KEYS.LAST_PULL_AT), new Date().toISOString());
        }

        // Apply settings from the same response (no extra round-trip)
        if (serverSettings && typeof serverSettings === 'object') {
            const s = serverSettings;
            if (typeof s.darkMode === 'boolean') settings.setDarkMode(s.darkMode);
            if (typeof s.hardMode === 'boolean') settings.setHardMode(s.hardMode);
            if (typeof s.highContrast === 'boolean') settings.setHighContrast(s.highContrast);
            if (typeof s.feedbackEnabled === 'boolean')
                settings.setFeedbackEnabled(s.feedbackEnabled);
            if (typeof s.wordInfoEnabled === 'boolean')
                settings.setWordInfoEnabled(s.wordInfoEnabled);
            if (typeof s.animationsEnabled === 'boolean')
                settings.setAnimationsEnabled(s.animationsEnabled);
            if (typeof s.preferredLanguage === 'string') {
                try {
                    localStorage.setItem(STORAGE_KEYS.PREFERRED_LANGUAGE, s.preferredLanguage);
                } catch {}
            }
        }
    } catch {
        // Non-critical — localStorage stats are the fallback
    }
}
