/**
 * Debug Console - access via window.debug in browser console
 */
import pwa from './pwa';

const debug = {
    pwa: {
        install: pwa.install,
        showBanner: pwa.showBanner,
        hideBanner: pwa.hideBanner,
        showIosModal: pwa.showIosModal,
        status: pwa.status,
        reset: pwa.resetDismissed,
    },
    help: (): void => {
        console.log(`
Debug commands:
  debug.pwa.status()       - Show PWA state
  debug.pwa.install()      - Trigger install dialog
  debug.pwa.showBanner()   - Show install banner
  debug.pwa.showIosModal() - Show iOS instructions
  debug.pwa.reset()        - Reset dismissed state
    `);
    },
};

// Expose to window for console access
window.debug = debug;

export default debug;
