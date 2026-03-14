/**
 * Debug Console - access via window.debug in browser console
 * Useful for testing PWA install flows without needing real devices
 */
import pwa from './pwa';
import { haptic, supportsHaptics, getHapticsEnabled, setHapticsEnabled } from './haptics';

const getComponent = () => document.querySelector('pwa-install');

const debug = {
    haptics: {
        /** Show haptic feedback status */
        status: () => {
            const status = {
                enabled: getHapticsEnabled(),
                supportsHaptics,
                hasVibrateAPI: 'vibrate' in navigator,
                vibrateFunction: typeof navigator.vibrate,
                pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
                feedbackPref: localStorage.getItem('feedbackEnabled'),
                userAgent: navigator.userAgent,
            };
            console.table(status);
            return status;
        },

        /** Force enable haptics and test vibration directly */
        test: () => {
            console.log('Testing haptics...');
            setHapticsEnabled(true);
            haptic();
            console.log('haptic() called. Did you feel it?');
        },

        /** Test navigator.vibrate directly (bypasses all guards) */
        vibrate: (ms = 200) => {
            if ('vibrate' in navigator) {
                const result = navigator.vibrate(ms);
                console.log(`navigator.vibrate(${ms}) returned:`, result);
                return result;
            } else {
                console.log('navigator.vibrate not available');
                return false;
            }
        },

        /** Force enable haptics */
        enable: () => {
            setHapticsEnabled(true);
            localStorage.setItem('feedbackEnabled', 'true');
            console.log('Haptics force-enabled');
        },
    },

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
║  Haptic Commands:                                              ║
║    debug.haptics.status()    - Show haptic state & detection   ║
║    debug.haptics.test()      - Force enable + trigger haptic   ║
║    debug.haptics.vibrate(ms) - Raw navigator.vibrate() test    ║
║    debug.haptics.enable()    - Force enable + save to storage  ║
║                                                                ║
║  PWA Commands:                                                 ║
║    debug.pwa.status()      - Show PWA state & platform info    ║
║    debug.pwa.install()     - Trigger install dialog            ║
║    debug.pwa.forceDialog() - Force dialog (ignores dismiss)    ║
║    debug.pwa.hideDialog()  - Hide the install dialog           ║
║    debug.pwa.showBanner()  - Show install banner               ║
║    debug.pwa.reset()       - Reset dismissed state             ║
║    debug.pwa.component()   - Get raw component reference       ║
╚═══════════════════════════════════════════════════════════════╝
        `);
    },
};

// Expose to window for console access
window.debug = debug;

// Log availability on load (only in dev/debug scenarios)
console.log('Debug tools available. Type debug.help() for commands.');

export default debug;
