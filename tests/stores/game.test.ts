/**
 * Game Store unit tests
 *
 * Tests the core game state and logic in isolation using Pinia.
 * The game store depends on language, settings, and stats stores,
 * so we mock auto-imported composables and initialize stores with test data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGameStore } from '../../stores/game';
import { useLanguageStore } from '../../stores/language';
import { useSettingsStore } from '../../stores/settings';
import type { GameData } from '../../utils/types';

// ---------------------------------------------------------------------------
// Mock auto-imported composables that the game store uses
// ---------------------------------------------------------------------------

// Mock composables used by game store
const mockHaptic = { error: vi.fn(), confirm: vi.fn(), success: vi.fn() };
const mockHapticFn = Object.assign(vi.fn(), mockHaptic);
vi.stubGlobal('useHaptics', () => ({
    haptic: mockHapticFn,
    setHapticsEnabled: vi.fn(),
}));

vi.stubGlobal('useSounds', () => ({
    sound: { win: vi.fn(), lose: vi.fn() },
    setSoundEnabled: vi.fn(),
}));

vi.stubGlobal('useAnalytics', () => ({
    onValidWord: vi.fn(),
    trackFirstGuessDelay: vi.fn(),
    trackGuessTime: vi.fn(),
    trackGuessSubmit: vi.fn(),
    trackInvalidWordAndUpdateState: vi.fn(),
    trackGameComplete: vi.fn(),
    trackStreakMilestone: vi.fn(),
    trackShareSuccess: vi.fn(),
    trackShareClick: vi.fn(),
    trackShareFail: vi.fn(),
    trackShareContentGenerated: vi.fn(),
    resetFrustrationState: () => ({
        totalInvalidAttempts: 0,
        maxConsecutiveInvalid: 0,
        hadFrustration: false,
    }),
}));

vi.stubGlobal('useDefinitions', () => ({
    fetchDefinition: vi.fn().mockResolvedValue({}),
}));

vi.stubGlobal('useEmbed', () => ({
    checkBanner: vi.fn(),
}));

vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeTestGameData(overrides: Partial<GameData> = {}): GameData {
    return {
        word_list: [
            'crane',
            'slate',
            'hello',
            'world',
            'apple',
            'cairn',
            'party',
            'aback',
            'stare',
            'raise',
            'crate',
        ],
        characters: [
            'a',
            'b',
            'c',
            'd',
            'e',
            'f',
            'g',
            'h',
            'i',
            'j',
            'k',
            'l',
            'm',
            'n',
            'o',
            'p',
            'q',
            'r',
            's',
            't',
            'u',
            'v',
            'w',
            'x',
            'y',
            'z',
        ],
        config: {
            language_code: 'en',
            name: 'English',
            name_native: 'English',
            right_to_left: 'false',
            meta: { locale: 'en', title: 'Wordle English', description: '', keywords: '' },
            text: {
                subheader: '',
                next_word: '',
                no_attempts: '',
                share: 'Share',
                shared: 'Shared!',
                copied: 'Copied!',
            },
            help: {
                title: '',
                title_2: '',
                close: '',
                text_1_1_1: '',
                text_1_1_2: '',
                text_1_2: '',
                text_1_3: '',
                text_2_1: '',
                text_2_2: '',
                text_2_3: '',
                text_3: '',
            },
        },
        todays_idx: 1700,
        todays_word: 'crane',
        timezone_offset: 0,
        keyboard: [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['⇨', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
        ],
        keyboard_layouts: {
            default: {
                label: 'Default',
                rows: [
                    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
                    ['⇨', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
                ],
            },
        },
        keyboard_layout_name: 'default',
        key_diacritic_hints: {},
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setupStores(gameDataOverrides: Partial<GameData> = {}) {
    const pinia = createPinia();
    setActivePinia(pinia);

    const langStore = useLanguageStore();
    langStore.init(makeTestGameData(gameDataOverrides));

    const settingsStore = useSettingsStore();
    // Settings store init() requires import.meta.client + DOM, skip

    const gameStore = useGameStore();
    gameStore.initKeyClasses();

    return { gameStore, langStore, settingsStore };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Game Store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ---- Character input ----

    describe('addChar', () => {
        it('adds character to first tile', () => {
            const { gameStore } = setupStores();
            gameStore.addChar('h');
            expect(gameStore.tiles[0]![0]).toBe('h');
            expect(gameStore.activeCell).toBe(1);
        });

        it('fills a full row (5 chars) and sets fullWordInputted', () => {
            const { gameStore } = setupStores();
            for (const c of ['h', 'e', 'l', 'l', 'o']) {
                gameStore.addChar(c);
            }
            expect(gameStore.tiles[0]!.join('')).toBe('hello');
            expect(gameStore.fullWordInputted).toBe(true);
            expect(gameStore.activeCell).toBe(5);
        });

        it('does not exceed 5 characters', () => {
            const { gameStore } = setupStores();
            for (const c of ['h', 'e', 'l', 'l', 'o', 'x']) {
                gameStore.addChar(c);
            }
            expect(gameStore.activeCell).toBe(5);
        });
    });

    // ---- Backspace ----

    describe('keyDown (backspace)', () => {
        it('removes last character and decrements activeCell', () => {
            const { gameStore } = setupStores();
            gameStore.addChar('h');
            gameStore.addChar('e');
            expect(gameStore.activeCell).toBe(2);

            gameStore.keyDown({ key: 'Backspace' } as KeyboardEvent);
            expect(gameStore.activeCell).toBe(1);
            expect(gameStore.tiles[0]![1]).toBe('');
        });

        it('clears fullWordInputted after backspace', () => {
            const { gameStore } = setupStores();
            for (const c of ['h', 'e', 'l', 'l', 'o']) gameStore.addChar(c);
            expect(gameStore.fullWordInputted).toBe(true);

            gameStore.keyDown({ key: 'Backspace' } as KeyboardEvent);
            expect(gameStore.fullWordInputted).toBe(false);
        });

        it('does nothing when activeCell is 0', () => {
            const { gameStore } = setupStores();
            gameStore.keyDown({ key: 'Backspace' } as KeyboardEvent);
            expect(gameStore.activeCell).toBe(0);
        });
    });

    // ---- Word validation ----

    describe('checkWord', () => {
        it('returns word when found in word list', () => {
            const { gameStore } = setupStores();
            expect(gameStore.checkWord('crane')).toBe('crane');
        });

        it('returns word when found in supplement list', () => {
            const { gameStore } = setupStores();
            expect(gameStore.checkWord('stare')).toBe('stare');
        });

        it('returns null for invalid word', () => {
            const { gameStore } = setupStores();
            expect(gameStore.checkWord('xxxxx')).toBeNull();
        });

        it('accepts any word when allowAnyWord is true', () => {
            const { gameStore } = setupStores();
            gameStore.allowAnyWord = true;
            expect(gameStore.checkWord('zzzzz')).toBe('zzzzz');
        });

        it('matches normalized input to diacritic word ("borde" → "börde")', () => {
            const { gameStore } = setupStores({
                word_list: ['börde', 'crane', 'slate'],
                characters: [
                    'a',
                    'b',
                    'c',
                    'd',
                    'e',
                    'f',
                    'g',
                    'h',
                    'i',
                    'j',
                    'k',
                    'l',
                    'm',
                    'n',
                    'o',
                    'ö',
                    'p',
                    'q',
                    'r',
                    's',
                    't',
                    'u',
                    'v',
                    'w',
                    'x',
                    'y',
                    'z',
                ],
                config: {
                    language_code: 'de',
                    name: 'German',
                    name_native: 'Deutsch',
                    right_to_left: 'false',
                    diacritic_map: { o: ['ö'], u: ['ü'], a: ['ä'] },
                    meta: { locale: 'de', title: '', description: '', keywords: '' },
                    text: { subheader: '', next_word: '', no_attempts: '', share: '' },
                    help: {
                        title: '',
                        title_2: '',
                        close: '',
                        text_1_1_1: '',
                        text_1_1_2: '',
                        text_1_2: '',
                        text_1_3: '',
                        text_2_1: '',
                        text_2_2: '',
                        text_2_3: '',
                        text_3: '',
                    },
                },
            });
            // Typing without diacritics should match the canonical form
            expect(gameStore.checkWord('borde')).toBe('börde');
            // Typing with diacritics should also work
            expect(gameStore.checkWord('börde')).toBe('börde');
            // Non-existent word still fails
            expect(gameStore.checkWord('xxxxx')).toBeNull();
        });
    });

    // ---- Escape key ----

    describe('keyDown (Escape)', () => {
        it('closes all modals', () => {
            const { gameStore } = setupStores();
            gameStore.showHelpModal = true;
            gameStore.showStatsModal = true;
            gameStore.showOptionsModal = true;

            gameStore.keyDown({ key: 'Escape' } as KeyboardEvent);

            expect(gameStore.showHelpModal).toBe(false);
            expect(gameStore.showStatsModal).toBe(false);
            expect(gameStore.showOptionsModal).toBe(false);
        });
    });

    // ---- Animating guard ----

    describe('keyDown while animating', () => {
        it('ignores input when animating', () => {
            const { gameStore } = setupStores();
            gameStore.animating = true;
            gameStore.keyDown({ key: 'a' } as KeyboardEvent);
            expect(gameStore.activeCell).toBe(0);
        });
    });

    // ---- Color algorithm ----

    describe('updateColors', () => {
        it('marks all correct when guess matches target', () => {
            const { gameStore } = setupStores({ todays_word: 'crane' });
            for (const c of ['c', 'r', 'a', 'n', 'e']) gameStore.addChar(c);
            gameStore.updateColors();

            const colors = gameStore.tileColors[0]!;
            for (const color of colors) {
                expect(color).toBe('correct');
            }
        });

        it('marks incorrect when no letters match', () => {
            const { gameStore } = setupStores({ todays_word: 'crane' });
            for (const c of ['b', 'l', 'u', 'f', 'f']) gameStore.addChar(c);
            gameStore.updateColors();

            const colors = gameStore.tileColors[0]!;
            for (const color of colors) {
                expect(color).toBe('incorrect');
            }
        });

        it('handles duplicate letters — green takes priority', () => {
            const { gameStore } = setupStores({ todays_word: 'aback' });
            for (const c of ['a', 'b', 'a', 'c', 'a']) gameStore.addChar(c);
            gameStore.updateColors();

            const colors = gameStore.tileColors[0]!;
            // positions 0,1,2,3 = correct; position 4 ('a' vs 'k') = incorrect (both a's used)
            expect(colors[0]).toBe('correct');
            expect(colors[1]).toBe('correct');
            expect(colors[2]).toBe('correct');
            expect(colors[3]).toBe('correct');
            expect(colors[4]).toBe('incorrect');
        });
    });

    // ---- Hard mode ----

    describe('checkHardMode', () => {
        it('rejects guess missing a revealed green letter', () => {
            const { gameStore } = setupStores({ todays_word: 'crane' });
            // Simulate first guess with 'c' in position 0 correct
            gameStore.tiles[0] = ['c', 'l', 'u', 'b', 's'];
            gameStore.tileColors[0] = [
                'correct',
                'incorrect',
                'incorrect',
                'incorrect',
                'incorrect',
            ];
            gameStore.activeRow = 1;

            const error = gameStore.checkHardMode('slate');
            expect(error).toContain('must be in position 1');
        });

        it('rejects guess missing a revealed yellow letter', () => {
            const { gameStore } = setupStores({ todays_word: 'crane' });
            gameStore.tiles[0] = ['r', 'a', 'i', 's', 'e'];
            gameStore.tileColors[0] = [
                'semicorrect',
                'semicorrect',
                'incorrect',
                'incorrect',
                'semicorrect',
            ];
            gameStore.activeRow = 1;

            const error = gameStore.checkHardMode('blufs');
            expect(error).toContain('must contain');
        });

        it('accepts valid hard mode guess', () => {
            const { gameStore } = setupStores({ todays_word: 'crane' });
            gameStore.tiles[0] = ['c', 'l', 'u', 'b', 's'];
            gameStore.tileColors[0] = [
                'correct',
                'incorrect',
                'incorrect',
                'incorrect',
                'incorrect',
            ];
            gameStore.activeRow = 1;

            const error = gameStore.checkHardMode('crane');
            expect(error).toBeNull();
        });
    });

    // ---- Emoji board ----

    describe('getEmojiBoard', () => {
        it('generates correct emoji pattern', () => {
            const { gameStore } = setupStores();
            // Simulate one completed row
            gameStore.tileColors[0] = [
                'correct',
                'semicorrect',
                'incorrect',
                'incorrect',
                'correct',
            ];
            gameStore.gameOver = true;
            gameStore.gameWon = true;

            const board = gameStore.getEmojiBoard();
            expect(board).toContain('🟩');
            expect(board).toContain('🟨');
            expect(board).toContain('⬜');
        });
    });
});
