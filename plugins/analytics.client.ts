/**
 * Analytics Plugin (client-only)
 *
 * Initializes Google Analytics (GA4).
 * PostHog is handled by @posthog/nuxt module (see nuxt.config.ts).
 */

declare global {
    interface Window {
        dataLayer: unknown[];
        gtag: (...args: unknown[]) => void;
    }
}

const GA_MEASUREMENT_ID = 'G-273H1MLL3T';

function loadGtagScript() {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);
}

function initGA4() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);

    // Defer the actual script load until after page is interactive
    if (document.readyState === 'complete') {
        loadGtagScript();
    } else {
        window.addEventListener('load', loadGtagScript);
    }
}

export default defineNuxtPlugin(() => {
    initGA4();
});
