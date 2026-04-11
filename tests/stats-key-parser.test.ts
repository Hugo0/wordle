/**
 * Tests for parseStatsKey — the server-side inverse of buildStatsKey.
 *
 * Covers every key format produced by buildStatsKey (utils/game-modes.ts:341-358).
 */
import { describe, it, expect } from 'vitest';
import { parseStatsKey } from '../server/utils/stats-key-parser';

describe('parseStatsKey', () => {
    // Classic daily 5-letter: bare language code
    it('parses bare language code as classic daily', () => {
        expect(parseStatsKey('en')).toEqual({ lang: 'en', mode: 'classic', playType: 'daily' });
        expect(parseStatsKey('fi')).toEqual({ lang: 'fi', mode: 'classic', playType: 'daily' });
        expect(parseStatsKey('ar')).toEqual({ lang: 'ar', mode: 'classic', playType: 'daily' });
    });

    it('parses 3-letter language codes', () => {
        expect(parseStatsKey('hyw')).toEqual({ lang: 'hyw', mode: 'classic', playType: 'daily' });
        expect(parseStatsKey('tlh')).toEqual({ lang: 'tlh', mode: 'classic', playType: 'daily' });
    });

    // Classic unlimited: "{lang}_unlimited"
    it('parses _unlimited as classic unlimited', () => {
        expect(parseStatsKey('en_unlimited')).toEqual({
            lang: 'en',
            mode: 'classic',
            playType: 'unlimited',
        });
        expect(parseStatsKey('fi_unlimited')).toEqual({
            lang: 'fi',
            mode: 'classic',
            playType: 'unlimited',
        });
    });

    // Other mode unlimited: "{lang}_{mode}"
    it('parses mode without daily suffix as unlimited', () => {
        expect(parseStatsKey('en_dordle')).toEqual({
            lang: 'en',
            mode: 'dordle',
            playType: 'unlimited',
        });
        expect(parseStatsKey('en_tridle')).toEqual({
            lang: 'en',
            mode: 'tridle',
            playType: 'unlimited',
        });
        expect(parseStatsKey('en_quordle')).toEqual({
            lang: 'en',
            mode: 'quordle',
            playType: 'unlimited',
        });
        expect(parseStatsKey('en_speed')).toEqual({
            lang: 'en',
            mode: 'speed',
            playType: 'unlimited',
        });
        expect(parseStatsKey('en_semantic')).toEqual({
            lang: 'en',
            mode: 'semantic',
            playType: 'unlimited',
        });
        expect(parseStatsKey('fi_octordle')).toEqual({
            lang: 'fi',
            mode: 'octordle',
            playType: 'unlimited',
        });
    });

    // Other mode daily: "{lang}_{mode}_daily"
    it('parses _daily suffix as daily play type', () => {
        expect(parseStatsKey('en_dordle_daily')).toEqual({
            lang: 'en',
            mode: 'dordle',
            playType: 'daily',
        });
        expect(parseStatsKey('en_tridle_daily')).toEqual({
            lang: 'en',
            mode: 'tridle',
            playType: 'daily',
        });
        expect(parseStatsKey('en_quordle_daily')).toEqual({
            lang: 'en',
            mode: 'quordle',
            playType: 'daily',
        });
        expect(parseStatsKey('fi_octordle_daily')).toEqual({
            lang: 'fi',
            mode: 'octordle',
            playType: 'daily',
        });
        expect(parseStatsKey('ar_sedecordle_daily')).toEqual({
            lang: 'ar',
            mode: 'sedecordle',
            playType: 'daily',
        });
    });

    // Non-standard word length daily: "{lang}_{mode}_{wordLength}_daily"
    it('parses daily with word length suffix', () => {
        expect(parseStatsKey('en_dordle_6_daily')).toEqual({
            lang: 'en',
            mode: 'dordle',
            playType: 'daily',
        });
        expect(parseStatsKey('fi_classic_4_daily')).toEqual({
            lang: 'fi',
            mode: 'classic',
            playType: 'daily',
        });
    });

    // Non-standard word length unlimited: "{lang}_{mode}_{wordLength}"
    it('parses unlimited with word length suffix', () => {
        expect(parseStatsKey('en_dordle_6')).toEqual({
            lang: 'en',
            mode: 'dordle',
            playType: 'unlimited',
        });
        expect(parseStatsKey('fi_classic_4')).toEqual({
            lang: 'fi',
            mode: 'classic',
            playType: 'unlimited',
        });
    });

    // 3-letter language codes with modes
    it('handles 3-letter lang codes with modes', () => {
        expect(parseStatsKey('hyw_dordle')).toEqual({
            lang: 'hyw',
            mode: 'dordle',
            playType: 'unlimited',
        });
        expect(parseStatsKey('hyw_dordle_daily')).toEqual({
            lang: 'hyw',
            mode: 'dordle',
            playType: 'daily',
        });
        expect(parseStatsKey('tlh_unlimited')).toEqual({
            lang: 'tlh',
            mode: 'classic',
            playType: 'unlimited',
        });
    });
});
