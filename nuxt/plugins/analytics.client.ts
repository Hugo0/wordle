/**
 * Analytics Plugin (client-only)
 *
 * Initializes Google Analytics (GA4) and PostHog.
 * Defers script loading to after page load for performance.
 */

declare global {
    interface Window {
        dataLayer: any[];
        gtag: (...args: any[]) => void;
    }
}

function loadGtag() {
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-273H1MLL3T';
    script.async = true;
    document.head.appendChild(script);
}

export default defineNuxtPlugin(() => {
    // GA4 initialization
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', 'G-273H1MLL3T');

    if (document.readyState === 'complete') {
        loadGtag();
    } else {
        window.addEventListener('load', loadGtag);
    }

    // TODO: PostHog initialization
    // TODO: Port analytics event tracking module
});
