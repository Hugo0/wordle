/**
 * Debug Console Plugin (client-only)
 *
 * Exposes window.debug with haptic and PWA diagnostic tools.
 */

export default defineNuxtPlugin(() => {
    // Styled console banner
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
        'color: #666',
    );

    const debug = {
        haptics: {
            status: () => {
                const status = {
                    hasVibrateAPI: 'vibrate' in navigator,
                    pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
                    feedbackPref: localStorage.getItem('feedbackEnabled'),
                    standalone: window.matchMedia('(display-mode: standalone)').matches,
                    userAgent: navigator.userAgent,
                };
                console.table(status);
                return status;
            },
            vibrate: (ms = 200) => {
                if ('vibrate' in navigator) {
                    const result = navigator.vibrate(ms);
                    console.log(`navigator.vibrate(${ms}) =>`, result);
                    return result;
                }
                console.log('navigator.vibrate not available');
                return false;
            },
            enable: () => {
                localStorage.setItem('feedbackEnabled', 'true');
                console.log('Haptics force-enabled');
            },
        },
        help: () => {
            console.log(
                `%c
  debug.haptics.status()     %cHaptic state & detection
  %cdebug.haptics.vibrate(ms)  %cRaw navigator.vibrate()
  %cdebug.haptics.enable()     %cForce enable + persist`,
                ...Array(3)
                    .fill(null)
                    .flatMap(() => [
                        'color: #6aaa63; font-weight: bold',
                        'color: #999; font-weight: normal',
                    ]),
            );
        },
    };

    (window as any).debug = debug;
});
