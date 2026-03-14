/**
 * Analytics Module - Google Analytics 4 + PostHog Event Tracking
 *
 * Business Questions This Module Answers:
 *
 * 1. ENGAGEMENT: Are people playing games?
 *    - game_start: How many games begin?
 *    - game_complete: How many finish? Win rate? Attempts distribution?
 *    - game_abandon: Where do people give up?
 *
 * 2. RETENTION: Are people coming back?
 *    - returning_player: Days since last visit, streak length
 *    - streak_milestone: Are streaks driving retention?
 *    - streak_broken: When and why do streaks break?
 *    - pwa_session: Do installed users return more?
 *
 * 3. VIRALITY: Is sharing working?
 *    - share_click: Do people try to share?
 *    - share_success: Does sharing actually work?
 *    - share_fail: Why is sharing broken?
 *    - share_content_generated: What patterns do people share?
 *
 * 4. FRICTION: What's blocking users?
 *    - invalid_word: Bad word lists causing frustration?
 *    - keyboard_missing_char: Keyboard layout issues?
 *    - page_error: JavaScript crashes?
 *
 * 5. PLATFORM: How do users access the app?
 *    - pwa_install: Install rate
 *    - pwa_install_prompt: Are we showing the prompt?
 *    - pwa_install_dismiss: Do people dismiss it?
 *
 * 6. FEATURES: What settings do people use?
 *    - settings_change: Dark mode, haptics, sound preferences
 *    - help_open: Are people confused?
 *    - stats_open: Do people check stats?
 *
 * 7. MULTI-LANGUAGE: How do users explore languages?
 *    - second_language_start: When users try a new language
 *    - multi_language_session: Users playing 2+ languages
 *    - homepage_view: Top of funnel
 *
 * 8. CONTENT: Do features drive retention?
 *    - definition_view: Users engaging with word definitions
 *    - word_page_view: Power users exploring word lists
 *
 * 9. FUNNEL: Where do users drop off?
 *    - game_page_ready: Page loaded, waiting for first guess
 *    - first_guess_delay: Time from page load to first interaction
 *    - referral_landing: Users arriving from shared links
 */

import posthog from './posthog';

// GA4 only tracks these core events (with registered custom dimensions: language, won, attempts).
// Everything else is PostHog-only. GA4 silently drops unregistered dimensions, so there's no
// point sending rich events to it.
const GA4_EVENTS = new Set(['game_start', 'game_complete', 'game_abandon', 'page_view_enhanced']);

// Events excluded from PostHog to stay within free tier (1M events/month).
// These high-volume events (fired per-guess) are still tracked in GA4 where there is no cap.
const POSTHOG_SKIP_EVENTS = new Set(['guess_submit', 'guess_time', 'first_guess_delay']);

// Default game mode — used as fallback across all game lifecycle events.
// When new modes are added, update this type and the call sites.
const DEFAULT_GAME_MODE = 'daily';

// Extend Window interface for gtag
declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}

// Type-safe event parameters
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
    // Note: We intentionally don't track the actual word for privacy
}

interface SettingsChangeParams {
    setting:
        | 'dark_mode'
        | 'haptics'
        | 'sound'
        | 'feedback'
        | 'word_info'
        | 'definitions'
        | 'hard_mode'
        | 'high_contrast';
    value: boolean;
}

interface PWAParams {
    platform?: 'ios' | 'android' | 'desktop' | 'unknown';
    source?: 'banner' | 'settings' | 'auto';
}

interface ErrorParams {
    error_type: string;
    language?: string;
    details?: string;
}

/**
 * Safe dual-send wrapper.
 * GA4: only core events (game_start, game_complete, game_abandon, page_view_enhanced).
 * PostHog: everything except high-volume per-guess events.
 */
const track = (eventName: string, params?: Record<string, unknown>): void => {
    // Google Analytics 4 (core events only)
    try {
        if (GA4_EVENTS.has(eventName) && typeof window.gtag === 'function') {
            window.gtag('event', eventName, params);
        }
    } catch {
        // Silently fail
    }

    // PostHog (skip high-volume per-guess events to stay within free tier)
    try {
        if (!POSTHOG_SKIP_EVENTS.has(eventName)) {
            posthog.capture(eventName, params);
        }
    } catch {
        // Silently fail
    }
};

/**
 * Get referrer or 'direct'
 */
const getReferrer = (): string => getReferrer();

/**
 * Get platform type for PWA tracking
 */
const getPlatform = (): 'ios' | 'android' | 'desktop' | 'unknown' => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Windows|Mac|Linux/.test(ua) && !/Mobile/.test(ua)) return 'desktop';
    return 'unknown';
};

