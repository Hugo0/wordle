/**
 * Debug Console - access via window.debug in browser console
 * Useful for testing PWA install flows without needing real devices
 */
import pwa from './pwa';

const getComponent = () => document.querySelector('pwa-install');

const debug = {
    pwa: {
        /**
         * Show current PWA status
         * Includes component state, platform detection, and install availability
         */
        status: () => {
            const status = pwa.status();
            console.table(status);
            return status;
        },

        /**
         * Trigger the PWA install dialog
         * On iOS: Shows "Add to Home Screen" instructions with screenshots
         * On Android/Chrome: Shows native install prompt
         * On other browsers: Shows manual instructions
         */
        install: pwa.install,

        /**
         * Force show the install dialog (even if already dismissed)
         * Useful for testing the dialog appearance
         */
        forceDialog: () => {
            const component = getComponent();
            if (component) {
                component.showDialog(true);
                console.log('Dialog forced open');
            } else {
                console.error('pwa-install component not found');
            }
        },

        /**
         * Hide the install dialog
         */
        hideDialog: () => {
            const component = getComponent();
            if (component) {
                component.hideDialog();
                console.log('Dialog hidden');
            }
        },

        /**
         * Show the simple install banner (top of screen)
         */
        showBanner: pwa.showBanner,

        /**
         * Hide the install banner
         */
        hideBanner: pwa.hideBanner,

        /**
         * Reset the "dismissed" state so prompts show again
         */
        reset: () => {
            pwa.resetDismissed();
            console.log('PWA dismiss state reset. Refresh to see install prompts again.');
        },

        /**
         * Get raw component reference for advanced debugging
         */
        component: () => {
            const component = getComponent();
            if (component) {
                console.log('pwa-install component:', component);
                console.log('Properties:', {
                    isInstallAvailable: component.isInstallAvailable,
                    isAppleMobilePlatform: component.isAppleMobilePlatform,
                    isAppleDesktopPlatform: component.isAppleDesktopPlatform,
                    isUnderStandaloneMode: component.isUnderStandaloneMode,
                });
                return component;
            } else {
                console.error('pwa-install component not found in DOM');
                return null;
            }
        },
    },

    /**
     * Show all available debug commands
     */
    help: (): void => {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    Wordle Global Debug Console                 ║
╠═══════════════════════════════════════════════════════════════╣
║  PWA Commands:                                                 ║
║    debug.pwa.status()      - Show PWA state & platform info    ║
║    debug.pwa.install()     - Trigger install dialog            ║
║    debug.pwa.forceDialog() - Force dialog (ignores dismiss)    ║
║    debug.pwa.hideDialog()  - Hide the install dialog           ║
║    debug.pwa.showBanner()  - Show install banner               ║
║    debug.pwa.reset()       - Reset dismissed state             ║
║    debug.pwa.component()   - Get raw component reference       ║
║                                                                ║
║  Testing Tips:                                                 ║
║    • Chrome DevTools → Application → Manifest to check PWA     ║
║    • Use "Add to Home Screen" in Chrome menu on mobile         ║
║    • iOS: Use Safari only (Chrome iOS can't install PWAs)      ║
║    • Use Chrome DevTools mobile emulation to test iOS UI       ║
╚═══════════════════════════════════════════════════════════════╝
        `);
    },
};

// Expose to window for console access
window.debug = debug;

// Log availability on load (only in dev/debug scenarios)
console.log('Debug tools available. Type debug.help() for commands.');

export default debug;
