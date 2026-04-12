/**
 * Type definitions for Wordle Global
 */

// =============================================================================
// Language Configuration (from language_config.json)
// =============================================================================

export interface LanguageModeMeta {
    title?: string;
    description?: string;
}

export interface SeoFaqItem {
    q: string;
    a: string;
}

export interface SeoTip {
    title: string;
    text: string;
}

export interface SeoHowToStep {
    name: string;
    text: string;
}

export interface SeoValueProp {
    key: string;
    title: string;
    desc: string;
}

/**
 * Translatable SEO content for the below-game noscript section.
 *
 * All text supports placeholders: {langName}, {lang}, {modeName}, {boardCount}, {maxGuesses}.
 * These are interpolated at runtime by useGameSeo.
 *
 * When translating: provide the FULL seo block (shallow merge replaces the entire object).
 * Mode-specific content uses `mode_*` keys with a "multiboard" key shared by all multi-board modes.
 */
export interface LanguageSeo {
    // Section headings
    how_to_play?: string;
    tips_strategy?: string;
    more_modes?: string;
    play_in_languages?: string;
    play_in_languages_sub?: string;
    why_wordle_global?: string;
    faq_title?: string;
    browse_all_languages?: string;
    recent_words?: string;
    view_all_words?: string;
    footer?: string;

    // Tile example descriptions (how-to)
    tile_correct?: string;
    tile_semicorrect?: string;
    tile_incorrect?: string;

    // Social proof stat labels
    stat_players?: string;
    stat_guesses?: string;
    stat_languages?: string;
    stat_modes?: string;

    // Value propositions
    value_props?: SeoValueProp[];

    // Mode description paragraphs (shown in how-to section)
    mode_desc_classic?: string;
    mode_desc_unlimited?: string;
    mode_desc_speed?: string;
    mode_desc_multiboard?: string;
    mode_desc_semantic?: string;

    // FAQ — default (classic) and mode-specific overrides
    faq?: SeoFaqItem[];
    mode_faq?: Record<string, SeoFaqItem[]>;

    // HowTo steps — default (classic) and mode-specific overrides (used in JSON-LD)
    howto?: SeoHowToStep[];
    mode_howto?: Record<string, SeoHowToStep[]>;

    // Strategy tips — default (classic) and mode-specific variants
    tips?: SeoTip[];
    tips_speed?: SeoTip[];
    tips_multiboard?: SeoTip[];
    tips_semantic?: SeoTip[];
    mode_tips?: Record<string, SeoTip[]>;
}

export interface LanguageWordDetailMeta {
    title?: string;
    description_with_def?: string;
    description_without_def?: string;
    title_coming_soon?: string;
    description_coming_soon?: string;
}

export interface LanguagePageMeta {
    title?: string;
    description?: string;
    /** Optional panel-only copy for embedded components (e.g. BestStartingWordsPanel). */
    panel_heading?: string;
    panel_subtitle?: string;
    panel_link?: string;
}

export interface LanguageMeta {
    locale: string;
    title: string;
    description: string;
    keywords: string;
    wordle_native?: string;
    modes?: Record<string, LanguageModeMeta>;
    /** SEO templates for the per-word detail page (`/[lang]/word/[slug]`). */
    word_detail?: LanguageWordDetailMeta;
    /** SEO templates for the word archive page (`/[lang]/words`). */
    word_archive?: LanguagePageMeta;
    /** SEO templates for the best starting words page (`/[lang]/best-starting-words`). */
    best_starting_words?: LanguagePageMeta;
}

