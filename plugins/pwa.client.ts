/**
 * PWA Plugin (client-only)
 *
 * Handles PWA install prompts using @khmyznikov/pwa-install web component.
 * Ported from frontend/src/pwa.ts for the Nuxt migration.
 *
 * - Captures beforeinstallprompt event
 * - Manages install/dismiss with 7-day localStorage cooldown
 * - Detects standalone mode and iOS
 * - Shows install banner only after a game win (integrates with game store)
 */

import '@khmyznikov/pwa-install';

import type { BeforeInstallPromptEvent, PWAStatus } from '~/utils/types';

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

function isDismissed(): boolean {
    try {
        const dismissedAt = localStorage.getItem('pwa_install_dismissed_at');
        if (!dismissedAt) return false;
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        return elapsed < DISMISS_DURATION_MS;
    } catch {
        // localStorage may throw in private browsing mode
        return false;
    }
}

function isIOS(): boolean {
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))
    );
}

function isStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

export default defineNuxtPlugin(() => {
    let deferredPrompt: BeforeInstallPromptEvent | null = null;
    let dismissed = isDismissed();

    // --- Internal helpers ---

    const getComponent = () =>
        document.querySelector('pwa-install') as HTMLElement & {
            showDialog: (force?: boolean) => void;
            isInstallAvailable?: boolean;
            isAppleMobilePlatform?: boolean;
            isAppleDesktopPlatform?: boolean;
        } | null;

    const getBanner = (): HTMLElement | null =>
        document.getElementById('pwa-install-banner');

    function hideBanner(): void {
        const banner = getBanner();
        if (banner) banner.style.display = 'none';
    }

    /**
     * Show the install banner.
     * Should only be called after a game win — the game store
     * watches gameWon and calls this when appropriate.
     */
    function showBanner(): void {
        if (dismissed || isStandalone()) return;
        const banner = getBanner();
        if (banner && (deferredPrompt || isIOS())) {
            banner.style.display = 'flex';
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
                if (choice.outcome === 'accepted') {
                    // Analytics tracking could go here
                }
                deferredPrompt = null;
                hideBanner();
            });
        }
    }

    function dismiss(): void {
        dismissed = true;
        try {
            localStorage.setItem(
                'pwa_install_dismissed_at',
                Date.now().toString(),
            );
        } catch {
            // localStorage may throw in private browsing mode
        }
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
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hideBanner();
    });

    // --- Watch game store for wins to show the banner ---

    // Use a nextTick + watch so the game store is available
    const gameStore = useGameStore();
    watch(
        () => gameStore.gameWon,
        (won) => {
            if (won) {
                // Slight delay so the win animation plays first
                setTimeout(() => showBanner(), 2000);
            }
        },
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
