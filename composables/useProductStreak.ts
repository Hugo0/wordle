/**
 * useProductStreak — single source of truth for the product-wide daily streak.
 *
 * Works on any page (game or non-game). Reads from the stats store which
 * is backed by localStorage. The sync plugin merges server data into
 * localStorage on login, so this reflects cross-device state once synced.
 *
 * Usage: const { streak, bestStreak } = useProductStreak();
 */

export function useProductStreak() {
    // Streak depends on localStorage — only meaningful on client.
    // Returns 0 during SSR to avoid hydration issues.
    const streak = ref(0);
    const bestStreak = ref(0);

    if (import.meta.client) {
        const statsStore = useStatsStore();

        onMounted(() => {
            statsStore.loadGameResults();
            streak.value = statsStore.totalStats.current_overall_streak;
            bestStreak.value = statsStore.totalStats.longest_overall_streak;
        });

        // Keep reactive after mount
        watch(() => statsStore.totalStats.current_overall_streak, (v) => { streak.value = v; });
        watch(() => statsStore.totalStats.longest_overall_streak, (v) => { bestStreak.value = v; });
    }

    return { streak, bestStreak };
}