export interface LanguageText {
    subheader: string;
    next_word: string;
    no_attempts: string;
    share: string;
    shared?: string;
    copied?: string;
    notification_copied?: string;
    notification_partial_word?: string;
    notification_word_not_valid?: string;
    hard_mode_position?: string;
    hard_mode_contains?: string;
    win_words?: string;
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
    speed_how_it_works?: string;
    speed_explanation?: string;
    speed_time_bonuses?: string;
    speed_guesses_to_time?: string;
    speed_scoring?: string;
    speed_scoring_explanation?: string;
    speed_pressure?: string;
    speed_pressure_explanation?: string;
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
    // Stats & streak modal
    play_to_reveal?: string;
    board?: string;
    new_game?: string;
    share_result?: string;
    keep_playing?: string;
    unlimited_mode?: string;
    day_streak?: string;
    last_28_days?: string;
    weekday_initials?: string;
    won?: string;
    lost?: string;
    missed?: string;
    current?: string;
    longest?: string;
    wins_by_language?: string;
    played?: string;
    show_less?: string;
    show_more_count?: string;
    streak_footer?: string;
    // Speed mode
    speed_streak?: string;
    speed_start?: string;
    speed_go?: string;
    speed_tap_for_rules?: string;
    time_up?: string;
    points?: string;
    solved?: string;
    combo?: string;
    avg_guesses?: string;
    failed?: string;
    the_word_was?: string;
    words_solved?: string;
    play_again?: string;
    per_word?: string;
    // Post-game & copy
    new_word?: string;
    try_another_mode?: string;
    copy_your_results?: string;
    copy_instructions?: string;
    done?: string;
    // Modals & pickers
    choose_game_mode?: string;
    game_mode_subtitle?: string;
    play_arrow?: string;
    choose_language?: string;
    search_languages?: string;
    no_languages_match?: string;
    multi_board?: string;
    board_picker_subtitle?: string;
    boards?: string;
    guesses?: string;
    badges?: string;
    archive?: string;
    best_starting_words?: string;
    guest?: string;
    sign_in?: string;
    sync_stats_earn_badges?: string;
    animations?: string;
    animations_desc?: string;
    // Error page
    error_404?: string;
    error_500?: string;
    play_wordle?: string;
    or_pick_language?: string;
    skip_to_game?: string;
    // Homepage
    homepage_tagline?: string;
    homepage_playing_in?: string;
    homepage_change?: string;
    homepage_choose_language?: string;
    homepage_languages_counting?: string;
    homepage_search?: string;
    homepage_and_more?: string;
    homepage_and_more_desc?: string;
    // Game mode labels & descriptions
    mode_daily_label?: string;
    mode_daily_desc?: string;
    mode_unlimited_label?: string;
    mode_unlimited_desc?: string;
    mode_speed_label?: string;
    mode_speed_desc?: string;
    mode_dordle_label?: string;
    mode_dordle_desc?: string;
    mode_quordle_label?: string;
    mode_quordle_desc?: string;
    mode_octordle_label?: string;
    mode_octordle_desc?: string;
    mode_sedecordle_label?: string;
    mode_sedecordle_desc?: string;
    mode_duotrigordle_label?: string;
    mode_duotrigordle_desc?: string;
    mode_semantic_label?: string;
    mode_semantic_desc?: string;
    mode_multiboard_label?: string;
    mode_custom_label?: string;
    mode_custom_desc?: string;
    mode_party_label?: string;
    mode_party_desc?: string;
    // Semantic Explorer
    semantic_title?: string;
    semantic_won?: string;
    semantic_lost?: string;
    semantic_explore_link?: string;
    semantic_guesses?: string;
    semantic_best_rank?: string;
    semantic_oracle?: string;
    semantic_neighbours_label?: string;
    semantic_compass?: string;
    semantic_compass_empty?: string;
    semantic_compass_no_bearing?: string;
    semantic_compass_no_bearing_sub?: string;
    semantic_compass_think_more?: string;
    semantic_hint?: string;
    semantic_hint_used?: string;
    semantic_hint_ready?: string;
    semantic_hint_guess_more?: string;
    semantic_hint_stuck?: string;
    semantic_hint_nudge?: string;
    semantic_hint_divining?: string;
    semantic_hint_locked?: string;
    semantic_hint_ask?: string;
    semantic_hint_note?: string;
    semantic_hint_map?: string;
    semantic_hint_slice?: string;
    semantic_input_placeholder?: string;
    semantic_game_over?: string;
    semantic_guess_button?: string;
    semantic_guesses_used?: string;
    semantic_closest?: string;
    semantic_cta_headline?: string;
    semantic_cta_body?: string;
    semantic_your_guesses?: string;
    semantic_show_all?: string;
    semantic_tier_found?: string;
    semantic_tier_scorching?: string;
    semantic_tier_burning?: string;
    semantic_tier_hot?: string;
    semantic_tier_warm?: string;
    semantic_tier_cool?: string;
    semantic_tier_cold?: string;
    semantic_tier_awaiting?: string;
    semantic_meaning_map?: string;
    semantic_slice_label?: string;
    semantic_distance_rank?: string;
    semantic_find_hidden?: string;
    semantic_loading?: string;
    semantic_guesses_left?: string;
    semantic_unavailable?: string;
    semantic_retry?: string;
    semantic_unlimited?: string;
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
    seo?: LanguageSeo;
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
    daily_words: string[];
    characters: string[];
    config: LanguageConfig;
    todays_idx: number;
    todays_word: string;
    todays_words?: string[]; // Multi-board modes: array of target words
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

/**
 * Dynamic guess distribution supporting any maxGuesses value.
 * Keys are 1-based guess numbers. Values are win counts on that guess.
 * Backward compatible: old `Record<1|2|3|4|5|6, number>` is a subtype.
 */
export type GuessDistribution = Record<number, number>;

/** Create an empty distribution for a given max guesses. */
export function createEmptyDistribution(maxGuesses: number): GuessDistribution {
    const dist: GuessDistribution = {};
    for (let i = 1; i <= maxGuesses; i++) {
        dist[i] = 0;
    }
    return dist;
}

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

/**
 * Persistent record of a completed Speed Streak session.
 * Stored separately from GameResults because the shape (score, combo, timing)
 * does not match the classic win/attempts model. `date` is ISO8601 — JSON
 * round-trips coerce Date → string, so we pick string as the canonical form.
 */
export interface SpeedResult {
    date: string;
    score: number;
    wordsSolved: number;
    wordsFailed: number;
    maxCombo: number;
    totalGuesses: number;
}

export type SpeedResults = Record<string, SpeedResult[]>;

/** Aggregate view of a user's Speed Streak history across all languages. */
export interface SpeedAggregate {
    games: number;
    bestScore: number;
    bestWordsSolved: number;
    bestMaxCombo: number;
    topRuns: SpeedResult[];
    perLang: Record<string, { games: number; bestScore: number }>;
}

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

/** Map a tile color to its share emoji. */
export function tileEmoji(color: TileColor, highContrast: boolean): string {
    if (color === 'correct') return highContrast ? '🟦' : '🟩';
    if (color === 'semicorrect') return highContrast ? '🟧' : '🟨';
    if (color === 'incorrect') return '⬜';
    return '';
}

/** Convert a row of tile colors to an emoji string. Returns empty on first non-revealed tile. */
export function rowToEmoji(row: TileColor[], highContrast: boolean): string | null {
    let result = '';
    for (const color of row) {
        const e = tileEmoji(color, highContrast);
        if (!e) return null;
        result += e;
    }
    return result;
}

export type KeyState = '' | 'key-correct' | 'key-semicorrect' | 'key-incorrect';

/** Build a fresh key-state map for all characters + special keys. */
export function createKeyStates(characters: string[]): Record<string, KeyState> {
    const keys: Record<string, KeyState> = {};
    for (const char of characters) keys[char] = '';
    keys['⟹'] = '';
    keys['ENTER'] = '';
    keys['DEL'] = '';
    keys['⌫'] = '';
    return keys;
}

// =============================================================================
// Game Constants
// =============================================================================

/** Default game grid dimensions. Will be parameterized for alternate word lengths. */
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

// =============================================================================
// Board State (multi-board architecture)
// =============================================================================

/**
 * Complete state for a single game board.
 * Plain interface (not a class) for Vue 3 reactivity compatibility.
 * The game store holds `ref<BoardState[]>` and manipulates boards via pure functions.
 */
export interface BoardState {
    /** Board index within the session (0 for classic, 0-3 for quordle) */
    readonly boardIndex: number;

