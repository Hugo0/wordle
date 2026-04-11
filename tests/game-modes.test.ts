/**
 * Tests for utils/game-modes.ts — pure function tests for persistence key
 * builders and classifiers, plus createGameConfig.
 */
import { describe, it, expect } from 'vitest';
import {
    createGameConfig,
    buildStatsKey,
    buildSaveKey,
    isClassicDailyStatsKey,
    isDailyStatsKey,
    GAME_MODE_CONFIG,
    type GameMode,
} from '~/utils/game-modes';

// ---------------------------------------------------------------------------
// createGameConfig
// ---------------------------------------------------------------------------

describe('createGameConfig', () => {
    it('populates defaults from mode definition', () => {
        const config = createGameConfig('dordle', 'en');
        expect(config.mode).toBe('dordle');
        expect(config.language).toBe('en');
        expect(config.playType).toBe('daily'); // dordle default
        expect(config.boardCount).toBe(2);
        expect(config.maxGuesses).toBe(7);
        expect(config.timed).toBe(false);
        expect(config.social).toBe('solo');
        expect(config.wordLength).toBe(5);
    });

    it('applies overrides for playType, wordLength, dayIndex', () => {
        const config = createGameConfig('classic', 'de', {
            playType: 'unlimited',
            wordLength: 6,
            dayIndex: 42,
        });
        expect(config.playType).toBe('unlimited');
        expect(config.wordLength).toBe(6);
        expect(config.dayIndex).toBe(42);
    });

    it('speed mode is timed by default', () => {
        const config = createGameConfig('speed', 'fr');
        expect(config.timed).toBe(true);
    });

    it('unlimited legacy mode defaults to unlimited playType', () => {
        const config = createGameConfig('unlimited', 'en');
        expect(config.playType).toBe('unlimited');
    });

    it('returned config is frozen', () => {
        const config = createGameConfig('classic', 'en');
        expect(Object.isFrozen(config)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// buildStatsKey
// ---------------------------------------------------------------------------

describe('buildStatsKey', () => {
    it('classic daily 5-letter returns bare language code', () => {
        const config = createGameConfig('classic', 'en');
        expect(buildStatsKey(config)).toBe('en');
    });

    it('classic daily 5-letter works for non-English languages', () => {
        expect(buildStatsKey(createGameConfig('classic', 'de'))).toBe('de');
        expect(buildStatsKey(createGameConfig('classic', 'ja'))).toBe('ja');
        expect(buildStatsKey(createGameConfig('classic', 'ar'))).toBe('ar');
    });

    it('classic unlimited 5-letter returns bare language code (unified with daily)', () => {
        const config = createGameConfig('classic', 'en', { playType: 'unlimited' });
        expect(buildStatsKey(config)).toBe('en');
    });

    it('legacy unlimited mode returns bare language code', () => {
        const config = createGameConfig('unlimited', 'en');
        expect(buildStatsKey(config)).toBe('en');
    });

    it('speed daily returns lang_speed_daily', () => {
        const config = createGameConfig('speed', 'en');
        expect(buildStatsKey(config)).toBe('en_speed_daily');
    });

    it('speed unlimited returns lang_speed', () => {
        const config = createGameConfig('speed', 'en', { playType: 'unlimited' });
        expect(buildStatsKey(config)).toBe('en_speed');
    });

    it('dordle daily returns lang_dordle_daily', () => {
        const config = createGameConfig('dordle', 'en');
        expect(buildStatsKey(config)).toBe('en_dordle_daily');
    });

    it('dordle unlimited returns lang_dordle', () => {
        const config = createGameConfig('dordle', 'en', { playType: 'unlimited' });
        expect(buildStatsKey(config)).toBe('en_dordle');
    });

    it('quordle daily returns lang_quordle_daily', () => {
        const config = createGameConfig('quordle', 'de');
        expect(buildStatsKey(config)).toBe('de_quordle_daily');
    });

    it('octordle unlimited returns lang_octordle', () => {
        const config = createGameConfig('octordle', 'fr', { playType: 'unlimited' });
        expect(buildStatsKey(config)).toBe('fr_octordle');
    });

    it('semantic daily returns lang_semantic_daily', () => {
        const config = createGameConfig('semantic', 'en');
        expect(buildStatsKey(config)).toBe('en_semantic_daily');
    });

    it('non-5-letter classic daily includes word length before _daily suffix', () => {
        const config = createGameConfig('classic', 'en', { wordLength: 6 });
        // Format: {lang}_{mode}_{wordLength}_daily
        expect(buildStatsKey(config)).toBe('en_classic_6_daily');
    });

    it('non-5-letter classic unlimited includes word length', () => {
        const config = createGameConfig('classic', 'en', { playType: 'unlimited', wordLength: 4 });
        // Non-5-letter unlimited classic — wordLength !== 5 takes priority over classic unlimited branch
        expect(buildStatsKey(config)).toBe('en_classic_4');
    });

    it('non-5-letter speed daily includes word length before _daily suffix', () => {
        const config = createGameConfig('speed', 'en', { wordLength: 7 });
        expect(buildStatsKey(config)).toBe('en_speed_7_daily');
    });
});

// ---------------------------------------------------------------------------
// isClassicDailyStatsKey
// ---------------------------------------------------------------------------

describe('isClassicDailyStatsKey', () => {
    it('bare language code is classic daily', () => {
        expect(isClassicDailyStatsKey('en')).toBe(true);
        expect(isClassicDailyStatsKey('de')).toBe(true);
        expect(isClassicDailyStatsKey('zh')).toBe(true);
    });

    it('unlimited key is not classic daily', () => {
        expect(isClassicDailyStatsKey('en_unlimited')).toBe(false);
    });

    it('dordle daily key is not classic daily', () => {
        expect(isClassicDailyStatsKey('en_dordle_daily')).toBe(false);
    });

    it('mode unlimited keys are not classic daily', () => {
        expect(isClassicDailyStatsKey('en_dordle')).toBe(false);
        expect(isClassicDailyStatsKey('en_speed')).toBe(false);
        expect(isClassicDailyStatsKey('en_quordle')).toBe(false);
    });

    it('non-5-letter key is not classic daily', () => {
        expect(isClassicDailyStatsKey('en_classic_6_daily')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isDailyStatsKey
// ---------------------------------------------------------------------------

describe('isDailyStatsKey', () => {
    it('bare language code is daily (classic daily)', () => {
        expect(isDailyStatsKey('en')).toBe(true);
        expect(isDailyStatsKey('de')).toBe(true);
    });

    it('unlimited key is not daily', () => {
        expect(isDailyStatsKey('en_unlimited')).toBe(false);
    });

    it('dordle daily key is daily', () => {
        expect(isDailyStatsKey('en_dordle_daily')).toBe(true);
    });

    it('dordle unlimited key is not daily', () => {
        expect(isDailyStatsKey('en_dordle')).toBe(false);
    });

    it('non-5-letter daily key ending with _daily is daily', () => {
        // New format: word length before _daily suffix
        expect(isDailyStatsKey('en_classic_6_daily')).toBe(true);
    });

    it('speed daily is daily', () => {
        expect(isDailyStatsKey('en_speed_daily')).toBe(true);
    });

    it('speed unlimited is not daily', () => {
        expect(isDailyStatsKey('en_speed')).toBe(false);
    });

    it('semantic daily is daily', () => {
        expect(isDailyStatsKey('en_semantic_daily')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// buildSaveKey
// ---------------------------------------------------------------------------

describe('buildSaveKey', () => {
    it('classic daily returns bare language code', () => {
        const config = createGameConfig('classic', 'en');
        expect(buildSaveKey(config)).toBe('en');
    });

    it('classic unlimited returns lang_unlimited', () => {
        const config = createGameConfig('classic', 'en', { playType: 'unlimited' });
        expect(buildSaveKey(config)).toBe('en_unlimited');
    });

    it('legacy unlimited mode returns lang_unlimited', () => {
        const config = createGameConfig('unlimited', 'en');
        expect(buildSaveKey(config)).toBe('en_unlimited');
    });

    it('dordle daily returns lang_dordle_daily', () => {
        const config = createGameConfig('dordle', 'en');
        expect(buildSaveKey(config)).toBe('en_dordle_daily');
    });

    it('dordle unlimited returns lang_dordle', () => {
        const config = createGameConfig('dordle', 'en', { playType: 'unlimited' });
        expect(buildSaveKey(config)).toBe('en_dordle');
    });

    it('speed daily returns lang_speed_daily', () => {
        const config = createGameConfig('speed', 'fr');
        expect(buildSaveKey(config)).toBe('fr_speed_daily');
    });

    it('speed unlimited returns lang_speed', () => {
        const config = createGameConfig('speed', 'fr', { playType: 'unlimited' });
        expect(buildSaveKey(config)).toBe('fr_speed');
    });
});

// ---------------------------------------------------------------------------
// Round-trip: isDailyStatsKey(buildStatsKey(config))
// ---------------------------------------------------------------------------

describe('round-trip: isDailyStatsKey matches daily configs', () => {
    const dailyModes: GameMode[] = [
        'classic',
        'speed',
        'dordle',
        'quordle',
        'octordle',
        'sedecordle',
        'duotrigordle',
        'semantic',
    ];

    for (const mode of dailyModes) {
        it(`${mode} daily config produces a daily stats key`, () => {
            const config = createGameConfig(mode, 'en');
            expect(isDailyStatsKey(buildStatsKey(config))).toBe(true);
        });
    }

    // Classic unlimited and legacy unlimited share the bare lang code key with
    // daily, so isDailyStatsKey returns true — this is the backward-compat trade-off
    for (const mode of ['classic', 'unlimited'] as GameMode[]) {
        it(`${mode} unlimited shares key with daily (isDailyStatsKey = true)`, () => {
            const config = createGameConfig(mode, 'en', { playType: 'unlimited' });
            expect(isDailyStatsKey(buildStatsKey(config))).toBe(true);
        });
    }

    const unlimitedConfigs: Array<{ mode: GameMode; playType: 'unlimited' }> = [
        { mode: 'speed', playType: 'unlimited' },
        { mode: 'dordle', playType: 'unlimited' },
        { mode: 'quordle', playType: 'unlimited' },
        { mode: 'octordle', playType: 'unlimited' },
        { mode: 'sedecordle', playType: 'unlimited' },
        { mode: 'duotrigordle', playType: 'unlimited' },
        { mode: 'semantic', playType: 'unlimited' },
    ];

    for (const { mode, playType } of unlimitedConfigs) {
        it(`${mode} unlimited config produces a non-daily stats key`, () => {
            const config = createGameConfig(mode, 'en', { playType });
            expect(isDailyStatsKey(buildStatsKey(config))).toBe(false);
        });
    }
});

// ---------------------------------------------------------------------------
// Round-trip: isClassicDailyStatsKey(buildStatsKey(config))
// ---------------------------------------------------------------------------

describe('round-trip: isClassicDailyStatsKey matches only classic daily 5-letter', () => {
    it('classic daily 5-letter is true', () => {
        const config = createGameConfig('classic', 'en');
        expect(isClassicDailyStatsKey(buildStatsKey(config))).toBe(true);
    });

    it('classic daily 6-letter is false', () => {
        const config = createGameConfig('classic', 'en', { wordLength: 6 });
        expect(isClassicDailyStatsKey(buildStatsKey(config))).toBe(false);
    });

    it('classic unlimited 5-letter is true (shares stats bucket with daily)', () => {
        const config = createGameConfig('classic', 'en', { playType: 'unlimited' });
        expect(isClassicDailyStatsKey(buildStatsKey(config))).toBe(true);
    });

    it('legacy unlimited mode is true (maps to bare lang code)', () => {
        const config = createGameConfig('unlimited', 'en');
        expect(isClassicDailyStatsKey(buildStatsKey(config))).toBe(true);
    });

    const nonClassicModes: GameMode[] = [
        'speed',
        'dordle',
        'quordle',
        'octordle',
        'sedecordle',
        'duotrigordle',
        'semantic',
    ];

    for (const mode of nonClassicModes) {
        it(`${mode} is false`, () => {
            const config = createGameConfig(mode, 'en');
            expect(isClassicDailyStatsKey(buildStatsKey(config))).toBe(false);
        });
    }
});

// ---------------------------------------------------------------------------
// Edge case: non-5-letter daily keys and isDailyStatsKey
// ---------------------------------------------------------------------------

describe('non-5-letter word length edge cases', () => {
    it('non-5-letter classic daily key ends with _daily', () => {
        // Word length goes BEFORE _daily so isDailyStatsKey works correctly
        const config = createGameConfig('classic', 'en', { wordLength: 6 });
        const key = buildStatsKey(config);
        expect(key).toBe('en_classic_6_daily');
        expect(isDailyStatsKey(key)).toBe(true);
    });

    it('non-5-letter unlimited has no daily marker', () => {
        const config = createGameConfig('classic', 'en', { playType: 'unlimited', wordLength: 4 });
        const key = buildStatsKey(config);
        expect(key).toBe('en_classic_4');
        expect(isDailyStatsKey(key)).toBe(false);
    });
});
