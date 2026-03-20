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

export interface UiStrings {
    settings: string;
    dark_mode: string;
    dark_mode_desc: string;
    sound_and_haptics: string;
    difficulty: string;
    word_info: string;
    word_info_desc: string;
    language: string;
    change_language: string;
    better_than: string;
    of_players: string;
    right_to_left: string;
    keyboard_layout: string;
    install_app: string;
    install_app_desc: string;
    report_issue: string;
    view_source: string;
    guess_distribution: string;
    games: string;
    win_percent: string;
    streak: string;
    best: string;
    all_languages: string;
    languages: string;
    play_more_languages: string;
    add_to_home: string;
    play_daily_like_app: string;
    install: string;
    close: string;
    about: string;
    global_stats: string;
    games_played: string;
    win_rate: string;
    current_streak: string;
    languages_won: string;
    best_overall_streak: string;
    best_active_streak: string;
    your_languages: string;
    no_games_yet: string;
    wins: string;
    losses: string;
    avg_attempts: string;
    best_streak: string;
    play: string;
    search_language: string;
    external_links: string;
    coming_soon: string;
    game: string;
    games_lowercase: string;
    definition: string;
    look_up_on_wiktionary: string;
    easy: string;
    normal: string;
    hard: string;
    easy_desc: string;
    normal_desc: string;
    hard_desc: string;
    high_contrast: string;
    high_contrast_desc: string;
    today: string;
    statistics: string;
    todays_word_reveal: string;
    play_now: string;
    future_word: string;
    community_stats: string;
    players: string;
    plays: string;
    win: string;
    first_to_play: string;
    top_score: string;
    all_words: string;
    daily_words_counting: string;
    newer: string;
    older: string;
    page_of: string;
    report_bad_word: string;
    view_all_words: string;
    difficulty_locked: string;
    pos_noun: string;
    pos_verb: string;
    pos_adjective: string;
    pos_adverb: string;
    pos_other: string;
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
    ui?: UiStrings;
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

/** Semantic tile color state — independent of CSS class names. */
export type TileColor = 'correct' | 'semicorrect' | 'incorrect' | 'empty' | 'active';

export type KeyState = '' | 'key-correct' | 'key-semicorrect' | 'key-incorrect';

// =============================================================================
// Game Constants
// =============================================================================

/** Default game grid dimensions. Will be parameterized for alternate word lengths. */
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

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
