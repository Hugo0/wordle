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
        'color: #666'
    );

    const debug = {
        haptics: {
            status: () => {
                const { getHapticsEnabled, supportsHaptics } = useHaptics();
                const status = {
                    enabled: getHapticsEnabled(),
                    supportsHaptics,
                    hasVibrateAPI: 'vibrate' in navigator,
                    vibrateFunction: typeof navigator.vibrate,
                    pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
                    feedbackPref: localStorage.getItem('feedbackEnabled'),
                    standalone: window.matchMedia('(display-mode: standalone)').matches,
                    userAgent: navigator.userAgent,
                };
                console.table(status);
                return status;
            },
            test: () => {
                const { haptic, setHapticsEnabled } = useHaptics();
                setHapticsEnabled(true);
                haptic();
                console.log('haptic() called. Did you feel it?');
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
                const { setHapticsEnabled } = useHaptics();
                setHapticsEnabled(true);
                localStorage.setItem('feedbackEnabled', 'true');
                console.log('Haptics force-enabled');
            },
        },
        pwa: {
            status: () => {
                const nuxtApp = useNuxtApp();
                const pwa = (nuxtApp as any).$pwaInstall;
                if (pwa) {
                    const s = pwa.status();
                    console.table(s);
                    return s;
                }
                console.log('PWA install plugin not loaded');
                return null;
            },
            install: () => {
                const nuxtApp = useNuxtApp();
                const pwa = (nuxtApp as any).$pwaInstall;
                if (pwa) pwa.install();
                else console.log('PWA install plugin not loaded');
            },
            reset: () => {
                const nuxtApp = useNuxtApp();
                const pwa = (nuxtApp as any).$pwaInstall;
                if (pwa) {
                    pwa.resetDismissed();
                    console.log('PWA dismiss state reset. Refresh to see prompts.');
                }
            },
        },
        streak: {
            set: (n: number) => {
                const game = useGameStore();
                game.debugStreakOverride = n;
                console.log(`Streak override set to ${n}. Use debug.streak.reset() to clear.`);
            },
            ignite: () => {
                const game = useGameStore();
                // Simulate a win: briefly pulse gameOver false→true with gameWon=true
                // to trigger the PageShell watcher that sets justWon
                const prevOver = game.gameOver;
                const prevWon = game.gameWon;
                game.gameOver = false;
                game.gameWon = true;
                setTimeout(() => {
                    game.gameOver = true;
                    setTimeout(() => {
                        game.gameOver = prevOver;
                        game.gameWon = prevWon;
                    }, 900);
                }, 50);
                console.log('Ignite animation triggered');
            },
            reset: () => {
                const game = useGameStore();
                game.debugStreakOverride = null;
                console.log('Streak override cleared — showing real streak');
            },
        },
        help: () => {
            console.log(
                `%c
  debug.haptics.status()     %cHaptic state & detection
  %cdebug.haptics.test()       %cForce enable + trigger
  %cdebug.haptics.vibrate(ms)  %cRaw navigator.vibrate()
  %cdebug.haptics.enable()     %cForce enable + persist
  %cdebug.pwa.status()         %cPWA state & platform
  %cdebug.pwa.install()        %cTrigger install dialog
  %cdebug.pwa.reset()          %cReset dismiss state
  %cdebug.streak.set(n)        %cOverride streak count
  %cdebug.streak.ignite()      %cTrigger win animation
  %cdebug.streak.reset()       %cClear streak override`,
                ...Array(10)
                    .fill(null)
                    .flatMap(() => [
                        'color: #6aaa63; font-weight: bold',
                        'color: #999; font-weight: normal',
                    ])
            );
        },
    };

    (window as any).debug = debug;
});
