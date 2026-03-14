/**
 * Debug Console - access via window.debug in browser console
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
        status: () => {
            const status = pwa.status();
            console.table(status);
            return status;
        },
        install: pwa.install,
        forceDialog: () => {
            const component = getComponent();
            if (component) {
                component.showDialog(true);
            } else {
                console.error('pwa-install component not found');
            }
        },
        hideDialog: () => {
            const component = getComponent();
            if (component) component.hideDialog();
        },
        showBanner: pwa.showBanner,
        hideBanner: pwa.hideBanner,
        reset: () => {
            pwa.resetDismissed();
            console.log('PWA dismiss state reset. Refresh to see prompts.');
        },
        component: () => getComponent() ?? null,
    },

    help: (): void => {
        console.log(
            `%c
  debug.haptics.status()     %cHaptic state & detection
  %cdebug.haptics.test()       %cForce enable + trigger
  %cdebug.haptics.vibrate(ms)  %cRaw navigator.vibrate()
  %cdebug.haptics.enable()     %cForce enable + persist
  %cdebug.pwa.status()         %cPWA state & platform
  %cdebug.pwa.install()        %cTrigger install dialog
  %cdebug.pwa.reset()          %cReset dismiss state`,
            ...Array(7)
                .fill(null)
                .flatMap(() => ['color: #6aaa63; font-weight: bold', 'color: #999; font-weight: normal'])
        );
    },
};

// Expose to window for console access
window.debug = debug;

// Styled console banner on load
console.log(
    `%c ██╗    ██╗ ██████╗ ██████╗ ██████╗ ██╗     ███████╗
 ██║    ██║██╔═══██╗██╔══██╗██╔══██╗██║     ██╔════╝
 ██║ █╗ ██║██║   ██║██████╔╝██║  ██║██║     █████╗
 ██║███╗██║██║   ██║██╔══██╗██║  ██║██║     ██╔══╝
 ╚███╔███╔╝╚██████╔╝██║  ██║██████╔╝███████╗███████╗
  ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝
 %c G L O B A L %c  wordle.global
 %cType %cdebug.help()%c for dev tools`,
    'color: #6aaa63; font-weight: bold; font-size: 10px; line-height: 1.1',
    'background: #6aaa63; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold',
    'color: #888',
    'color: #666',
    'color: #6aaa63; font-weight: bold',
    'color: #666'
);

export default debug;
