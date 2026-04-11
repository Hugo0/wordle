/**
 * Embed Composable
 *
 * Detects when the game is loaded inside an iframe and shows a
 * promotional banner for wordle.global. SSR-safe.
 */
import { readLocal, writeLocal } from '~/utils/storage';

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
        const dismissedAt = readLocal('embed_banner_dismissed_at');
        if (dismissedAt) {
            const elapsed = Date.now() - parseInt(dismissedAt, 10);
            if (elapsed < DISMISS_DURATION_MS) return;
        }
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        showBanner.value = true;
    }

    function dismiss() {
        showBanner.value = false;
        writeLocal('embed_banner_dismissed_at', Date.now().toString());
    }

    return { isEmbedded, showBanner, checkBanner, dismiss };
}