    // Grid data (logical layer)
    tiles: string[][];
    tileColors: TileColor[][];
    tileClasses: string[][];

    // Grid data (visual/animation layer — updated at animation midpoints)
    tilesVisual: string[][];
    tileClassesVisual: string[][];

    // Cursor position
    activeRow: number;
    activeCell: number;
    fullWordInputted: boolean;

    // Board completion state
    solved: boolean;
    won: boolean;
    solvedAtGuess: number | null;
    solvedAtTimestamp: number | null;

    // Per-board keyboard state
    keyStates: Record<string, KeyState>;
    pendingKeyUpdates: Array<{ char: string; state: KeyState } | undefined>;

    // Target word for this board
    targetWord: string;

    // Results
    emojiBoard: string;
    attempts: string;
}

const DEFAULT_TILE_CLASS = '';

/** Helper to create a 2D grid filled with a default value. */
function makeGrid<T>(rows: number, cols: number, value: T): T[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

/**
 * Create a fresh BoardState with empty grids sized by maxGuesses × wordLength.
 */
export function createBoardState(
    boardIndex: number,
    targetWord: string,
    maxGuesses: number,
    wordLength: number
): BoardState {
    return {
        boardIndex,
        tiles: makeGrid(maxGuesses, wordLength, ''),
        tileColors: makeGrid(maxGuesses, wordLength, 'empty' as TileColor),
        tileClasses: makeGrid(maxGuesses, wordLength, DEFAULT_TILE_CLASS),
        tilesVisual: makeGrid(maxGuesses, wordLength, ''),
        tileClassesVisual: makeGrid(maxGuesses, wordLength, DEFAULT_TILE_CLASS),
        activeRow: 0,
        activeCell: 0,
        fullWordInputted: false,
        solved: false,
        won: false,
        solvedAtGuess: null,
        solvedAtTimestamp: null,
        keyStates: {},
        pendingKeyUpdates: [],
        targetWord,
        emojiBoard: '',
        attempts: '0',
    };
}

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
    dismissCount: number;
}

// =============================================================================
// Language List (for homepage)
// =============================================================================

export interface LanguageListItem {
    language_name: string;
    language_name_native: string;
    language_code: string;
}
