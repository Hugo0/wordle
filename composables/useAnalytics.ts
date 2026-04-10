/**
 * Analytics Composable - Google Analytics 4 + PostHog Event Tracking
 *
 * Port of frontend/src/analytics.ts + frontend/src/posthog.ts for Nuxt.
 * SSR-safe: all window/gtag/posthog access is guarded behind import.meta.client.
 *
 * Business Questions This Module Answers:
 *
 * 1. ENGAGEMENT: Are people playing games?
 * 2. RETENTION: Are people coming back?
 * 3. VIRALITY: Is sharing working?
 * 4. FRICTION: What's blocking users?
 * 5. PLATFORM: How do users access the app?
 * 6. FEATURES: What settings do people use?
 * 7. MULTI-LANGUAGE: How do users explore languages?
 * 8. CONTENT: Do features drive retention?
 * 9. FUNNEL: Where do users drop off?
 */

import { isStandalone, getOrCreateId, readLocal, writeLocal } from '~/utils/storage';

// Events to exclude from PostHog to stay within free tier (1M events/month).
// These are either redundant (data already aggregated into game_complete)
// or low-value for a wordle game.
const POSTHOG_SKIP_EVENTS = new Set<string>([
    'invalid_word', // Already aggregated in game_complete as total_invalid_attempts + had_frustration
    'guess_submit', // Attempt count already in game_complete; per-guess granularity not needed
    'guess_time', // Already captured as time_to_complete_seconds in game_complete
]);

// Only these 3 core events are sent to GA4 — bare event names only, no custom
// params. GA4 is kept as a simple event counter + traffic source tracker.
// All rich analytics (dimensions, user properties, funnels) live in PostHog.
// Pageviews are handled by PostHog's built-in $pageview (capture_pageview: 'history_change').
const GA4_CORE_EVENTS = new Set([
    'game_start',
    'game_complete',
    'game_abandon',
    'pwa_prompt_shown',
    'pwa_install',
    'pwa_dismiss',
    'pwa_session',
]);

// GA4 custom dimensions registered on the property — only these params are forwarded to gtag.
const GA4_DIMENSIONS = new Set([
    'attempts',
    'is_pwa',
    'is_returning',
    'language',
    'method',
    'platform',
    'setting',
    'source',
    'value',
    'won',
]);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GameStartParams {
    language: string;
    is_returning: boolean;
    days_since_last?: number;
    current_streak?: number;
    game_mode?: string;
    total_games_played?: number;
    total_languages_played?: number;
    user_age_days?: number;
}

interface GameCompleteParams {
    language: string;
    won: boolean;
    attempts: number | string;
    streak_after: number;
    game_mode?: string;
    is_first_game?: boolean;
    // Session-aggregated struggle context
    total_invalid_attempts?: number;
    max_consecutive_invalid?: number;
    had_frustration?: boolean;
    time_to_complete_seconds?: number;
    // Speed mode extras
    words_solved?: number;
    words_failed?: number;
    score?: number;
    max_combo?: number;
    avg_time_per_word_seconds?: number;
}

interface GameAbandonParams {
    language: string;
    attempt_number: number;
    last_guess_valid: boolean;
    game_mode?: string;
}

interface InvalidWordParams {
    language: string;
    attempt_number: number;
    word?: string;
}

interface PWAParams {
    platform?: 'ios' | 'android' | 'desktop' | 'unknown';
    source?: 'settings' | 'auto' | 'dialog' | 'appinstalled';
}

export interface FrustrationState {
    totalInvalidAttempts: number;
    maxConsecutiveInvalid: number;
    hadFrustration: boolean;
}

/** Computed user properties from game history */
interface UserProperties {
    languagesPlayed: string[];
    totalGames: number;
    totalWins: number;
    preferredLanguage: string;
}

// ============================================================================
// MODULE-SCOPE STATE (shared across all useAnalytics() instances)
// ============================================================================

// Current beforeunload listener — replaced on each initAbandonTracking call
// so SPA navigation doesn't accumulate stale listeners.
let _abandonListener: (() => void) | null = null;

// Frustration counters — module-scoped so all useAnalytics() instances share
// the same state. Only the game store writes to these (via trackInvalidWordAndUpdateState
// and resetFrustrationState), but multiple instances exist (game store, useGamePage, PWA plugin).
// PWA session event — fire once per app lifetime, not per SPA navigation
let _pwaSessionTracked = false;

