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

import { isStandalone, getOrCreateId } from '~/utils/storage';

// Events to exclude from PostHog to stay within free tier (1M events/month).
// These are either redundant (data already aggregated into game_complete)
// or low-value for a wordle game. See: https://github.com/Hugo0/wordle/issues/XXX
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

interface ShareParams {
    language: string;
    method: 'native' | 'clipboard' | 'fallback';
    won: boolean;
    attempts: number | string;
    game_mode?: string;
}

interface InvalidWordParams {
    language: string;
    attempt_number: number;
    word?: string;
}

interface SettingsChangeParams {
    setting:
        | 'dark_mode'
        | 'haptics'
        | 'sound'
        | 'feedback'
        | 'word_info'
        | 'definitions'
        | 'animations'
        | 'hard_mode'
        | 'high_contrast';
    value: boolean;
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
    // FRUSTRATION STATE (per-session, kept in composable closure)
    // ========================================================================

    let sessionInvalidCount = 0;
    let currentConsecutiveInvalid = 0;
    let maxConsecutiveInvalidCount = 0;

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Safe dual-send wrapper - sends to both GA4 and PostHog
     */
    const track = (eventName: string, params?: Record<string, unknown>): void => {
        if (!import.meta.client) return;
        // Never send analytics from localhost (dev environment)
        if (window.location.hostname === 'localhost') return;

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

        try {
            const clientId = getOrCreateId('client_id');

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

    /**
     * Compute user properties without calling identify/setPersonProperties.
     * Used when the user is already identified this session.
     */
    const computeUserPropertiesOnly = (
        gameResults: Record<string, { won: boolean }[]>
    ): UserProperties => {
        return computeUserProperties(gameResults);
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
     * Track each guess submission
     * Answers: How many guesses per game? Invalid word rate?
     */
    const trackGuessSubmit = (
        language: string,
        attemptNumber: number,
        isValid: boolean,
        gameMode?: string
    ): void => {
        track('guess_submit', {
            language,
            attempt_number: attemptNumber,
            is_valid: isValid,
            game_mode: gameMode,
        });
    };

    /**
     * Track game page loaded and ready for interaction
     * Answers: How many users see the game but never play?
     */
    const trackGamePageReady = (language: string): void => {
        track('game_page_ready', {
            language,
            is_pwa: _isStandalone,
            platform: getPlatform(),
            referrer: getReferrer(),
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

    /**
     * Track time between consecutive guesses
     * Answers: Are users thinking hard (engaged) or rapid-firing (frustrated/expert)?
     */
    const trackGuessTime = (
        language: string,
        attemptNumber: number,
        secondsSinceLastGuess: number
    ): void => {
        track('guess_time', {
            language,
            attempt_number: attemptNumber,
            seconds_since_last_guess: secondsSinceLastGuess,
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

    /**
     * Track user returning after 7+ day absence
     * Answers: What brings lapsed users back?
     */
    const trackReEngagement = (language: string, daysAbsent: number): void => {
        track('re_engagement', {
            language,
            days_absent: daysAbsent,
            referrer: getReferrer(),
            is_pwa: _isStandalone,
        });
    };

    // ========================================================================
    // SHARE EVENTS
    // ========================================================================

    /**
     * Track share button click
     * Answers: Do people try to share?
     */
    const trackShareClick = (params: ShareParams): void => {
        track('share_click', {
            language: params.language,
            method: params.method,
            won: params.won,
            attempts: params.attempts,
            game_mode: params.game_mode,
        });
    };

    /**
     * Track successful share
     * Answers: Does sharing actually work?
     */
    const trackShareSuccess = (params: ShareParams): void => {
        track('share_success', {
            language: params.language,
            method: params.method,
            won: params.won,
            attempts: params.attempts,
            game_mode: params.game_mode,
        });
    };

    /**
     * Track share failure
     * Answers: Why is sharing broken? Which methods fail?
     */
    const trackShareFail = (language: string, method: string, errorType: string): void => {
        track('share_fail', {
            language,
            method,
            error_type: errorType,
        });
    };

    /**
     * Track share content details when share succeeds
     * Answers: What result patterns are most shared? Which are viral?
     */
    const trackShareContentGenerated = (
        language: string,
        won: boolean,
        attempts: number | string,
        emojiPattern: string
    ): void => {
        const greens = (emojiPattern.match(/\u{1F7E9}/gu) || []).length;
        const yellows = (emojiPattern.match(/\u{1F7E8}/gu) || []).length;
        const grays = (emojiPattern.match(/\u2B1C/gu) || []).length;
        const rows = emojiPattern.split('\n').filter((r) => r.trim()).length;

        track('share_content_generated', {
            language,
            won,
            attempts,
            green_count: greens,
            yellow_count: yellows,
            gray_count: grays,
            row_count: rows,
        });
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
        if (isStandalone()) {
            track('pwa_session', {
                language,
                platform: getPlatform(),
            });
        }
    };

    // ========================================================================
    // FRICTION / ERROR EVENTS
    // ========================================================================

    /**
     * Track invalid word entry
     * Answers: Which languages have bad word lists?
     */
    const trackInvalidWord = (params: InvalidWordParams): void => {
        track('invalid_word', {
            language: params.language,
            attempt_number: params.attempt_number,
            word: params.word && params.word.length <= 10 ? params.word.toLowerCase() : undefined,
        });
    };

    /**
     * Track when user types a character not on the keyboard
     * Answers: Are keyboard layouts missing characters?
     */
    const trackKeyboardMissingChar = (language: string): void => {
        track('keyboard_missing_char', {
            language,
        });
    };

    // Error tracking is handled automatically by @posthog/nuxt module
    // (captures $exception events with proper stack traces and source maps)

    // ========================================================================
    // FRUSTRATION SIGNALS (session-aggregated, included in game_complete)
    // ========================================================================

    /**
     * Track invalid word and update frustration counters.
     * Call this instead of trackInvalidWord when you want frustration tracking.
     */
    const trackInvalidWordAndUpdateState = (params: InvalidWordParams): void => {
        sessionInvalidCount++;
        currentConsecutiveInvalid++;
        maxConsecutiveInvalidCount = Math.max(
            maxConsecutiveInvalidCount,
            currentConsecutiveInvalid
        );
        trackInvalidWord(params);
    };

    /**
     * Reset consecutive invalid counter on a valid word.
     */
    const onValidWord = (): void => {
        currentConsecutiveInvalid = 0;
    };

    /**
     * Get frustration state and reset counters for the next game.
     */
    const resetFrustrationState = (): FrustrationState => {
        const state: FrustrationState = {
            totalInvalidAttempts: sessionInvalidCount,
            maxConsecutiveInvalid: maxConsecutiveInvalidCount,
            hadFrustration: maxConsecutiveInvalidCount >= 3,
        };
        sessionInvalidCount = 0;
        currentConsecutiveInvalid = 0;
        maxConsecutiveInvalidCount = 0;
        return state;
    };

    // ========================================================================
    // FEATURE USAGE EVENTS
    // ========================================================================

    /**
     * Track settings changes
     * Answers: What features do people use?
     */
    const trackSettingsChange = (params: SettingsChangeParams): void => {
        track('settings_change', {
            setting: params.setting,
            value: params.value,
        });
    };

    /**
     * Track help modal open
     * Answers: Are people confused?
     */
    const trackHelpOpen = (language: string): void => {
        track('help_open', {
            language,
        });
    };

    /**
     * Track stats modal open
     * Answers: Do people engage with their stats?
     */
    const trackStatsOpen = (language: string, trigger: 'manual' | 'game_end'): void => {
        track('stats_open', {
            language,
            trigger,
        });
    };

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

    /**
     * Track when a user plays 2+ languages in one session
     * Answers: Who are our polyglot power users?
     */
    const trackMultiLanguageSession = (
        currentLanguage: string,
        sessionLanguages: string[]
    ): void => {
        track('multi_language_session', {
            current_language: currentLanguage,
            session_languages: sessionLanguages,
            session_language_count: sessionLanguages.length,
        });
    };

    // ========================================================================
    // CONTENT EVENTS
    // ========================================================================

    /**
     * Track when a user views the word definition after a game
     * Answers: Do definition viewers retain better?
     */
    const trackDefinitionView = (language: string, source: string): void => {
        track('definition_view', {
            language,
            source,
        });
    };

    /**
     * Track definition image view (DALL-E generated images)
     */
    const trackDefinitionImageView = (language: string): void => {
        track('definition_image_view', {
            language,
        });
    };

    /**
     * Track word page views (the /lang/word/N detail pages)
     * Answers: Who are these power users exploring word history?
     */
    const trackWordPageView = (language: string): void => {
        track('word_page_view', {
            language,
            referrer: getReferrer(),
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
     * Track when a user arrives from a shared link
     * Answers: Is the share -> play loop working?
     */
    const trackReferralLanding = (language: string, referralParam: string): void => {
        track('referral_landing', {
            language,
            referral_result: referralParam,
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
        trackGuessSubmit,
        trackGamePageReady,
        trackFirstGuessDelay,
        trackGuessTime,
        // Retention
        trackReturningPlayer,
        trackStreakMilestone,
        trackStreakBroken,
        trackReEngagement,
        // Sharing
        trackShareClick,
        trackShareSuccess,
        trackShareFail,
        trackShareContentGenerated,
        // PWA
        trackPWAPromptShown,
        trackPWAInstall,
        trackPWADismiss,
        trackPWASession,
        // Friction
        trackInvalidWord,
        trackKeyboardMissingChar,
        // Frustration (session-aggregated)
        trackInvalidWordAndUpdateState,
        onValidWord,
        resetFrustrationState,
        // Features
        trackSettingsChange,
        trackHelpOpen,
        trackStatsOpen,
        trackLanguageSelect,
        // Multi-language
        trackSecondLanguageStart,
        trackMultiLanguageSession,
        // Content
        trackDefinitionView,
        trackDefinitionImageView,
        trackWordPageView,
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
        computeUserPropertiesOnly,
        // Utilities
        daysSince,
    };
}
