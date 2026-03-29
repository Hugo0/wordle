/**
 * PWA Plugin (client-only)
 *
 * Triggers the @khmyznikov/pwa-install component's install dialog
 * when the user is idle for 20 seconds on a game page.
 *
 * - Idle detection: 20s of no intentional interaction (keydown, pointerdown, touchstart)
 * - Exponential backoff on dismiss: 24h → 48h → 96h → ... capped at 30 days
 * - Excluded from Speed mode (timed — any interruption ruins the experience)
 * - Once per session
 * - Listens for library's own dismiss/install events for accurate tracking
 * - Captures beforeinstallprompt, bridges to component via externalPromptEvent
 */

import '@khmyznikov/pwa-install';

import type { BeforeInstallPromptEvent, PWAStatus } from '~/utils/types';
import { readLocal, writeLocal, removeLocal, isStandalone } from '~/utils/storage';

const IDLE_TIMEOUT_MS = 20_000;
const BASE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function isIOS(): boolean {
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))
    );
}

function getCooldownMs(dismissCount: number): number {
    if (dismissCount <= 0) return 0;
    return Math.min(BASE_COOLDOWN_MS * Math.pow(2, dismissCount - 1), MAX_COOLDOWN_MS);
}

function readDismissCount(): number {
    return parseInt(readLocal('pwa_install_dismiss_count') || '0', 10);
}

function isDismissed(): boolean {
    const dismissedAt = readLocal('pwa_install_dismissed_at');
    const count = readDismissCount();
    if (!dismissedAt || count <= 0) return false;
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    return elapsed < getCooldownMs(count);
}

/** Pass our captured beforeinstallprompt to the library component */
function bridgePromptToComponent(
    component: HTMLElement,
    prompt: BeforeInstallPromptEvent | null
): void {
    if (prompt) {
        (component as any).externalPromptEvent = prompt;
    }
}

export default defineNuxtPlugin(() => {
    let deferredPrompt: BeforeInstallPromptEvent | null = null;
    let dismissed = isDismissed();
    let promptedThisSession = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    // Cache standalone check — can't change within a session
    const standalone = isStandalone();

    const analytics = useAnalytics();
    const gameStore = useGameStore();

    const getComponent = () =>
        document.querySelector('pwa-install') as
            | (HTMLElement & {
                  showDialog: (force?: boolean) => void;
                  isInstallAvailable?: boolean;
                  isAppleMobilePlatform?: boolean;
                  isAppleDesktopPlatform?: boolean;
              })
            | null;

    function showInstallDialog(): void {
        if (promptedThisSession || dismissed || standalone) return;
        if (!deferredPrompt && !isIOS()) return;

        const component = getComponent();
        if (!component) return;

        bridgePromptToComponent(component, deferredPrompt);
        promptedThisSession = true;
        stopIdleDetection();
        component.showDialog(true);

        try {
            analytics.trackPWAPromptShown('auto', {
                game_over: gameStore.gameOver,
                game_won: gameStore.gameWon,
                active_row: gameStore.activeRow,
                game_mode: gameStore.gameConfig.mode,
            });
        } catch {}
    }

    function install(): void {
        const component = getComponent();
        if (component) {
            bridgePromptToComponent(component, deferredPrompt);
            component.showDialog(true);
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choice) => {
                try {
                    if (choice.outcome === 'accepted') {
                        analytics.trackPWAInstall({ source: 'settings' });
                    } else {
                        analytics.trackPWADismiss();
                    }
                } catch {}
                deferredPrompt = null;
            });
        }
    }

    function dismiss(): void {
        dismissed = true;
        const newCount = readDismissCount() + 1;
        writeLocal('pwa_install_dismiss_count', String(newCount));
        writeLocal('pwa_install_dismissed_at', Date.now().toString());
        try {
            analytics.trackPWADismiss();
        } catch {}
    }

    function resetDismissed(): void {
        dismissed = false;
        promptedThisSession = false;
        removeLocal('pwa_install_dismissed_at');
        removeLocal('pwa_install_dismiss_count');
    }

    function status(): PWAStatus {
        const component = getComponent();
        return {
            hasPrompt: !!deferredPrompt,
            dismissed,
            isStandalone: standalone,
            isIOS: isIOS(),
            hasComponent: !!component,
            componentReady: !!component,
            isInstallAvailable: component?.isInstallAvailable ?? false,
            isAppleMobile: component?.isAppleMobilePlatform ?? false,
            isAppleDesktop: component?.isAppleDesktopPlatform ?? false,
            dismissCount: readDismissCount(),
        };
    }

    // --- Idle detection ---

    const IDLE_EVENTS = ['keydown', 'pointerdown', 'touchstart', 'scroll'];

    function resetIdleTimer(): void {
        if (idleTimer) clearTimeout(idleTimer);
        if (promptedThisSession || dismissed) return;
        if (gameStore.gameConfig.mode === 'speed') return;
        idleTimer = setTimeout(() => showInstallDialog(), IDLE_TIMEOUT_MS);
    }

    function startIdleDetection(): void {
        // Don't attach listeners if we'll never show the dialog
        if (promptedThisSession || dismissed || standalone) return;

        for (const event of IDLE_EVENTS) {
            window.addEventListener(event, resetIdleTimer, { passive: true });
        }
        resetIdleTimer();
    }

    function stopIdleDetection(): void {
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        for (const event of IDLE_EVENTS) {
            window.removeEventListener(event, resetIdleTimer);
        }
    }

    // --- Event listeners ---

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        stopIdleDetection();
        try {
            analytics.trackPWAInstall({ source: 'appinstalled' });
        } catch {}
    });

    // Library component events — track installs/dismisses from the library's own UI
    window.addEventListener('pwa-user-choice-result-event', ((e: CustomEvent) => {
        try {
            if (e.detail === 'accepted') {
                analytics.trackPWAInstall({ source: 'dialog' });
            } else {
                dismiss();
            }
        } catch {}
    }) as EventListener);

    // pwa-install-success-event also fires on install — only clean up state,
    // skip analytics (already tracked by user-choice-result above)
    window.addEventListener('pwa-install-success-event', () => {
        deferredPrompt = null;
        stopIdleDetection();
    });

    window.addEventListener('pwa-install-how-to-event', () => {
        try {
            analytics.trackPWAPromptShown('auto', { how_to: true });
        } catch {}
    });

    // --- Start idle detection once game page is active ---

    watch(
        () => gameStore.gameConfig.mode,
        (mode) => {
            stopIdleDetection();
            if (mode && mode !== 'speed') {
                startIdleDetection();
            }
        },
        { immediate: true }
    );

    watch(
        () => gameStore.showStatsModal,
        (showing, wasShowing) => {
            if (wasShowing && !showing && gameStore.gameOver) {
                resetIdleTimer();
            }
        }
    );

    return {
        provide: {
            pwaInstall: {
                install,
                dismiss,
                isIOS,
                isStandalone: () => standalone,
                status,
                resetDismissed,
            },
        },
    };
});
