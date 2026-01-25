/**
 * Type definitions for Wordle Global
 */

// =============================================================================
// Language Configuration (from language_config.json)
// =============================================================================

export interface LanguageMeta {
    locale: string;
    title: string;
    description: string;
    keywords: string;
}

export interface LanguageText {
    subheader: string;
    next_word: string;
    no_attempts: string;
    share: string;
    shared?: string;
    copied?: string;
    'notification-copied'?: string;
    'notification-partial-word'?: string;
}

export interface LanguageHelp {
    title: string;
    title_2: string;
    close: string;
    text_1_1_1: string;
    text_1_1_2: string;
    text_1_2: string;
    text_1_3: string;
    text_2_1: string;
    text_2_2: string;
    text_2_3: string;
    text_3: string;
}

export interface LanguageConfig {
    language_code: string;
    name: string;
    name_native: string;
    right_to_left: 'true' | 'false';
    right_to_left_on?: string;
    language_code_3?: string;
    language_code_iso_639_3?: string;
    meta: LanguageMeta;
    text: LanguageText;
    help: LanguageHelp;
}

// =============================================================================
// Game Data (injected by Jinja into window)
// =============================================================================

export interface GameData {
    word_list: string[];
    word_list_supplement: string[];
    characters: string[];
    config: LanguageConfig;
    todays_idx: string;
    todays_word: string;
}

// =============================================================================
// Game State
// =============================================================================

export interface Notification {
    show: boolean;
    message: string;
    top: number;
    timeout: number;
}

export type GuessDistribution = Record<1 | 2 | 3 | 4 | 5 | 6, number>;

export interface GameStats {
    n_wins: number;
    n_losses: number;
    n_games: number;
    n_attempts: number;
    avg_attempts: number;
    win_percentage: number;
    longest_streak: number;
    current_streak: number;
    guessDistribution: GuessDistribution;
}

export interface GameResult {
    won: boolean;
    attempts: string | number;
    date: Date | string;
}

export type GameResults = Record<string, GameResult[]>;

export type TileState = string; // CSS classes
export type KeyState = '' | 'key-correct' | 'key-semicorrect' | 'key-incorrect';

// =============================================================================
// PWA Types
// =============================================================================

export interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAStatus {
    hasPrompt: boolean;
    dismissed: boolean;
    isStandalone: boolean;
    isIOS: boolean;
    hasComponent: boolean;
    // From @khmyznikov/pwa-install component
    componentReady: boolean;
    isInstallAvailable: boolean;
    isAppleMobile: boolean;
    isAppleDesktop: boolean;
}

// =============================================================================
// Window Globals (from Jinja template)
// =============================================================================

declare global {
    interface Window {
        // Jinja-injected globals
        word_list?: string[];
        word_list_supplement?: string[];
        characters?: string[];
        config?: LanguageConfig;
        todays_idx?: string;
        todays_word?: string;

        // Debug tools (see frontend/src/debug.ts)
        debug?: {
            pwa: {
                status: () => PWAStatus;
                install: () => void;
                forceDialog: () => void;
                hideDialog: () => void;
                showBanner: () => void;
                hideBanner: () => void;
                reset: () => void;
                component: () => HTMLElementTagNameMap['pwa-install'] | null;
            };
            help: () => void;
        };
    }

    // PWA install component (@khmyznikov/pwa-install)
    interface HTMLElementTagNameMap {
        'pwa-install': HTMLElement & {
            showDialog: (forced?: boolean) => void;
            hideDialog: () => void;
            install: () => void;
            isInstallAvailable: boolean;
            isAppleMobilePlatform: boolean;
            isAppleDesktopPlatform: boolean;
            isUnderStandaloneMode: boolean;
        };
    }
}

export {};
