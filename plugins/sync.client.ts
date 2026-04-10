/**
 * Sync Plugin (client-only) — bidirectional sync between localStorage and server.
 *
 * Three phases on login:
 *   1. Push: First-ever login → upload localStorage results to server
 *   2. Pull: Incremental fetch of server results → merge into localStorage
 *   3. Settings: Pull settings from server
 *
 * Performance:
 *   - Pull runs once per session (sessionStorage flag), not every page load
 *   - Incremental: only fetches results newer than last sync (via ?since=)
 *   - Non-blocking: runs after initial render via requestIdleCallback
 *
 * Results ownership: localStorage results are claimed by the first account
 * that syncs them. Logging into a different account won't re-upload old results.
 */
import { readJson, readLocal, writeLocal, writeJson, getOrCreateId } from '~/utils/storage';
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

    watch(
        loggedIn,
        (isLoggedIn) => {
            if (!isLoggedIn || !user.value?.id) return;

            // Only sync once per browser session (tab)
            const sessionFlag = `synced_session_${user.value.id}`;
            if (sessionStorage.getItem(sessionFlag)) return;
            sessionStorage.setItem(sessionFlag, '1');

            // Run sync after initial render, not blocking page load
            scheduleIdle(() => doSync(user.value!.id));
        },
        { immediate: true }
    );
});

async function doSync(userId: string) {
    const settings = useSettingsStore();
    const stats = useStatsStore();
    const claimedBy = readLocal('results_claimed_by');

    // ─── Phase 1: Push (first login only, unclaimed results) ───
    if (!claimedBy) {
        const gameResults = readJson<GameResults>('game_results');
        const speedResults = readJson<SpeedResults>('speed_results');

        if (gameResults || speedResults) {
            const deviceId = getOrCreateId('client_id');
            try {
                await $fetch('/api/user/sync', {
                    method: 'POST',
                    body: {
                        gameResults: gameResults ?? {},
                        speedResults: speedResults ?? {},
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
            } catch {
                // Will retry next session
            }
        }
        writeLocal('results_claimed_by', userId);
    }

    // ─── Phase 2: Pull results (incremental) ───
    try {
        const lastSync = readLocal('last_pull_at');
        const url = lastSync
            ? `/api/user/stats?since=${encodeURIComponent(lastSync)}`
            : '/api/user/stats';

        const { results, settings: serverSettings } = await $fetch(url) as {
            results: ServerResult[];
            settings: Record<string, boolean | string>;
        };

        if (results?.length) {
            const localGameResults = readJson<GameResults>('game_results') ?? {};
            const localSpeedResults = readJson<SpeedResults>('speed_results') ?? {};
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

                    const alreadyExists = r.playType === 'daily'
                        ? existing.some((e) => new Date(e.date as string).toISOString().slice(0, 10) === dateStr)
                        : existing.some((e) => new Date(e.date as string).toISOString() === playedAt.toISOString());

                    if (!alreadyExists && r.won !== null) {
                        existing.push({
                            won: r.won,
                            attempts: r.attempts ?? 0,
                            date: playedAt.toISOString(),
                        });
                    }
                }
            }

            writeJson('game_results', localGameResults);
            writeJson('speed_results', localSpeedResults);
            writeLocal('last_pull_at', latestCreatedAt);

            // Reload stats store so UI reflects merged data
            stats.loadGameResults();
            stats.loadSpeedResults();
            stats.calculateTotalStats();
        } else if (!lastSync) {
            // No results on server either — mark as synced
            writeLocal('last_pull_at', new Date().toISOString());
        }
        // Apply settings from the same response (no extra round-trip)
        if (serverSettings && typeof serverSettings === 'object') {
            const s = serverSettings;
            if (typeof s.darkMode === 'boolean') settings.setDarkMode(s.darkMode);
            if (typeof s.hardMode === 'boolean') settings.setHardMode(s.hardMode);
            if (typeof s.highContrast === 'boolean') settings.setHighContrast(s.highContrast);
            if (typeof s.feedbackEnabled === 'boolean') settings.setFeedbackEnabled(s.feedbackEnabled);
            if (typeof s.wordInfoEnabled === 'boolean') settings.setWordInfoEnabled(s.wordInfoEnabled);
            if (typeof s.animationsEnabled === 'boolean') settings.setAnimationsEnabled(s.animationsEnabled);
            if (typeof s.preferredLanguage === 'string') {
                try { localStorage.setItem('preferred_language', s.preferredLanguage); } catch {}
            }
        }
    } catch {
        // Non-critical — localStorage stats are the fallback
    }
}
