/**
 * Sync Plugin (client-only)
 *
 * Two responsibilities:
 *   1. First login: upload all localStorage to server
 *   2. Returning login: pull settings from server (new device support)
 *
 * Runs on every page so sync happens regardless of where OAuth completes.
 */
import { readJson, readLocal, writeLocal, getOrCreateId } from '~/utils/storage';
import type { GameResults, SpeedResults } from '~/utils/types';

export default defineNuxtPlugin(() => {
    const { loggedIn } = useUserSession();

    watch(
        loggedIn,
        async (isLoggedIn) => {
            if (!isLoggedIn) return;

            const settings = useSettingsStore();

            if (!readLocal('synced_at')) {
                // First login: push localStorage to server
                const gameResults = readJson<GameResults>('game_results');
                const speedResults = readJson<SpeedResults>('speed_results');
                if (!gameResults && !speedResults) {
                    writeLocal('synced_at', new Date().toISOString());
                    return;
                }

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
                    writeLocal('synced_at', new Date().toISOString());
                } catch {
                    // Will retry on next page load
                }
            } else {
                // Returning login: pull settings from server
                try {
                    const { settings: serverSettings } = await $fetch('/api/user/settings');
                    if (serverSettings && typeof serverSettings === 'object') {
                        const s = serverSettings as Record<string, boolean>;
                        if (typeof s.darkMode === 'boolean') settings.setDarkMode(s.darkMode);
                        if (typeof s.hardMode === 'boolean') settings.setHardMode(s.hardMode);
                        if (typeof s.highContrast === 'boolean') settings.setHighContrast(s.highContrast);
                        if (typeof s.feedbackEnabled === 'boolean') settings.setFeedbackEnabled(s.feedbackEnabled);
                        if (typeof s.wordInfoEnabled === 'boolean') settings.setWordInfoEnabled(s.wordInfoEnabled);
                        if (typeof s.animationsEnabled === 'boolean') settings.setAnimationsEnabled(s.animationsEnabled);
                    }
                } catch {
                    // Non-critical — keep localStorage values
                }
            }
        },
        { immediate: true }
    );
});
