import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDefinition } from '../definitions';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
    mockFetch.mockReset();
});

describe('fetchDefinition', () => {
    it('returns English Wiktionary definition for English words', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    English: [
                        {
                            partOfSpeech: 'Noun',
                            definitions: [{ definition: 'A large container.' }],
                        },
                    ],
                }),
        });

        const result = await fetchDefinition('crane', 'en');
        expect(result.source).toBe('english');
        expect(result.definition).toBe('A large container.');
        expect(result.partOfSpeech).toBe('Noun');
        expect(result.word).toBe('crane');
        expect(result.url).toContain('en.wiktionary.org');
    });

    it('tries native Wiktionary first for non-English languages', async () => {
        // First call: native Wiktionary succeeds
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    query: {
                        pages: {
                            '123': {
                                extract: 'Ein großer Vogel.',
                            },
                        },
                    },
                }),
        });

        const result = await fetchDefinition('krane', 'de');
        expect(result.source).toBe('native');
        expect(result.definition).toBe('Ein großer Vogel.');
        expect(result.url).toContain('de.wiktionary.org');
        // Should only have called native, not English
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to English Wiktionary when native fails', async () => {
        // Native Wiktionary returns no page
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    query: {
                        pages: {
                            '-1': { missing: '' },
                        },
                    },
                }),
        });

        // English Wiktionary succeeds
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    German: [
                        {
                            partOfSpeech: 'Noun',
                            definitions: [{ definition: 'A crane.' }],
                        },
                    ],
                }),
        });

        const result = await fetchDefinition('krane', 'de');
        expect(result.source).toBe('english');
        expect(result.definition).toBe('A crane.');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns link fallback when both sources fail', async () => {
        // Native fails
        mockFetch.mockResolvedValueOnce({ ok: false });
        // English fails
        mockFetch.mockResolvedValueOnce({ ok: false });

        const result = await fetchDefinition('xyz', 'de');
        expect(result.source).toBe('link');
        expect(result.definition).toBe('');
        expect(result.url).toContain('en.wiktionary.org');
    });

    it('handles network errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await fetchDefinition('test', 'de');
        expect(result.source).toBe('link');
    });

    it('maps Norwegian Bokmål to Norwegian Wiktionary', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    query: {
                        pages: {
                            '456': {
                                extract: 'En fugl.',
                            },
                        },
                    },
                }),
        });

        const result = await fetchDefinition('fugle', 'nb');
        expect(result.source).toBe('native');
        // Should use 'no' wiktionary, not 'nb'
        const url = mockFetch.mock.calls[0][0] as string;
        expect(url).toContain('no.wiktionary.org');
    });

    it('strips HTML from English Wiktionary definitions', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    English: [
                        {
                            partOfSpeech: 'Noun',
                            definitions: [
                                {
                                    definition:
                                        'A <a href="/wiki/large">large</a> <b>container</b>.',
                                },
                            ],
                        },
                    ],
                }),
        });

        const result = await fetchDefinition('crane', 'en');
        expect(result.definition).toBe('A large container.');
    });
});
