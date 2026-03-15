/**
 * Embed Composable
 *
 * Detects when the game is loaded inside an iframe and shows a
 * promotional banner for wordle.global. SSR-safe.
 */

const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function useEmbed() {
    const isEmbedded = computed(() => {
        if (!import.meta.client) return false;
        try {
            return window.top !== window.self;
        } catch {
            return true;
        }
    });

    const showBanner = ref(false);

    function checkBanner() {
        if (!import.meta.client || !isEmbedded.value) return;
        try {
            const dismissedAt = localStorage.getItem('embed_banner_dismissed_at');
            if (dismissedAt) {
                const elapsed = Date.now() - parseInt(dismissedAt, 10);
                if (elapsed < DISMISS_DURATION_MS) return;
            }
        } catch {
            return;
        }
        // Check standalone
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        showBanner.value = true;
    }

    function dismiss() {
        showBanner.value = false;
        if (!import.meta.client) return;
        try {
            localStorage.setItem('embed_banner_dismissed_at', Date.now().toString());
        } catch {
            // localStorage may throw in private browsing
        }
    }

    return { isEmbedded, showBanner, checkBanner, dismiss };
}
