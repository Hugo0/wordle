/**
 * PWA Module - Progressive Web App support
 * Handles service worker registration, install prompts, and iOS fallbacks
 */

import type { BeforeInstallPromptEvent, PWAStatus } from './types';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let dismissed = localStorage.getItem('pwa_install_dismissed') === 'true';

export const isIOS = (): boolean =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));

export const isStandalone = (): boolean =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

const getComponent = (): (HTMLElement & { showDialog?: (force: boolean) => void }) | null =>
    document.querySelector('pwa-install');

const getBanner = (): HTMLElement | null => document.getElementById('pwa-install-banner');

const getIosModal = (): HTMLElement | null => document.getElementById('ios-install-modal');

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

export const showIosModal = (): void => {
    const modal = getIosModal();
    if (modal) modal.style.display = 'flex';
};

export const closeIosModal = (): void => {
    const modal = getIosModal();
    if (modal) modal.style.display = 'none';
};

export const install = (): void => {
    const component = getComponent();

    // Try pwa-install component first (has nice iOS instructions)
    if (component?.showDialog) {
        component.showDialog(true);
        hideBanner();
        return;
    }

    // Native prompt on Android/Chrome
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
            console.log('PWA install:', choice.outcome);
            deferredPrompt = null;
            hideBanner();
        });
        return;
    }

    // iOS fallback
    if (isIOS()) {
        showIosModal();
        hideBanner();
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

export const status = (): PWAStatus => ({
    hasPrompt: !!deferredPrompt,
    dismissed,
    isStandalone: isStandalone(),
    isIOS: isIOS(),
    hasComponent: !!getComponent(),
});

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

    // Capture install prompt
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
    showIosModal,
    closeIosModal,
    isIOS,
    isStandalone,
    status,
    resetDismissed,
};

export default pwa;
