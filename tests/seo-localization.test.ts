import { describe, it, expect } from 'vitest';
import { getLocaleForIntl, formatDateLong } from '../utils/locale';
import { interpolate } from '../utils/interpolate';

describe('utils/interpolate', () => {
    it('replaces {key} placeholders with vars', () => {
        expect(interpolate('Hello {name}', { name: 'World' })).toBe('Hello World');
    });

    it('supports multiple placeholders in one string', () => {
        expect(
            interpolate('Wordle #{idx} — {date} — {word}', {
                idx: 42,
                date: 'March 22',
                word: 'CRANE',
            })
        ).toBe('Wordle #42 — March 22 — CRANE');
    });

    it('leaves unknown placeholders literal so failures are visible', () => {
        expect(interpolate('Hello {missing}', {})).toBe('Hello {missing}');
    });

    it('coerces numbers to strings', () => {
        expect(interpolate('{count} words', { count: 1754 })).toBe('1754 words');
    });

    it('returns empty string input unchanged', () => {
        expect(interpolate('', { x: 'y' })).toBe('');
    });
});

describe('utils/locale — getLocaleForIntl', () => {
    it('returns the language code for natively supported languages', () => {
        expect(getLocaleForIntl('en')).toBe('en');
        expect(getLocaleForIntl('es')).toBe('es');
        expect(getLocaleForIntl('fi')).toBe('fi');
        expect(getLocaleForIntl('de')).toBe('de');
        expect(getLocaleForIntl('it')).toBe('it');
        expect(getLocaleForIntl('ja')).toBe('ja');
    });

    it('supports rare but Intl-supported languages', () => {
        // Verified working in Phase 1 investigation
        expect(getLocaleForIntl('gd')).toBe('gd'); // Scottish Gaelic
        expect(getLocaleForIntl('mi')).toBe('mi'); // Māori
        expect(getLocaleForIntl('yo')).toBe('yo'); // Yoruba
        expect(getLocaleForIntl('ha')).toBe('ha'); // Hausa
    });

    it('falls back to a sensible locale for languages Intl does not support', () => {
        expect(getLocaleForIntl('tlh')).toBe('en'); // Klingon — constructed
        expect(getLocaleForIntl('qya')).toBe('en'); // Quenya — constructed
        expect(getLocaleForIntl('la')).toBe('en'); // Latin
        expect(getLocaleForIntl('pau')).toBe('en'); // Palauan
        expect(getLocaleForIntl('hyw')).toBe('hy'); // Eastern Armenian → Armenian
        expect(getLocaleForIntl('ltg')).toBe('lv'); // Latgalian → Latvian
    });

    it('falls back to "en" for completely unknown codes', () => {
        expect(getLocaleForIntl('xx')).toBe('en');
        expect(getLocaleForIntl('bogus-lang')).toBe('en');
    });
});

describe('utils/locale — formatDateLong', () => {
    it('formats dates in English', () => {
        const result = formatDateLong('2026-03-22', 'en');
        expect(result).toContain('March');
        expect(result).toContain('22');
        expect(result).toContain('2026');
    });

    it('formats dates in Spanish using Spanish month names', () => {
        const result = formatDateLong('2026-03-22', 'es');
        // Spanish "March" = "marzo"
        expect(result.toLowerCase()).toContain('marzo');
        expect(result).toContain('2026');
    });

    it('formats dates in Italian using Italian month names', () => {
        const result = formatDateLong('2026-03-22', 'it');
        // Italian "March" = "marzo"
        expect(result.toLowerCase()).toContain('marzo');
        expect(result).toContain('2026');
    });

    it('formats dates in Finnish using Finnish month names', () => {
        const result = formatDateLong('2026-03-22', 'fi');
        // Finnish "March" = "maaliskuuta"
        expect(result.toLowerCase()).toContain('maalis');
        expect(result).toContain('2026');
    });

    it('formats dates in German using German month names', () => {
        const result = formatDateLong('2026-03-22', 'de');
        // German "March" = "März"
        expect(result).toContain('März');
        expect(result).toContain('2026');
    });

    it('falls back to English for unsupported languages', () => {
        const result = formatDateLong('2026-03-22', 'tlh');
        expect(result).toContain('March');
        expect(result).toContain('2026');
    });

    it('returns empty string for null/undefined input', () => {
        expect(formatDateLong(null, 'en')).toBe('');
        expect(formatDateLong(undefined, 'en')).toBe('');
        expect(formatDateLong('', 'en')).toBe('');
    });

    it('returns empty string for invalid date', () => {
        expect(formatDateLong('not-a-date', 'en')).toBe('');
    });
});

describe('SEO template interpolation end-to-end', () => {
    // Mirrors the templates in data/default_language_config.json meta.word_detail
    const wordDetailTitle = 'Wordle #{idx} — {date} — {word} | {langNative} Answer';
    const wordDetailDescWithDef =
        'The Wordle {langNative} answer for {date} (#{idx}) was {word}. {partOfSpeech}{definition}';

    it('produces a correct English word-detail title', () => {
        const title = interpolate(wordDetailTitle, {
            idx: 1737,
            date: formatDateLong('2026-03-22', 'en'),
            word: 'BOLSO',
            langNative: 'English',
        });
        expect(title).toBe('Wordle #1737 — March 22, 2026 — BOLSO | English Answer');
    });

    it('produces a Spanish word-detail title with localised date and native name', () => {
        const title = interpolate(wordDetailTitle, {
            idx: 1737,
            date: formatDateLong('2026-03-22', 'es'),
            word: 'BOLSO',
            langNative: 'Español',
        });
        // The critical bits: native language name appears, date is in Spanish
        expect(title).toContain('Español');
        expect(title.toLowerCase()).toContain('marzo');
        expect(title).not.toContain('Spanish');
    });

    it('produces a description that includes the definition when available', () => {
        const desc = interpolate(wordDetailDescWithDef, {
            idx: 1737,
            date: 'March 22, 2026',
            word: 'BOLSO',
            langNative: 'Español',
            definition: 'A bag or purse',
            partOfSpeech: 'noun: ',
        });
        expect(desc).toContain('Español');
        expect(desc).toContain('BOLSO');
        expect(desc).toContain('A bag or purse');
        expect(desc).toContain('noun:');
    });
});
