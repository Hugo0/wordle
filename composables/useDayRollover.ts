/**
 * Day rollover detection — reloads the page when the daily word changes.
 *
 * Listens for visibilitychange and checks if the server's day index has
 * advanced since the page loaded. If so, forces a full page reload to
 * pick up the new word. Prevents stale game state where a user plays
 * against yesterday's word with today's coloring (or vice versa).
 *
 * Only active on daily game modes — unlimited/speed don't have day indices.
 */
export function useDayRollover(lang: string, loadedDayIdx: number) {
    if (!import.meta.client) return;

    let checking = false;

    async function checkRollover() {
        if (checking) return;
        if (document.visibilityState !== 'visible') return;

        checking = true;
        try {
            const res = await $fetch<{ todays_idx: number }>(`/api/${lang}/data`, {
                query: { minimal: '1' },
                // Bypass Nuxt's useFetch cache
                headers: { 'Cache-Control': 'no-cache' },
            });
            if (res.todays_idx !== loadedDayIdx) {
                // Day rolled over — reload to get the new word
                window.location.reload();
            }
        } catch {
            // Network error — don't reload, user can keep playing
        } finally {
            checking = false;
        }
    }

    document.addEventListener('visibilitychange', checkRollover);

    onUnmounted(() => {
        document.removeEventListener('visibilitychange', checkRollover);
    });
}
