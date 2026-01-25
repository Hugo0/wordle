/**
 * PWA Module - Progressive Web App support
 * Uses @khmyznikov/pwa-install for cross-platform install dialogs
 * Handles service worker registration and install prompts
 */

// Import the pwa-install web component (registers <pwa-install> element)
import '@khmyznikov/pwa-install';

import type { BeforeInstallPromptEvent, PWAStatus } from './types';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let dismissed = localStorage.getItem('pwa_install_dismissed') === 'true';

export const isIOS = (): boolean =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));

export const isStandalone = (): boolean =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Get the pwa-install component
const getComponent = () => document.querySelector('pwa-install');

const getBanner = (): HTMLElement | null => document.getElementById('pwa-install-banner');

export const hideBanner = (): void => {
    const banner = getBanner();
    if (banner) banner.style.display = 'none';
};

export const showBanner = (): void => {
    if (dismissed || isStandalone()) return;
    const banner = getBanner();
    if (banner && (deferredPrompt || isIOS())) {
        banner.style.display = 'flex';
    }
};

/**
 * Trigger PWA install dialog
 * Uses @khmyznikov/pwa-install component which handles:
 * - Native Chrome/Edge install prompt
 * - iOS "Add to Home Screen" instructions with screenshots
 * - Android fallback instructions
 * - macOS dock instructions
 */
export const install = (): void => {
    const component = getComponent();

    // Use pwa-install component (handles all platforms with proper UI)
    if (component) {
        component.showDialog(true);
        hideBanner();
        return;
    }

    // Fallback: Native prompt on Android/Chrome (shouldn't reach here normally)
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
            console.log('PWA install:', choice.outcome);
            deferredPrompt = null;
            hideBanner();
        });
    }
};

export const dismiss = (): void => {
    dismissed = true;
    localStorage.setItem('pwa_install_dismissed', 'true');
    hideBanner();
};

export const resetDismissed = (): void => {
    dismissed = false;
    localStorage.removeItem('pwa_install_dismissed');
};

export const status = (): PWAStatus => {
    const component = getComponent();
    return {
        hasPrompt: !!deferredPrompt,
        dismissed,
        isStandalone: isStandalone(),
        isIOS: isIOS(),
        hasComponent: !!component,
        // Additional info from pwa-install component
        componentReady: !!component,
        isInstallAvailable: component?.isInstallAvailable ?? false,
        isAppleMobile: component?.isAppleMobilePlatform ?? false,
        isAppleDesktop: component?.isAppleDesktopPlatform ?? false,
    };
};

// Register service worker
export const registerServiceWorker = (): void => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/static/sw.js')
                .then((reg) => console.log('SW registered:', reg.scope))
                .catch((err) => console.log('SW failed:', err));
        });
    }
};

// Set up event listeners
export const init = (): void => {
    registerServiceWorker();

    // Capture install prompt (pwa-install component also does this, but we keep a reference)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA installed');
        deferredPrompt = null;
        hideBanner();
    });
};

// Default export for convenience
const pwa = {
    init,
    install,
    dismiss,
    showBanner,
    hideBanner,
    isIOS,
    isStandalone,
    status,
    resetDismissed,
};

export default pwa;
