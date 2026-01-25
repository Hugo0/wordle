/**
 * Tests for positional character normalization (Hebrew sofit, Greek final sigma)
 */
import { describe, it, expect } from 'vitest';
import {
    buildFinalFormReverseMap,
    toFinalForm,
    toRegularForm,
    normalizePositional,
    normalizePositionalChar,
    positionalCharsMatch,
} from '../positional';
import type { PositionalConfig } from '../positional';

describe('Positional Normalization Module', () => {
    // Hebrew sofit configuration
    const hebrewConfig: PositionalConfig = {
        final_form_map: {
            כ: 'ך',
            מ: 'ם',
            נ: 'ן',
            פ: 'ף',
            צ: 'ץ',
        },
    };

    // Greek final sigma configuration
    const greekConfig: PositionalConfig = {
        final_form_map: {
            σ: 'ς',
        },
    };

    // Empty config (no final forms)
    const emptyConfig: PositionalConfig = {};

    describe('buildFinalFormReverseMap', () => {
        it('should build reverse map from final forms to regular forms', () => {
            const reverseMap = buildFinalFormReverseMap(hebrewConfig);
            expect(reverseMap.get('ך')).toBe('כ');
            expect(reverseMap.get('ם')).toBe('מ');
            expect(reverseMap.get('ן')).toBe('נ');
            expect(reverseMap.get('ף')).toBe('פ');
            expect(reverseMap.get('ץ')).toBe('צ');
        });

        it('should return empty map when no final_form_map', () => {
            const reverseMap = buildFinalFormReverseMap(emptyConfig);
            expect(reverseMap.size).toBe(0);
        });

        it('should build reverse map for Greek', () => {
            const reverseMap = buildFinalFormReverseMap(greekConfig);
            expect(reverseMap.get('ς')).toBe('σ');
        });
    });

    describe('toFinalForm', () => {
        it('should convert to final form when at end of word', () => {
            expect(toFinalForm('כ', true, hebrewConfig)).toBe('ך');
            expect(toFinalForm('מ', true, hebrewConfig)).toBe('ם');
            expect(toFinalForm('נ', true, hebrewConfig)).toBe('ן');
            expect(toFinalForm('פ', true, hebrewConfig)).toBe('ף');
            expect(toFinalForm('צ', true, hebrewConfig)).toBe('ץ');
        });

        it('should NOT convert when NOT at end of word', () => {
            expect(toFinalForm('כ', false, hebrewConfig)).toBe('כ');
            expect(toFinalForm('מ', false, hebrewConfig)).toBe('מ');
        });

        it('should return unchanged for characters without final forms', () => {
            expect(toFinalForm('א', true, hebrewConfig)).toBe('א');
            expect(toFinalForm('ב', true, hebrewConfig)).toBe('ב');
        });

        it('should return unchanged when no config', () => {
            expect(toFinalForm('כ', true, emptyConfig)).toBe('כ');
        });

        it('should convert Greek sigma to final form', () => {
            expect(toFinalForm('σ', true, greekConfig)).toBe('ς');
            expect(toFinalForm('σ', false, greekConfig)).toBe('σ');
        });
    });

    describe('toRegularForm', () => {
        it('should convert final forms back to regular forms', () => {
            const reverseMap = buildFinalFormReverseMap(hebrewConfig);
            expect(toRegularForm('ך', reverseMap)).toBe('כ');
            expect(toRegularForm('ם', reverseMap)).toBe('מ');
            expect(toRegularForm('ן', reverseMap)).toBe('נ');
            expect(toRegularForm('ף', reverseMap)).toBe('פ');
            expect(toRegularForm('ץ', reverseMap)).toBe('צ');
        });

        it('should return unchanged for regular forms', () => {
            const reverseMap = buildFinalFormReverseMap(hebrewConfig);
            expect(toRegularForm('כ', reverseMap)).toBe('כ');
            expect(toRegularForm('א', reverseMap)).toBe('א');
        });

        it('should convert Greek final sigma back', () => {
            const reverseMap = buildFinalFormReverseMap(greekConfig);
            expect(toRegularForm('ς', reverseMap)).toBe('σ');
        });
    });

    describe('normalizePositional', () => {
        it('should normalize Hebrew word with final form at end', () => {
            // Word ending with כ should have it converted to ך
            expect(normalizePositional('אבגדכ', hebrewConfig)).toBe('אבגדך');
        });

        it('should convert mid-word final forms to regular', () => {
            // If someone typed a final form mid-word, convert it back
            expect(normalizePositional('אבךדה', hebrewConfig)).toBe('אבכדה');
        });

        it('should handle word with final form at end correctly', () => {
            // Already correct - final form at end
            expect(normalizePositional('אבגדך', hebrewConfig)).toBe('אבגדך');
        });

        it('should handle Greek words', () => {
            expect(normalizePositional('λογοσ', greekConfig)).toBe('λογος');
            expect(normalizePositional('λογος', greekConfig)).toBe('λογος');
        });

        it('should return unchanged for empty config', () => {
            expect(normalizePositional('אבגדכ', emptyConfig)).toBe('אבגדכ');
        });

        it('should handle empty string', () => {
            expect(normalizePositional('', hebrewConfig)).toBe('');
        });
    });

    describe('normalizePositionalChar', () => {
        it('should normalize final forms to regular forms', () => {
            const reverseMap = buildFinalFormReverseMap(hebrewConfig);
            expect(normalizePositionalChar('ך', reverseMap)).toBe('כ');
            expect(normalizePositionalChar('ם', reverseMap)).toBe('מ');
        });

        it('should return unchanged for regular forms', () => {
            const reverseMap = buildFinalFormReverseMap(hebrewConfig);
            expect(normalizePositionalChar('כ', reverseMap)).toBe('כ');
            expect(normalizePositionalChar('א', reverseMap)).toBe('א');
        });
    });

    describe('positionalCharsMatch', () => {
        it('should match regular and final forms of same letter', () => {
            const reverseMap = buildFinalFormReverseMap(hebrewConfig);
            expect(positionalCharsMatch('כ', 'ך', reverseMap)).toBe(true);
            expect(positionalCharsMatch('ך', 'כ', reverseMap)).toBe(true);
            expect(positionalCharsMatch('מ', 'ם', reverseMap)).toBe(true);
        });

        it('should NOT match different letters', () => {
            const reverseMap = buildFinalFormReverseMap(hebrewConfig);
            expect(positionalCharsMatch('כ', 'מ', reverseMap)).toBe(false);
            expect(positionalCharsMatch('ך', 'ם', reverseMap)).toBe(false);
        });

        it('should match same regular forms', () => {
            const reverseMap = buildFinalFormReverseMap(hebrewConfig);
            expect(positionalCharsMatch('א', 'א', reverseMap)).toBe(true);
            expect(positionalCharsMatch('כ', 'כ', reverseMap)).toBe(true);
        });

        it('should match Greek sigma variants', () => {
            const reverseMap = buildFinalFormReverseMap(greekConfig);
            expect(positionalCharsMatch('σ', 'ς', reverseMap)).toBe(true);
            expect(positionalCharsMatch('ς', 'σ', reverseMap)).toBe(true);
        });
    });
});