let _sessionInvalidCount = 0;
let _currentConsecutiveInvalid = 0;
let _maxConsecutiveInvalidCount = 0;

// ============================================================================
// COMPOSABLE
// ============================================================================

export function useAnalytics() {
    // PostHog instance is resolved lazily on each call rather than captured
    // eagerly at composable creation time. This avoids a timing issue where
    // Pinia stores (which call useAnalytics() at setup time) can be created
    // before the @posthog/nuxt plugin provides $posthog.
    const getPostHog = () => usePostHog();

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Safe dual-send wrapper - sends to both GA4 and PostHog
     */
    const track = (eventName: string, params?: Record<string, unknown>): void => {
        if (!import.meta.client) return;
        if (window.location.hostname === 'localhost') return;
        // Skip bots — they inflated PostHog events ~2-3x (GA4 filters these automatically)
        if (navigator.webdriver) return;

        // Google Analytics 4 — forward params matching registered custom dimensions.
        try {
            if (GA4_CORE_EVENTS.has(eventName) && typeof window.gtag === 'function') {
                if (params) {
                    const ga4Params: Record<string, unknown> = {};
                    for (const key of Object.keys(params)) {
                        if (GA4_DIMENSIONS.has(key)) ga4Params[key] = params[key];
                    }
                    window.gtag('event', eventName, ga4Params);
                } else {
                    window.gtag('event', eventName);
                }
            }
        } catch {
            // Silently fail
        }

        // PostHog (skip high-volume events to stay within free tier)
        try {
            if (!POSTHOG_SKIP_EVENTS.has(eventName)) {
                getPostHog()?.capture(eventName, params);
            }
        } catch {
            // Silently fail
        }
    };

    /**
     * Get referrer or 'direct'
     */
    const getReferrer = (): string => {
        if (!import.meta.client) return 'direct';
        try {
            return document.referrer || 'direct';
        } catch {
            return 'direct';
        }
    };

    /**
     * Get platform type for PWA tracking
     */
    const getPlatform = (): 'ios' | 'android' | 'desktop' | 'unknown' => {
        if (!import.meta.client) return 'unknown';
        const ua = navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
        if (/Android/.test(ua)) return 'android';
        if (/Windows|Mac|Linux/.test(ua) && !/Mobile/.test(ua)) return 'desktop';
        return 'unknown';
    };

    /**
     * Calculate days since a date string (YYYY-MM-DD or ISO)
     */
    const daysSince = (dateStr: string | undefined): number | undefined => {
        if (!dateStr) return undefined;
        try {
            const then = new Date(dateStr).getTime();
            const now = Date.now();
            return Math.floor((now - then) / (1000 * 60 * 60 * 24));
        } catch {
            return undefined;
        }
    };

    // ========================================================================
    // POSTHOG USER IDENTIFICATION
    // ========================================================================

    // Cache isStandalone() — can't change within a session
    const _isStandalone = import.meta.client ? isStandalone() : false;

    /** Single-pass computation of user properties from game results */
    const computeUserProperties = (
        gameResults: Record<string, { won: boolean }[]>
    ): UserProperties => {
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
    };

    /**
     * Identify user with persistent anonymous ID and set person properties.
     * Call once on page load after game_results are available.
     * Returns computed properties for reuse by the caller.
     */
    const identifyUser = (gameResults: Record<string, { won: boolean }[]>): UserProperties => {
        const props = computeUserProperties(gameResults);

        if (!import.meta.client) return props;
        if (navigator.webdriver) return props;

        try {
            const clientId = getOrCreateId('client_id');

            let firstSeenDate = readLocal('first_seen_date') ?? undefined;
            if (!firstSeenDate) {
                firstSeenDate = new Date().toISOString().split('T')[0]!;
                writeLocal('first_seen_date', firstSeenDate);
            }

            getPostHog()?.identify(clientId, {
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
    };

    // ========================================================================
    // GAME LIFECYCLE EVENTS
    // ========================================================================

    /**
     * Track when a game session starts
     * Answers: How many games begin? New vs returning players?
     */
    const trackGameStart = (params: GameStartParams): void => {
        track('game_start', {
            language: params.language,
            is_returning: params.is_returning,
            days_since_last: params.days_since_last,
            current_streak: params.current_streak,
            game_mode: params.game_mode,
            total_games_played: params.total_games_played,
            total_languages_played: params.total_languages_played,
            user_age_days: params.user_age_days,
            is_pwa: _isStandalone,
        });
    };

    /**
     * Track when a game completes (win or loss)
     * Answers: Win rate? Attempts distribution? Which languages are harder?
     */
    const trackGameComplete = (params: GameCompleteParams): void => {
        track('game_complete', {
            language: params.language,
            won: params.won,
            attempts: params.attempts,
            streak_after: params.streak_after,
            game_mode: params.game_mode,
            // Session-aggregated struggle context
            total_invalid_attempts: params.total_invalid_attempts ?? 0,
            max_consecutive_invalid: params.max_consecutive_invalid ?? 0,
            had_frustration: params.had_frustration ?? false,
            time_to_complete_seconds: params.time_to_complete_seconds,
            is_pwa: _isStandalone,
            is_first_game: params.is_first_game,
            // Speed mode extras (undefined fields are omitted by PostHog)
            words_solved: params.words_solved,
            words_failed: params.words_failed,
            score: params.score,
            max_combo: params.max_combo,
            avg_time_per_word_seconds: params.avg_time_per_word_seconds,
        });
    };

    /**
     * Track when user leaves mid-game (page unload with incomplete game)
     * Answers: Where do people give up? Which languages frustrate users?
     */
    const trackGameAbandon = (params: GameAbandonParams): void => {
        track('game_abandon', {
            language: params.language,
            attempt_number: params.attempt_number,
            last_guess_valid: params.last_guess_valid,
            game_mode: params.game_mode,
        });
    };

    /**
     * Track time from page load to first guess
     * Answers: Are users confused by the UI? How long before engagement?
     */
    const trackFirstGuessDelay = (language: string, delaySeconds: number): void => {
        track('first_guess_delay', {
            language,
            delay_seconds: delaySeconds,
            is_pwa: _isStandalone,
        });
    };

    // ========================================================================
    // RETENTION EVENTS
    // ========================================================================

    /**
     * Track returning players with context
     * Answers: How often do players return? What brings them back?
     */
    const trackReturningPlayer = (
        language: string,
        daysSinceLast: number,
        currentStreak: number,
        totalLanguagesPlayed?: number
    ): void => {
        track('returning_player', {
            language,
            days_since_last: daysSinceLast,
            current_streak: currentStreak,
            total_languages_played: totalLanguagesPlayed,
            is_pwa: _isStandalone,
            is_re_engagement: daysSinceLast >= 7,
            referrer: daysSinceLast >= 7 ? getReferrer() : undefined,
        });
    };

    /**
     * Track streak milestones (7, 30, 100, etc.)
     * Answers: Are streaks driving retention?
     */
    const trackStreakMilestone = (language: string, streakCount: number): void => {
        const milestones = [7, 14, 30, 50, 100, 200, 365];
        if (milestones.includes(streakCount)) {
            track('streak_milestone', {
                language,
                streak_count: streakCount,
                is_pwa: _isStandalone,
            });
        }
    };

    /**
     * Track when a streak breaks
     * Answers: When do we lose retained users? How long were they gone?
     */
    const trackStreakBroken = (
        language: string,
        previousStreak: number,
        daysSinceLast: number
    ): void => {
        track('streak_broken', {
            language,
            previous_streak: previousStreak,
            days_since_last: daysSinceLast,
        });
    };

    // ========================================================================
    // SHARE EVENTS
    // ========================================================================

    /**
     * Single share event — replaces share_click + share_success + share_fail + share_content_generated.
     * Answers: Do people share? Which methods work? What patterns are viral?
     */
    const trackShare = (params: {
        language: string;
        method: 'native' | 'clipboard' | 'fallback';
        won: boolean;
        attempts: number | string;
        game_mode?: string;
        result: 'success' | 'fail';
        error_type?: string;
        emojiPattern?: string;
    }): void => {
        const props: Record<string, unknown> = {
            language: params.language,
            method: params.method,
            won: params.won,
            attempts: params.attempts,
            game_mode: params.game_mode,
            result: params.result,
            error_type: params.error_type,
        };

        if (params.result === 'success' && params.emojiPattern) {
            props.green_count = (params.emojiPattern.match(/\u{1F7E9}/gu) || []).length;
            props.yellow_count = (params.emojiPattern.match(/\u{1F7E8}/gu) || []).length;
            props.gray_count = (params.emojiPattern.match(/\u2B1C/gu) || []).length;
            props.row_count = params.emojiPattern.split('\n').filter((r) => r.trim()).length;
        }

        track('share', props);
    };

    // ========================================================================
    // PWA EVENTS
    // ========================================================================

    /**
     * Track PWA install prompt shown
     * Answers: Are we reaching users with install prompts? When in the session?
     */
    const trackPWAPromptShown = (
        source: 'settings' | 'auto',
        context?: Record<string, unknown>
    ): void => {
        track('pwa_prompt_shown', {
            source,
            platform: getPlatform(),
            ...context,
        });
    };

    /**
     * Track PWA install
     * Answers: What's our install rate?
     */
    const trackPWAInstall = (params?: PWAParams): void => {
        track('pwa_install', {
            platform: params?.platform || getPlatform(),
            source: params?.source || 'unknown',
        });
    };

    /**
     * Track PWA install dismissed
     * Answers: Are install prompts annoying users?
     */
    const trackPWADismiss = (): void => {
        track('pwa_dismiss', {
            platform: getPlatform(),
        });
    };

    /**
     * Track PWA session (user opened app in standalone mode)
     * Answers: Do installed users return more?
     */
    const trackPWASession = (language: string): void => {
        if (_isStandalone && !_pwaSessionTracked) {
            _pwaSessionTracked = true;
            track('pwa_session', {
                language,
                platform: getPlatform(),
            });
        }
    };

    // ========================================================================
    // FRICTION / ERROR EVENTS
    // ========================================================================

    // Error tracking is handled automatically by @posthog/nuxt module
    // (captures $exception events with proper stack traces and source maps)

    // ========================================================================
    // FRUSTRATION SIGNALS (session-aggregated, included in game_complete)
    // ========================================================================

    /**
     * Update frustration counters on invalid word.
     * Individual invalid_word events are suppressed (in POSTHOG_SKIP_EVENTS);
     * the aggregated counts are included in game_complete instead.
     */
    const trackInvalidWordAndUpdateState = (_params: InvalidWordParams): void => {
        _sessionInvalidCount++;
        _currentConsecutiveInvalid++;
        _maxConsecutiveInvalidCount = Math.max(
            _maxConsecutiveInvalidCount,
            _currentConsecutiveInvalid
        );
    };

    /**
     * Reset consecutive invalid counter on a valid word.
     */
    const onValidWord = (): void => {
        _currentConsecutiveInvalid = 0;
    };

    const resetFrustrationState = (): FrustrationState => {
        const state: FrustrationState = {
            totalInvalidAttempts: _sessionInvalidCount,
            maxConsecutiveInvalid: _maxConsecutiveInvalidCount,
            hadFrustration: _maxConsecutiveInvalidCount >= 3,
        };
        _sessionInvalidCount = 0;
        _currentConsecutiveInvalid = 0;
        _maxConsecutiveInvalidCount = 0;
        return state;
    };

    // ========================================================================
    // FEATURE USAGE EVENTS
    // ========================================================================

    /**
     * Track language selection from homepage
     * Answers: Which languages do people seek out?
     */
    const trackLanguageSelect = (language: string, source: 'search' | 'list' | 'flag'): void => {
        track('language_select', {
            language,
            source,
        });
    };

    // ========================================================================
    // MULTI-LANGUAGE EVENTS
    // ========================================================================

    /**
     * Track when a user starts playing a second language for the first time
     * Answers: Are users discovering the multi-language value prop?
     */
    const trackSecondLanguageStart = (newLanguage: string, previousLanguages: string[]): void => {
        track('second_language_start', {
            new_language: newLanguage,
            previous_languages: previousLanguages,
            total_languages: previousLanguages.length + 1,
        });
    };

    // ========================================================================
    // CONTENT EVENTS
    // ========================================================================

    /**
     * Track when a user views the word definition after a game
     * Answers: Do definition viewers retain better?
     */
    const trackDefinitionView = (language: string, source: string, hasImage?: boolean): void => {
        track('definition_view', {
            language,
            source,
            has_image: hasImage ?? false,
        });
    };

    // ========================================================================
    // FUNNEL EVENTS
    // ========================================================================

    /**
     * Track homepage view (top of funnel)
     * Answers: How many people land on homepage? What's the conversion to game?
     */
    const trackHomepageView = (): void => {
        track('homepage_view', {
            referrer: getReferrer(),
            is_pwa: _isStandalone,
            platform: getPlatform(),
        });
    };

    /**
     * Track when a user arrives from a shared link (?r= param)
     * Answers: Is the share → play loop working? What share results drive clicks?
     */
    const trackReferralLanding = (language: string, shareResult: string): void => {
        track('referral_landing', {
            language,
            share_result: shareResult,
            referrer: getReferrer(),
        });
    };

    // ========================================================================
    // MODE DISCOVERY EVENTS
    // ========================================================================

    /**
     * Track game mode selection from homepage or picker
     * Answers: Which modes are users discovering? What's the conversion from picker?
     */
    const trackModeSelected = (
        mode: string,
        source: 'homepage_card' | 'mode_picker' | 'sidebar'
    ): void => {
        track('mode_selected', {
            mode,
            source,
        });
    };

    // ========================================================================
    // SESSION CONTEXT
    // ========================================================================

    /**
     * Register language as a PostHog super property on all future events.
     * Call once per page load. Pageviews are tracked automatically by PostHog's
     * built-in $pageview (capture_pageview: 'history_change' in nuxt.config.ts).
     */
    const registerLanguage = (language: string): void => {
        getPostHog()?.register({ language });
    };

    /**
     * Register game_mode as a PostHog super property on all future events.
     * Auto-attaches game_mode to every subsequent capture() call.
     * Call whenever gameConfig.mode changes.
     */
    const registerGameMode = (mode: string): void => {
        getPostHog()?.register({ game_mode: mode });
    };

    /**
     * Track the start of a new round within a session (unlimited new word, speed new word).
     * Distinct from game_start which fires once per page load.
     */
    const trackGameRoundStart = (language: string, gameMode: string): void => {
        track('game_round_start', {
            language,
            game_mode: gameMode,
        });
    };

    // ========================================================================
    // INITIALIZATION HELPERS
    // ========================================================================

    /**
     * Track game abandonment on page unload.
     * Replaces any previous listener on re-init (SPA navigation).
     */
    const initAbandonTracking = (
        getState: () => {
            language: string;
            activeRow: number;
            gameOver: boolean;
            lastGuessValid: boolean;
            game_mode?: string;
        }
    ): void => {
        if (!import.meta.client) return;

        // Remove previous listener if any (SPA navigation creates new pages)
        if (_abandonListener) {
            window.removeEventListener('beforeunload', _abandonListener);
        }

        _abandonListener = () => {
            const state = getState();
            if (!state.gameOver && state.activeRow > 0) {
                trackGameAbandon({
                    language: state.language,
                    attempt_number: state.activeRow,
                    last_guess_valid: state.lastGuessValid,
                    game_mode: state.game_mode,
                });
            }
        };

        window.addEventListener('beforeunload', _abandonListener);
    };

    // ========================================================================
    // RETURN ALL TRACKING METHODS
    // ========================================================================

    return {
        // Game lifecycle
        trackGameStart,
        trackGameComplete,
        trackGameAbandon,
        trackFirstGuessDelay,
        // Retention
        trackReturningPlayer,
        trackStreakMilestone,
        trackStreakBroken,
        // Sharing
        trackShare,
        // PWA
        trackPWAPromptShown,
        trackPWAInstall,
        trackPWADismiss,
        trackPWASession,
        // Frustration (session-aggregated, included in game_complete)
        trackInvalidWordAndUpdateState,
        onValidWord,
        resetFrustrationState,
        // Features
        trackLanguageSelect,
        // Multi-language
        trackSecondLanguageStart,
        // Content
        trackDefinitionView,
        // Funnel
        trackHomepageView,
        trackReferralLanding,
        // Mode discovery
        trackModeSelected,
        // Session
        registerLanguage,
        registerGameMode,
        trackGameRoundStart,
        // Init
        initAbandonTracking,
        // PostHog user identification
        identifyUser,
        computeUserProperties,
        // Utilities
        daysSince,
    };
}