/**
 * Check if running as installed PWA
 */
const isStandalone = (): boolean => {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
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

// ============================================================================
// GAME LIFECYCLE EVENTS
// ============================================================================

/**
 * Track when a game session starts
 * Answers: How many games begin? New vs returning players?
 */
export const trackGameStart = (params: GameStartParams): void => {
    track('game_start', {
        language: params.language,
        is_returning: params.is_returning,
        days_since_last: params.days_since_last,
        current_streak: params.current_streak,
        game_mode: params.game_mode ?? DEFAULT_GAME_MODE,
        total_games_played: params.total_games_played,
        total_languages_played: params.total_languages_played,
        user_age_days: params.user_age_days,
        is_pwa: isStandalone(),
    });
};

/**
 * Track when a game completes (win or loss)
 * Answers: Win rate? Attempts distribution? Which languages are harder?
 */
export const trackGameComplete = (params: GameCompleteParams): void => {
    track('game_complete', {
        language: params.language,
        won: params.won,
        attempts: params.attempts,
        streak_after: params.streak_after,
        game_mode: params.game_mode ?? DEFAULT_GAME_MODE,
        // Session-aggregated struggle context
        total_invalid_attempts: params.total_invalid_attempts ?? 0,
        max_consecutive_invalid: params.max_consecutive_invalid ?? 0,
        had_frustration: params.had_frustration ?? false,
        time_to_complete_seconds: params.time_to_complete_seconds,
        is_pwa: isStandalone(),
    });
};

/**
 * Track when user leaves mid-game (page unload with incomplete game)
 * Answers: Where do people give up? Which languages frustrate users?
 */
export const trackGameAbandon = (params: GameAbandonParams): void => {
    track('game_abandon', {
        language: params.language,
        attempt_number: params.attempt_number,
        last_guess_valid: params.last_guess_valid,
        game_mode: params.game_mode ?? DEFAULT_GAME_MODE,
    });
};

/**
 * Track each guess submission
 * Answers: How many guesses per game? Invalid word rate?
 */
export const trackGuessSubmit = (
    language: string,
    attemptNumber: number,
    isValid: boolean
): void => {
    track('guess_submit', {
        language,
        attempt_number: attemptNumber,
        is_valid: isValid,
    });
};

/**
 * Track game page loaded and ready for interaction
 * Answers: How many users see the game but never play?
 */
export const trackGamePageReady = (language: string): void => {
    track('game_page_ready', {
        language,
        is_pwa: isStandalone(),
        platform: getPlatform(),
        referrer: getReferrer(),
    });
};

/**
 * Track time from page load to first guess
 * Answers: Are users confused by the UI? How long before engagement?
 */
export const trackFirstGuessDelay = (language: string, delaySeconds: number): void => {
    track('first_guess_delay', {
        language,
        delay_seconds: delaySeconds,
        is_pwa: isStandalone(),
    });
};

/**
 * Track time between consecutive guesses
 * Answers: Are users thinking hard (engaged) or rapid-firing (frustrated/expert)?
 */
export const trackGuessTime = (
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

// ============================================================================
// RETENTION EVENTS
// ============================================================================

/**
 * Track returning players with context
 * Answers: How often do players return? What brings them back?
 */
export const trackReturningPlayer = (
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
        is_pwa: isStandalone(),
    });
};

/**
 * Track streak milestones (7, 30, 100, etc.)
 * Answers: Are streaks driving retention?
 */
export const trackStreakMilestone = (language: string, streakCount: number): void => {
    // Only track meaningful milestones
    const milestones = [7, 14, 30, 50, 100, 200, 365];
    if (milestones.includes(streakCount)) {
        track('streak_milestone', {
            language,
            streak_count: streakCount,
            is_pwa: isStandalone(),
        });
    }
};

/**
 * Track when a streak breaks
 * Answers: When do we lose retained users? How long were they gone?
 */
