/**
 * PWA Plugin (client-only)
 *
 * Handles PWA install prompts using @khmyznikov/pwa-install web component.
 *
 * Platform-specific behavior:
 * - Android: show install banner after every game win (best PWA support)
 * - Desktop & iOS: show only after user's 2nd completed game, 2-day cooldown if dismissed
 *
 * - Captures beforeinstallprompt event
 * - Manages install/dismiss with platform-aware cooldown
 * - Detects standalone mode and iOS
 * - Shows install banner only after a game win (integrates with game store)
 */

import '@khmyznikov/pwa-install';

import type { BeforeInstallPromptEvent, PWAStatus } from '~/utils/types';
import { isStandalone } from '~/utils/storage';

// Android gets aggressive prompting (PWA works great there).
// Desktop & iOS get conservative prompting (PWA experience is weaker).
const ANDROID_DISMISS_DURATION_MS = 0; // No cooldown — show every session
const DEFAULT_DISMISS_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const MIN_GAMES_BEFORE_PROMPT = 2; // Desktop/iOS: wait until 2nd game

function isIOS(): boolean {
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))
    );
}

function isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
}

function getDismissCooldown(): number {
    return isAndroid() ? ANDROID_DISMISS_DURATION_MS : DEFAULT_DISMISS_DURATION_MS;
}

function isDismissed(): boolean {
    try {
        const dismissedAt = localStorage.getItem('pwa_install_dismissed_at');
        if (!dismissedAt) return false;
        const cooldown = getDismissCooldown();
        if (cooldown === 0) return false; // Android: never stays dismissed across sessions
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        return elapsed < cooldown;
    } catch {
        return false;
    }
}

function getTotalGamesPlayed(): number {
    try {
        const stored = localStorage.getItem('game_results');
        if (!stored) return 0;
        const results = JSON.parse(stored) as Record<string, unknown[]>;
        let total = 0;
        for (const games of Object.values(results)) {
            if (Array.isArray(games)) total += games.length;
        }
        return total;
    } catch {
        return 0;
    }
}

function shouldPrompt(): boolean {
    if (isAndroid()) return true; // Android: always eligible
    return getTotalGamesPlayed() >= MIN_GAMES_BEFORE_PROMPT;
}

export default defineNuxtPlugin(() => {
    let deferredPrompt: BeforeInstallPromptEvent | null = null;
    let dismissed = isDismissed();

    // --- Internal helpers ---

    const getComponent = () =>
        document.querySelector('pwa-install') as
            | (HTMLElement & {
                  showDialog: (force?: boolean) => void;
                  isInstallAvailable?: boolean;
                  isAppleMobilePlatform?: boolean;
                  isAppleDesktopPlatform?: boolean;
              })
            | null;

    const getBanner = (): HTMLElement | null => document.getElementById('pwa-install-banner');

    function hideBanner(): void {
        const banner = getBanner();
        if (banner) banner.style.display = 'none';
    }

    /**
     * Show the install banner.
     * Called after game over — guarded to fire at most once per session.
     * Android: shows after every game win.
     * Desktop/iOS: shows only after 2nd game, respects 2-day dismiss cooldown.
     */
    let bannerShown = false;
    function showBanner(): void {
        if (bannerShown || dismissed || isStandalone()) return;
        if (!shouldPrompt()) return;
        bannerShown = true;
        const banner = getBanner();
        if (banner && (deferredPrompt || isIOS())) {
            banner.style.display = 'flex';
            try {
                useAnalytics().trackPWAPromptShown('banner');
            } catch {}
        }
    }

    /**
     * Trigger PWA install dialog via pwa-install web component.
     * The component uses manual-apple and manual-chrome modes,
     * so it shows platform-appropriate instructions.
     */
    function install(): void {
        const component = getComponent();

        // Use pwa-install component (handles all platforms with proper UI)
        if (component) {
            component.showDialog(true);
            hideBanner();
            return;
        }

        // Fallback: native prompt on Android/Chrome
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choice) => {
                try {
                    const a = useAnalytics();
                    if (choice.outcome === 'accepted') {
                        a.trackPWAInstall({ source: 'banner' });
                    } else {
                        a.trackPWADismiss();
                    }
                } catch {}
                deferredPrompt = null;
                hideBanner();
            });
        }
    }

    function dismiss(): void {
        dismissed = true;
        try {
            localStorage.setItem('pwa_install_dismissed_at', Date.now().toString());
        } catch {
            // localStorage may throw in private browsing mode
        }
        try {
            useAnalytics().trackPWADismiss();
        } catch {}
        hideBanner();
    }

    function resetDismissed(): void {
        dismissed = false;
        try {
            localStorage.removeItem('pwa_install_dismissed_at');
        } catch {
            // localStorage may throw in private browsing mode
        }
    }

    function status(): PWAStatus {
        const component = getComponent();
        return {
            hasPrompt: !!deferredPrompt,
            dismissed,
            isStandalone: isStandalone(),
            isIOS: isIOS(),
            hasComponent: !!component,
            componentReady: !!component,
            isInstallAvailable: component?.isInstallAvailable ?? false,
            isAppleMobile: component?.isAppleMobilePlatform ?? false,
            isAppleDesktop: component?.isAppleDesktopPlatform ?? false,
        };
    }

    // --- Event listeners ---

    // Capture the install prompt (pwa-install component also does this,
    // but we keep a reference for the fallback path)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
        // If game is already over when the prompt arrives, show the banner now
        if (gameStore.gameOver) {
            setTimeout(() => showBanner(), 500);
        }
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hideBanner();
        try {
            useAnalytics().trackPWAInstall({ source: 'appinstalled' });
        } catch {}
    });

    // --- Watch game store for game over to show the banner ---

    const gameStore = useGameStore();
    watch(
        () => gameStore.gameOver,
        (over) => {
            if (over) {
                // Slight delay so the win/loss animation plays first
                setTimeout(() => showBanner(), 2000);
            }
        },
        { immediate: true }
    );

    // --- Provide PWA utilities to the app ---

    return {
        provide: {
            pwaInstall: {
                install,
                dismiss,
                showBanner,
                hideBanner,
                isIOS,
                isStandalone,
                status,
                resetDismissed,
            },
        },
    };
});
