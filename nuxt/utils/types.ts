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
    timezone?: string;
    meta: LanguageMeta;
    text: LanguageText;
    help: LanguageHelp;
    ui?: Record<string, string>;
    /** Optional diacritic normalization map. Maps base characters to their diacritic variants. */
    diacritic_map?: Record<string, string[]>;
    /** Optional final form map for positional character variants. */
    final_form_map?: Record<string, string>;
    /** When "true", word length is counted by grapheme clusters instead of codepoints. */
    grapheme_mode?: 'true' | 'false';
    /** Optional physical key → character map for bypassing IME composition. */
    physical_key_map?: Record<string, string>;
}

// =============================================================================
// Game Data (from API)
// =============================================================================

export interface GameData {
    word_list: string[];
    word_list_supplement: string[];
    characters: string[];
    config: LanguageConfig;
    todays_idx: number;
    todays_word: string;
    timezone_offset: number;
    keyboard: string[][];
    keyboard_layouts: Record<string, KeyboardLayout>;
    keyboard_layout_name: string;
    key_diacritic_hints: Record<string, { text: string; above: boolean }>;
}

// =============================================================================
// Keyboard
// =============================================================================

export interface KeyboardLayout {
    label: string;
    rows: string[][];
}

export interface KeyboardConfig {
    default: string | null;
    layouts: Record<string, KeyboardLayout>;
}

// =============================================================================
// Game State
// =============================================================================

export interface Notification {
    show: boolean;
    fading: boolean;
    message: string;
    top: number;
    timeout: number;
    fadeTimeout: number;
    slideInterval: number;
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

export interface TotalStats {
    total_games: number;
    game_stats: Record<string, GameStats>;
    languages_won: string[];
    total_win_percentage: number;
    longest_overall_streak: number;
    current_overall_streak: number;
    n_victories: number;
    n_losses: number;
}

export type TileState = string; // CSS classes
export type KeyState = '' | 'key-correct' | 'key-semicorrect' | 'key-incorrect';

// =============================================================================
// Definition Types
// =============================================================================

export interface WordDefinition {
    word: string;
    partOfSpeech?: string;
    definition: string;
    definitionNative?: string;
    definitionEn?: string;
    confidence?: number;
    source: 'native' | 'english' | 'link' | 'llm' | 'kaikki' | 'kaikki-en' | 'ai';
    url: string;
}

// =============================================================================
// Word Stats
// =============================================================================

export interface WordStats {
    total: number;
    wins: number;
    losses: number;
    distribution: Record<string, number>;
}

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
    componentReady: boolean;
    isInstallAvailable: boolean;
    isAppleMobile: boolean;
    isAppleDesktop: boolean;
}

// =============================================================================
// Language List (for homepage)
// =============================================================================

export interface LanguageListItem {
    language_name: string;
    language_name_native: string;
    language_code: string;
}
