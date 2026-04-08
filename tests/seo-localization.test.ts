import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

/**
 * Per-language regression test.
 *
 * Loads every language config that ships an override for the new SEO
 * templates and asserts:
 *   1. The JSON parses
 *   2. Required placeholders are preserved (otherwise interpolation
 *      produces broken snippets in production)
 *   3. Templates interpolate cleanly with realistic values
 *
 * Languages that don't override these keys (e.g. tlh, qya, pau) inherit
 * defaults via the data-loader merge and are intentionally skipped.
 */
describe('per-language SEO template regression', () => {
    const languagesDir = resolve(__dirname, '..', 'data', 'languages');
    const langs = readdirSync(languagesDir).filter((entry) => {
        const configPath = resolve(languagesDir, entry, 'language_config.json');
        return existsSync(configPath);
    });

    // Sanity: confirm we found a meaningful number of languages
    it('discovers all language configs', () => {
        expect(langs.length).toBeGreaterThanOrEqual(75);
    });

    const sampleVars = {
        idx: 1737,
        date: '22 de marzo de 2026',
        word: 'BOLSO',
        langNative: 'Español',
        definition: 'A bag or purse carried by hand.',
        partOfSpeech: 'noun: ',
        count: 1754,
    };

    const requiredPlaceholders: Record<string, string[]> = {
        'meta.word_detail.title': ['{idx}', '{date}', '{word}', '{langNative}'],
        'meta.word_detail.description_with_def': [
            '{idx}',
            '{date}',
            '{word}',
            '{langNative}',
            '{definition}',
        ],
        'meta.word_detail.description_without_def': ['{idx}', '{date}', '{word}', '{langNative}'],
        'meta.word_detail.title_coming_soon': ['{idx}', '{langNative}'],
        'meta.word_detail.description_coming_soon': ['{idx}', '{langNative}'],
        'meta.word_archive.title': ['{langNative}'],
        'meta.word_archive.description': ['{count}', '{langNative}'],
        'meta.best_starting_words.title': ['{langNative}'],
        'meta.best_starting_words.description': ['{langNative}', '{count}'],
    };

    for (const lang of langs) {
        describe(`language: ${lang}`, () => {
            const configPath = resolve(languagesDir, lang, 'language_config.json');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let config: any;

            it('parses as valid JSON', () => {
                expect(() => {
                    config = JSON.parse(readFileSync(configPath, 'utf-8'));
                }).not.toThrow();
            });

            // Skip placeholder/interpolation checks for languages that
            // intentionally inherit defaults — they have no `meta.word_detail`.
            it('all overridden SEO templates preserve required placeholders', () => {
                if (!config) return;
                for (const [path, placeholders] of Object.entries(requiredPlaceholders)) {
                    const value = path
                        .split('.')
                        .reduce(
                            (acc: unknown, key) => (acc as Record<string, unknown>)?.[key],
                            config
                        ) as string | undefined;
                    if (typeof value !== 'string') continue; // not overridden — fine
                    for (const ph of placeholders) {
                        expect(
                            value.includes(ph),
                            `${lang}: ${path} is missing required placeholder ${ph}\n  → "${value}"`
                        ).toBe(true);
                    }
                }
            });

            it('all overridden SEO templates interpolate without leftover placeholders', () => {
                if (!config) return;
                for (const path of Object.keys(requiredPlaceholders)) {
                    const value = path
                        .split('.')
                        .reduce(
                            (acc: unknown, key) => (acc as Record<string, unknown>)?.[key],
                            config
                        ) as string | undefined;
                    if (typeof value !== 'string') continue;
                    const rendered = interpolate(value, sampleVars);
                    // After interpolation, no `{...}` should remain — that
                    // would mean the template references a placeholder we
                    // don't supply, breaking production snippets.
                    expect(
                        /\{[a-zA-Z_]+\}/.test(rendered),
                        `${lang}: ${path} has leftover placeholders after interpolation\n  → "${rendered}"`
                    ).toBe(false);
                }
            });
        });
    }
});
