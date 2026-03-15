/**
 * Analytics Plugin (client-only)
 *
 * Initializes Google Analytics (GA4) and PostHog.
 * Defers script loading to after page load for performance.
 */

import posthog from 'posthog-js';

declare global {
    interface Window {
        dataLayer: unknown[];
        gtag: (...args: unknown[]) => void;
    }
}

const GA_MEASUREMENT_ID = 'G-273H1MLL3T';
const POSTHOG_KEY = 'phc_DMY07B83ghetzxgIbBhobbdSjlueym6vNVVZwM79SPp';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

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

function initPostHog() {
    try {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            defaults: '2026-01-30',
            autocapture: false,
            capture_pageview: false, // We track pageviews via trackPageView/trackHomepageView
            capture_pageleave: true,
            disable_session_recording: false,
            session_recording: {
                sampleRate: 0.03,
            },
            persistence: 'localStorage+cookie',
            loaded: (ph) => {
                // Register language as a super property if available via route
                const route = useRoute();
                const lang = route.params.lang as string | undefined;
                if (lang) {
                    ph.register({ language: lang });
                }
            },
        });
    } catch {
        // Silently fail - analytics should never break the app
    }
}

export default defineNuxtPlugin(() => {
    initGA4();
    initPostHog();

    return {
        provide: {
            posthog: posthog,
        },
    };
});
