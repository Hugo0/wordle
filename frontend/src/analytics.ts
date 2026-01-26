/**
 * Analytics Module - Google Analytics 4 Event Tracking
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
 *    - pwa_session: Do installed users return more?
 *
 * 3. VIRALITY: Is sharing working?
 *    - share_click: Do people try to share?
 *    - share_success: Does sharing actually work?
 *    - share_fail: Why does sharing fail?
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
 */

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
}

interface GameCompleteParams {
    language: string;
    won: boolean;
    attempts: number | string;
    time_seconds?: number;
    streak_after: number;
}

interface GameAbandonParams {
    language: string;
    attempt_number: number;
    last_guess_valid: boolean;
}

interface ShareParams {
    language: string;
    method: 'native' | 'clipboard' | 'fallback';
    won: boolean;
    attempts: number | string;
}

interface InvalidWordParams {
    language: string;
    attempt_number: number;
    // Note: We intentionally don't track the actual word for privacy
}

interface SettingsChangeParams {
    setting: 'dark_mode' | 'haptics' | 'sound';
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
 * Safe gtag wrapper - handles missing gtag gracefully
 */
const track = (eventName: string, params?: Record<string, unknown>): void => {
    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, params);
        }
    } catch {
        // Silently fail - analytics should never break the app
    }
};

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
        time_seconds: params.time_seconds,
        streak_after: params.streak_after,
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
    currentStreak: number
): void => {
    track('returning_player', {
        language,
        days_since_last: daysSinceLast,
        current_streak: currentStreak,
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
// FRUSTRATION SIGNALS
// Answers: Are users getting frustrated? Which languages cause issues?
// ============================================================================

/**
 * Track rapid invalid word attempts (frustration signal)
 * If user submits 3+ invalid words in a row, they're likely frustrated
 */
let consecutiveInvalidCount = 0;
let lastInvalidTime = 0;

export const trackFrustrationSignal = (language: string, type: string): void => {
    track('frustration_signal', {
        language,
        frustration_type: type,
    });
};

export const trackInvalidWordWithFrustration = (params: InvalidWordParams): void => {
    const now = Date.now();

    // Reset counter if more than 30 seconds since last invalid
    if (now - lastInvalidTime > 30000) {
        consecutiveInvalidCount = 0;
    }

    consecutiveInvalidCount++;
    lastInvalidTime = now;

    // Track the invalid word
    trackInvalidWord(params);

    // Track frustration if 3+ consecutive invalid attempts
    if (consecutiveInvalidCount >= 3) {
        trackFrustrationSignal(params.language, 'repeated_invalid_words');
    }
};

/**
 * Track rapid backspace (user deleting frantically)
 */
let rapidBackspaceCount = 0;
let lastBackspaceTime = 0;

export const trackRapidBackspace = (language: string): void => {
    const now = Date.now();

    // Count rapid backspaces (within 200ms of each other)
    if (now - lastBackspaceTime < 200) {
        rapidBackspaceCount++;
    } else {
        rapidBackspaceCount = 1;
    }
    lastBackspaceTime = now;

    // Track if 5+ rapid backspaces (frustrated deletion)
    if (rapidBackspaceCount >= 5) {
        trackFrustrationSignal(language, 'rapid_backspace');
        rapidBackspaceCount = 0; // Reset to avoid duplicate events
    }
};

/**
 * Track GitHub issues link click
 * Answers: Are users frustrated enough to report issues?
 */
export const trackIssuesClick = (language: string): void => {
    track('issues_click', {
        language,
    });
};

/**
 * Track "word not valid" notification shown multiple times
 * Answers: Are word lists frustrating users?
 */
export const trackRepeatedNotValidNotification = (language: string, count: number): void => {
    if (count >= 2) {
        track('repeated_not_valid', {
            language,
            count,
        });
    }
};

/**
 * Track long session without completion (user stuck)
 * Answers: Are users getting stuck? On which languages?
 */
export const trackStuckSession = (language: string, attemptNumber: number, minutes: number): void => {
    // Track if user has been on same attempt for 5+ minutes
    if (minutes >= 5) {
        track('stuck_session', {
            language,
            attempt_number: attemptNumber,
            minutes_stuck: minutes,
        });
    }
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
        referrer: document.referrer || 'direct',
    });
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Set up global error tracking
 */
export const initErrorTracking = (language: string): void => {
    window.addEventListener('error', (event) => {
        trackError({
            error_type: 'javascript_error',
            language,
            details: event.message?.substring(0, 100), // Truncate for quota
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        trackError({
            error_type: 'unhandled_promise',
            language,
            details: String(event.reason)?.substring(0, 100),
        });
    });
};

/**
 * Track game abandonment on page unload
 */
export const initAbandonTracking = (
    getState: () => { language: string; activeRow: number; gameOver: boolean; lastGuessValid: boolean }
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

// Default export for convenience
const analytics = {
    // Game lifecycle
    trackGameStart,
    trackGameComplete,
    trackGameAbandon,
    trackGuessSubmit,
    // Retention
    trackReturningPlayer,
    trackStreakMilestone,
    // Sharing
    trackShareClick,
    trackShareSuccess,
    trackShareFail,
    // PWA
    trackPWAPromptShown,
    trackPWAInstall,
    trackPWADismiss,
    trackPWASession,
    // Friction
    trackInvalidWord,
    trackKeyboardMissingChar,
    trackError,
    // Frustration
    trackFrustrationSignal,
    trackInvalidWordWithFrustration,
    trackRapidBackspace,
    trackIssuesClick,
    trackRepeatedNotValidNotification,
    trackStuckSession,
    // Features
    trackSettingsChange,
    trackHelpOpen,
    trackStatsOpen,
    trackLanguageSelect,
    // Session
    trackPageView,
    // Init
    initErrorTracking,
    initAbandonTracking,
};

export default analytics;
