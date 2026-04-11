/**
 * Unit tests for server/utils/hreflang.ts
 *
 * Tests language code filtering, remapping, and sitemap XML generation.
 */
import { describe, it, expect } from 'vitest';
import { getHreflangLanguages, buildHreflangXml } from '~/server/utils/hreflang';

describe('getHreflangLanguages', () => {
    const allCodes = [
        'ar',
        'az',
        'bg',
        'bn',
        'br',
        'ca',
        'ckb',
        'cs',
        'da',
        'de',
        'el',
        'en',
        'eo',
        'es',
        'et',
        'eu',
        'fa',
        'fi',
        'fo',
        'fr',
        'fur',
        'fy',
        'ga',
        'gd',
        'gl',
        'ha',
        'he',
        'hi',
        'hr',
        'hu',
        'hy',
        'hyw',
        'ia',
        'id',
        'ie',
        'is',
        'it',
        'ja',
        'ka',
        'ko',
        'la',
        'lb',
        'lt',
        'ltg',
        'lv',
        'mi',
        'mk',
        'mn',
        'mr',
        'ms',
        'nb',
        'nds',
        'ne',
        'nl',
        'nn',
        'oc',
        'pa',
        'pau',
        'pl',
        'pt',
        'qya',
        'ro',
        'ru',
        'rw',
        'sk',
        'sl',
        'sq',
        'sr',
        'sv',
        'sw',
        'tk',
        'tl',
        'tlh',
        'tr',
        'uk',
        'ur',
        'uz',
        'vi',
        'yo',
    ];

    it('excludes codes Google cannot process', () => {
        const result = getHreflangLanguages(allCodes);
        const tags = result.map((e) => e.tag);
        const codes = result.map((e) => e.code);

        // These should be excluded entirely
        expect(codes).not.toContain('nds');
        expect(codes).not.toContain('fur');
        expect(codes).not.toContain('tlh');
        expect(codes).not.toContain('qya');
        expect(codes).not.toContain('pau');
        expect(codes).not.toContain('hyw');
        expect(codes).not.toContain('ltg');

        // Tags should not contain any 3-letter code
        for (const tag of tags) {
            expect(tag.length).toBeLessThanOrEqual(2);
        }
    });

    it('remaps ckb to ku', () => {
        const result = getHreflangLanguages(allCodes);
        const ckbEntry = result.find((e) => e.code === 'ckb');

        expect(ckbEntry).toBeDefined();
        expect(ckbEntry!.tag).toBe('ku');
    });

    it('passes through valid 2-letter codes unchanged', () => {
        const result = getHreflangLanguages(allCodes);
        const enEntry = result.find((e) => e.code === 'en');
        const fiEntry = result.find((e) => e.code === 'fi');

        expect(enEntry).toEqual({ code: 'en', tag: 'en' });
        expect(fiEntry).toEqual({ code: 'fi', tag: 'fi' });
    });

    it('returns correct count (total minus 7 excluded)', () => {
        const result = getHreflangLanguages(allCodes);
        expect(result).toHaveLength(allCodes.length - 7);
    });

    it('does not produce duplicate tags', () => {
        const result = getHreflangLanguages(allCodes);
        const tags = result.map((e) => e.tag);
        const unique = new Set(tags);
        expect(unique.size).toBe(tags.length);
    });
});

describe('buildHreflangXml', () => {
    const langs = [
        { code: 'en', tag: 'en' },
        { code: 'fi', tag: 'fi' },
        { code: 'ckb', tag: 'ku' },
    ];

    it('generates xhtml:link elements for each language', () => {
        const lines = buildHreflangXml(langs, '');
        // 3 languages + 1 x-default = 4 lines
        expect(lines).toHaveLength(4);
    });

    it('uses remapped tag in hreflang attribute but internal code in href', () => {
        const lines = buildHreflangXml(langs, '');
        const ckbLine = lines.find((l) => l.includes('hreflang="ku"'));

        expect(ckbLine).toBeDefined();
        expect(ckbLine).toContain('href="https://wordle.global/ckb"');
    });

    it('x-default points to homepage for root language pages', () => {
        const lines = buildHreflangXml(langs, '');
        const xDefault = lines.find((l) => l.includes('x-default'));

        expect(xDefault).toBeDefined();
        expect(xDefault).toContain('href="https://wordle.global/"');
    });

    it('x-default points to English version for sub-pages', () => {
        const lines = buildHreflangXml(langs, '/unlimited');
        const xDefault = lines.find((l) => l.includes('x-default'));

        expect(xDefault).toBeDefined();
        expect(xDefault).toContain('href="https://wordle.global/en/unlimited"');
    });

    it('appends path suffix correctly', () => {
        const lines = buildHreflangXml(langs, '/best-starting-words');
        const fiLine = lines.find((l) => l.includes('hreflang="fi"'));

        expect(fiLine).toContain('href="https://wordle.global/fi/best-starting-words"');
    });

    it('generates valid XML', () => {
        const lines = buildHreflangXml(langs, '');
        for (const line of lines) {
            expect(line).toMatch(
                /^\s*<xhtml:link rel="alternate" hreflang="[a-z-]+" href="https:\/\/wordle\.global\/[^"]*"\/>$/
            );
        }
    });
});