export const trackStreakBroken = (
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
export const trackReEngagement = (language: string, daysAbsent: number): void => {
    track('re_engagement', {
        language,
        days_absent: daysAbsent,
        referrer: getReferrer(),
        is_pwa: isStandalone(),
    });
};

// ============================================================================
// SHARE EVENTS
// ============================================================================

/**
 * Track share button click
 * Answers: Do people try to share?
 */
export const trackShareClick = (params: ShareParams): void => {
    track('share_click', {
        language: params.language,
        method: params.method,
        won: params.won,
        attempts: params.attempts,
        game_mode: params.game_mode ?? DEFAULT_GAME_MODE,
    });
};

/**
 * Track successful share
 * Answers: Does sharing actually work?
 */
export const trackShareSuccess = (params: ShareParams): void => {
    track('share_success', {
        language: params.language,
        method: params.method,
        won: params.won,
        attempts: params.attempts,
        game_mode: params.game_mode ?? DEFAULT_GAME_MODE,
    });
};

/**
 * Track share failure
 * Answers: Why is sharing broken? Which methods fail?
 */
export const trackShareFail = (language: string, method: string, errorType: string): void => {
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
export const trackShareContentGenerated = (
    language: string,
    won: boolean,
    attempts: number | string,
    emojiPattern: string
): void => {
    // Count greens, yellows, grays in the pattern
    const greens = (emojiPattern.match(/🟩/g) || []).length;
    const yellows = (emojiPattern.match(/🟨/g) || []).length;
    const grays = (emojiPattern.match(/⬜/g) || []).length;
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

// ============================================================================
// PWA EVENTS
// ============================================================================

/**
 * Track PWA install prompt shown
 * Answers: Are we reaching users with install prompts?
 */
export const trackPWAPromptShown = (source: 'banner' | 'settings' | 'auto'): void => {
    track('pwa_prompt_shown', {
        source,
        platform: getPlatform(),
    });
};

/**
 * Track PWA install
 * Answers: What's our install rate?
 */
export const trackPWAInstall = (params?: PWAParams): void => {
    track('pwa_install', {
        platform: params?.platform || getPlatform(),
        source: params?.source || 'unknown',
    });
};

/**
 * Track PWA install dismissed
 * Answers: Are install prompts annoying users?
 */
export const trackPWADismiss = (): void => {
    track('pwa_dismiss', {
        platform: getPlatform(),
    });
};

/**
 * Track PWA session (user opened app in standalone mode)
 * Answers: Do installed users return more?
 */
export const trackPWASession = (language: string): void => {
    if (isStandalone()) {
        track('pwa_session', {
            language,
            platform: getPlatform(),
        });
    }
};

// ============================================================================
// FRICTION / ERROR EVENTS
// ============================================================================

/**
 * Track invalid word entry
 * Answers: Which languages have bad word lists?
 */
export const trackInvalidWord = (params: InvalidWordParams): void => {
    track('invalid_word', {
        language: params.language,
        attempt_number: params.attempt_number,
        // We don't track the actual word for privacy
    });
};

/**
 * Track when user types a character not on the keyboard
 * Answers: Are keyboard layouts missing characters?
 */
export const trackKeyboardMissingChar = (language: string): void => {
    track('keyboard_missing_char', {
        language,
    });
};

/**
 * Track page errors
 * Answers: Is the app crashing? Which languages have issues?
 */
export const trackError = (params: ErrorParams): void => {
    track('page_error', {
        error_type: params.error_type,
        language: params.language,
        details: params.details,
    });
};

// ============================================================================
// FRUSTRATION SIGNALS (session-aggregated, included in game_complete)
// ============================================================================

export interface FrustrationState {
    totalInvalidAttempts: number;
    maxConsecutiveInvalid: number;
    hadFrustration: boolean;
}

let sessionInvalidCount = 0;
let currentConsecutiveInvalid = 0;
let maxConsecutiveInvalid = 0;

export const resetFrustrationState = (): FrustrationState => {
    const state: FrustrationState = {
        totalInvalidAttempts: sessionInvalidCount,
        maxConsecutiveInvalid: maxConsecutiveInvalid,
        hadFrustration: maxConsecutiveInvalid >= 3,
    };
    sessionInvalidCount = 0;
    currentConsecutiveInvalid = 0;
    maxConsecutiveInvalid = 0;
    return state;
};

export const trackInvalidWordAndUpdateState = (params: InvalidWordParams): void => {
    sessionInvalidCount++;
    currentConsecutiveInvalid++;
    maxConsecutiveInvalid = Math.max(maxConsecutiveInvalid, currentConsecutiveInvalid);
    trackInvalidWord(params);
};

export const onValidWord = (): void => {
    currentConsecutiveInvalid = 0;
};

// ============================================================================
// FEATURE USAGE EVENTS
// ============================================================================

/**
 * Track settings changes
 * Answers: What features do people use?
 */
export const trackSettingsChange = (params: SettingsChangeParams): void => {
    track('settings_change', {
        setting: params.setting,
        value: params.value,
    });
};

/**
 * Track help modal open
 * Answers: Are people confused?
 */
export const trackHelpOpen = (language: string): void => {
    track('help_open', {
        language,
    });
};

/**
 * Track stats modal open
 * Answers: Do people engage with their stats?
 */
export const trackStatsOpen = (language: string, trigger: 'manual' | 'game_end'): void => {
    track('stats_open', {
        language,
        trigger,
    });
};

/**
 * Track language selection from homepage
 * Answers: Which languages do people seek out?
 */
export const trackLanguageSelect = (language: string, source: 'search' | 'list' | 'flag'): void => {
    track('language_select', {
        language,
        source,
    });
};

// ============================================================================
// MULTI-LANGUAGE EVENTS
// ============================================================================

/**
 * Track when a user starts playing a second language for the first time
 * Answers: Are users discovering the multi-language value prop?
 */
export const trackSecondLanguageStart = (
    newLanguage: string,
    previousLanguages: string[]
): void => {
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
export const trackMultiLanguageSession = (
    currentLanguage: string,
    sessionLanguages: string[]
): void => {
    track('multi_language_session', {
        current_language: currentLanguage,
        session_languages: sessionLanguages,
        session_language_count: sessionLanguages.length,
    });
};

// ============================================================================
// CONTENT EVENTS
// ============================================================================

/**
 * Track when a user views the word definition after a game
 * Answers: Do definition viewers retain better?
 */
export const trackDefinitionView = (language: string, source: string): void => {
    track('definition_view', {
        language,
        source,
    });
};

/**
 * Track word page views (the /lang/word/N detail pages)
 * Answers: Who are these power users exploring word history?
 */
export const trackWordPageView = (language: string): void => {
    track('word_page_view', {
        language,
        referrer: getReferrer(),
    });
};

// ============================================================================
// FUNNEL EVENTS
// ============================================================================

/**
 * Track homepage view (top of funnel)
 * Answers: How many people land on homepage? What's the conversion to game?
 */
export const trackHomepageView = (): void => {
    track('homepage_view', {
        referrer: getReferrer(),
        is_pwa: isStandalone(),
        platform: getPlatform(),
    });
};

/**
 * Track when a user arrives from a shared link
 * Answers: Is the share → play loop working?
 */
export const trackReferralLanding = (language: string, referralParam: string): void => {
    track('referral_landing', {
        language,
        referral_result: referralParam,
        referrer: getReferrer(),
    });
};

// ============================================================================
// SESSION CONTEXT
// ============================================================================

/**
 * Track page load with context
 * Call once on page load to capture session context
 */
export const trackPageView = (language: string): void => {
    track('page_view_enhanced', {
        language,
        is_pwa: isStandalone(),
        platform: getPlatform(),
        referrer: getReferrer(),
    });
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Set up global error tracking.
 * Sends to GA4 (truncated) and PostHog (full exception with stack trace).
 */
export const initErrorTracking = (language: string): void => {
    window.addEventListener('error', (event) => {
        trackError({
            error_type: 'javascript_error',
            language,
            details: event.message?.substring(0, 100), // Truncate for GA4 quota
        });
        // PostHog gets the full error object with stack trace
        // Also force session recording so error sessions are always captured
        try {
            if (event.error) {
                posthog.captureException(event.error, { language });
            }
            posthog.startSessionRecording({ sampling: false });
        } catch {
            // Silently fail
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        trackError({
            error_type: 'unhandled_promise',
            language,
            details: String(event.reason)?.substring(0, 100),
        });
        try {
            const err =
                event.reason instanceof Error ? event.reason : new Error(String(event.reason));
            posthog.captureException(err, { language });
            posthog.startSessionRecording({ sampling: false });
        } catch {
            // Silently fail
        }
    });
};

/**
 * Track game abandonment on page unload
 */
export const initAbandonTracking = (
    getState: () => {
        language: string;
        activeRow: number;
        gameOver: boolean;
        lastGuessValid: boolean;
    }
): void => {
    window.addEventListener('beforeunload', () => {
        const state = getState();
        if (!state.gameOver && state.activeRow > 0) {
            trackGameAbandon({
                language: state.language,
                attempt_number: state.activeRow,
                last_guess_valid: state.lastGuessValid,
            });
        }
    });
};

// Utility export for other modules
export { daysSince };

// Default export for convenience
const analytics = {
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
    trackError,
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
    trackWordPageView,
    // Funnel
    trackHomepageView,
    trackReferralLanding,
    // Session
    trackPageView,
    // Init
    initErrorTracking,
    initAbandonTracking,
    // Utilities
    daysSince,
};

export default analytics;
