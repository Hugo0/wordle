/**
 * Embed Module - Shows a banner when the game is loaded inside an iframe
 * Promotes wordle.global to users playing via third-party iframe embeds
 */

import { isStandalone } from './pwa';

const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const isEmbedded = (): boolean => {
    try {
        return window.top !== window.self;
    } catch {
        // Cross-origin iframe throws SecurityError — that means we're embedded
        return true;
    }
};

const isDismissed = (): boolean => {
    try {
        const dismissedAt = localStorage.getItem('embed_banner_dismissed_at');
        if (!dismissedAt) return false;
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        return elapsed < DISMISS_DURATION_MS;
    } catch {
        // localStorage may throw in private browsing mode
        return false;
    }
};

let dismissed = isDismissed();

const getBanner = (): HTMLElement | null => document.getElementById('embed-banner');

export const hideBanner = (): void => {
    const banner = getBanner();
    if (banner) banner.style.display = 'none';
};

export const showBanner = (): void => {
    if (dismissed || !isEmbedded() || isStandalone()) return;
    const banner = getBanner();
    if (banner) {
        banner.style.display = 'flex';
    }
};

export const dismiss = (): void => {
    dismissed = true;
    try {
        localStorage.setItem('embed_banner_dismissed_at', Date.now().toString());
    } catch {
        // localStorage may throw in private browsing mode
    }
    hideBanner();
};

const embed = {
    isEmbedded,
    showBanner,
    hideBanner,
    dismiss,
};

export default embed;
