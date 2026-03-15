import posthog from 'posthog-js';

posthog.init('phc_DMY07B83ghetzxgIbBhobbdSjlueym6vNVVZwM79SPp', {
    api_host: 'https://eu.i.posthog.com',
    defaults: '2026-01-30',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: false,
    session_recording: {
        sampleRate: 0.03,
    },
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
        const config = (window as { config?: { language_code?: string } }).config;
        if (config?.language_code) {
            ph.register({ language: config.language_code });
        }
    },
});

/** Computed user properties from game history */
interface UserProperties {
    languagesPlayed: string[];
    totalGames: number;
    totalWins: number;
    preferredLanguage: string;
}

/** Single-pass computation of user properties from game results */
function computeUserProperties(gameResults: Record<string, { won: boolean }[]>): UserProperties {
    const languagesPlayed: string[] = [];
    let totalGames = 0;
    let totalWins = 0;
    let preferredLanguage = '';
    let maxGames = 0;

    for (const [lang, results] of Object.entries(gameResults)) {
        if (results.length > 0) {
            languagesPlayed.push(lang);
            totalGames += results.length;
            for (const g of results) {
                if (g.won) totalWins++;
            }
            if (results.length > maxGames) {
                maxGames = results.length;
                preferredLanguage = lang;
            }
        }
    }

    return { languagesPlayed, totalGames, totalWins, preferredLanguage };
}

/**
 * Get or create a persistent anonymous client ID.
 * Reuses the same localStorage key as game.ts getClientId().
 */
function getOrCreateClientId(): string {
    try {
        let id = localStorage.getItem('client_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('client_id', id);
        }
        return id;
    } catch {
        return 'unknown';
    }
}

/**
 * Identify user with persistent anonymous ID and set person properties.
 * Call once on page load after game_results are available.
 * Returns computed properties for reuse by the caller.
 */
export function identifyUser(gameResults: Record<string, { won: boolean }[]>): UserProperties {
    const props = computeUserProperties(gameResults);

    try {
        const clientId = getOrCreateClientId();

        let firstSeenDate: string | undefined;
        try {
            const stored = localStorage.getItem('first_seen_date');
            if (stored) {
                firstSeenDate = stored;
            } else {
                const today = new Date().toISOString().split('T')[0]!;
                localStorage.setItem('first_seen_date', today);
                firstSeenDate = today;
            }
        } catch {
            // localStorage unavailable
        }

        posthog.identify(clientId, {
            first_seen_date: firstSeenDate,
            total_games_played: props.totalGames,
            total_wins: props.totalWins,
            total_languages_played: props.languagesPlayed.length,
            preferred_language: props.preferredLanguage,
            languages_played: props.languagesPlayed,
        });
    } catch {
        // Silently fail
    }

    return props;
}

/**
 * Update person properties after a game completes.
 */
export function updateUserProperties(gameResults: Record<string, { won: boolean }[]>): void {
    try {
        const props = computeUserProperties(gameResults);
        posthog.setPersonProperties({
            total_games_played: props.totalGames,
            total_wins: props.totalWins,
            total_languages_played: props.languagesPlayed.length,
            preferred_language: props.preferredLanguage,
            languages_played: props.languagesPlayed,
        });
    } catch {
        // Silently fail
    }
}

export default posthog;
