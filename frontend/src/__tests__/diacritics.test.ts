import { describe, it, expect } from 'vitest';
import {
    buildNormalizeMap,
    buildNormalizedWordMap,
    normalizeWord,
    normalizeChar,
    charsMatch,
} from '../diacritics';

describe('Diacritics Module', () => {
    // German diacritic configuration
    const germanConfig = {
        diacritic_map: {
            a: ['ä'],
            o: ['ö'],
            u: ['ü'],
            ss: ['ß'],
        },
    };

    // Portuguese diacritic configuration
    const portugueseConfig = {
        diacritic_map: {
            a: ['á', 'à', 'â', 'ã'],
            e: ['é', 'ê'],
            i: ['í'],
            o: ['ó', 'ô', 'õ'],
            u: ['ú'],
            c: ['ç'],
        },
    };

    // Norwegian - NO diacritic_map (æ, ø, å are distinct letters)
    const norwegianConfig = {};

    describe('buildNormalizeMap', () => {
        it('should build reverse lookup map from diacritic config', () => {
            const map = buildNormalizeMap(germanConfig);
            expect(map.get('ä')).toBe('a');
            expect(map.get('ö')).toBe('o');
            expect(map.get('ü')).toBe('u');
            expect(map.get('ß')).toBe('ss');
        });

        it('should return empty map when no diacritic_map present', () => {
            const map = buildNormalizeMap(norwegianConfig);
            expect(map.size).toBe(0);
        });

        it('should handle multiple variants per base character', () => {
            const map = buildNormalizeMap(portugueseConfig);
            expect(map.get('á')).toBe('a');
            expect(map.get('à')).toBe('a');
            expect(map.get('â')).toBe('a');
            expect(map.get('ã')).toBe('a');
        });
    });

    describe('normalizeChar', () => {
        it('should normalize diacritic characters', () => {
            const map = buildNormalizeMap(germanConfig);
            expect(normalizeChar('ä', map)).toBe('a');
            expect(normalizeChar('ö', map)).toBe('o');
        });

        it('should return unchanged for non-diacritic characters', () => {
            const map = buildNormalizeMap(germanConfig);
            expect(normalizeChar('a', map)).toBe('a');
            expect(normalizeChar('b', map)).toBe('b');
        });

        it('should return unchanged when no normalization configured', () => {
            const map = buildNormalizeMap(norwegianConfig);
            expect(normalizeChar('æ', map)).toBe('æ');
            expect(normalizeChar('ø', map)).toBe('ø');
            expect(normalizeChar('å', map)).toBe('å');
        });
    });

    describe('normalizeWord', () => {
        it('should normalize entire word with German config', () => {
            const map = buildNormalizeMap(germanConfig);
            expect(normalizeWord('börde', map)).toBe('borde');
            expect(normalizeWord('grün', map)).toBe('grun');
            expect(normalizeWord('größe', map)).toBe('grosse');
        });

        it('should normalize entire word with Portuguese config', () => {
            const map = buildNormalizeMap(portugueseConfig);
            expect(normalizeWord('café', map)).toBe('cafe');
            expect(normalizeWord('ação', map)).toBe('acao');
        });

        it('should NOT normalize Norwegian distinct letters', () => {
            const map = buildNormalizeMap(norwegianConfig);
            expect(normalizeWord('blåbær', map)).toBe('blåbær');
            expect(normalizeWord('søster', map)).toBe('søster');
        });
    });

    describe('charsMatch', () => {
        it('should match diacritic variants in German', () => {
            const map = buildNormalizeMap(germanConfig);
            expect(charsMatch('a', 'ä', map)).toBe(true);
            expect(charsMatch('ä', 'a', map)).toBe(true);
            expect(charsMatch('o', 'ö', map)).toBe(true);
        });

        it('should NOT match different base characters', () => {
            const map = buildNormalizeMap(germanConfig);
            expect(charsMatch('a', 'o', map)).toBe(false);
            expect(charsMatch('ä', 'ö', map)).toBe(false);
        });

        it('should NOT match Norwegian distinct letters to base', () => {
            const map = buildNormalizeMap(norwegianConfig);
            expect(charsMatch('æ', 'a', map)).toBe(false);
            expect(charsMatch('ø', 'o', map)).toBe(false);
            expect(charsMatch('å', 'a', map)).toBe(false);
        });
    });

    describe('buildNormalizedWordMap', () => {
        it('should build lookup map from word list', () => {
            const map = buildNormalizeMap(germanConfig);
            const wordList = ['börde', 'grün', 'apfel'];
            const wordMap = buildNormalizedWordMap(wordList, map);

            expect(wordMap.get('borde')).toBe('börde');
            expect(wordMap.get('grun')).toBe('grün');
            expect(wordMap.get('apfel')).toBe('apfel');
        });

        it('should preserve first word when conflicts occur', () => {
            const map = buildNormalizeMap(germanConfig);
            // Both normalize to same form, first one wins
            const wordList = ['börde', 'borde'];
            const wordMap = buildNormalizedWordMap(wordList, map);

            expect(wordMap.get('borde')).toBe('börde');
        });

        it('should not normalize when no diacritic_map', () => {
            const map = buildNormalizeMap(norwegianConfig);
            const wordList = ['blåbær', 'søster'];
            const wordMap = buildNormalizedWordMap(wordList, map);

            // Words are their own keys (no normalization)
            expect(wordMap.get('blåbær')).toBe('blåbær');
            expect(wordMap.get('søster')).toBe('søster');
            // Cannot look up without diacritics
            expect(wordMap.get('blabaer')).toBeUndefined();
        });
    });
});
