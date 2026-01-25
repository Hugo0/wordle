/**
 * Wordle Global - Main Entry Point
 * Single entry point that handles both homepage and game page
 */
import './style.css';
import pwa from './pwa';
import './debug';
import createGameApp from './game';
import createIndexApp from './index-app';

// Extend Window interface for global functions
declare global {
    interface Window {
        triggerPwaInstall: () => void;
        dismissPwaInstall: () => void;
        closeIosModal: () => void;
        showPwaInstallBanner: () => void;
    }
}

// Initialize PWA (service worker, install prompt listeners)
pwa.init();

// Expose global functions for HTML onclick handlers
window.triggerPwaInstall = pwa.install;
window.dismissPwaInstall = pwa.dismiss;
window.closeIosModal = pwa.closeIosModal;
window.showPwaInstallBanner = pwa.showBanner;

// Detect which page we're on and create appropriate Vue app
const appEl = document.getElementById('app');
const isGamePage = appEl?.hasAttribute('data-page-type')
    ? appEl.getAttribute('data-page-type') === 'game'
    : typeof (window as Window & { word_list?: unknown }).word_list !== 'undefined';

const app = isGamePage ? createGameApp() : createIndexApp();
const vm = app.mount('#app');

// Hide loading skeleton, show app
const skeleton = document.getElementById('loading-skeleton');
if (skeleton) skeleton.style.display = 'none';
if (appEl) appEl.style.display = 'block';

// Expose app and vm for debugging (accessible via window.vm in console)
(window as Window & { vueApp?: typeof app; vm?: typeof vm }).vueApp = app;
(window as Window & { vm?: typeof vm }).vm = vm;
