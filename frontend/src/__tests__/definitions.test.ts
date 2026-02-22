import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDefinition } from '../definitions';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
    mockFetch.mockReset();
});

describe('fetchDefinition', () => {
    it('fetches definition from backend API', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    definition: 'A large bird.',
                    part_of_speech: 'Noun',
                    source: 'english',
                    url: 'https://en.wiktionary.org/wiki/crane',
                }),
        });

        const result = await fetchDefinition('crane', 'en');
        expect(result.source).toBe('english');
        expect(result.definition).toBe('A large bird.');
        expect(result.partOfSpeech).toBe('Noun');
        expect(result.word).toBe('crane');

        // Should call our backend API
        const url = mockFetch.mock.calls[0]?.[0] as string;
        expect(url).toBe('/en/api/definition/crane');
    });

    it('returns native source when backend provides it', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    definition: 'Ein großer Vogel.',
                    source: 'native',
                    url: 'https://de.wiktionary.org/wiki/Kran',
                }),
        });

        const result = await fetchDefinition('krane', 'de');
        expect(result.source).toBe('native');
        expect(result.definition).toBe('Ein großer Vogel.');
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns link fallback when API returns 404', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

        const result = await fetchDefinition('xyz', 'de');
        expect(result.source).toBe('link');
        expect(result.definition).toBe('');
        expect(result.url).toContain('en.wiktionary.org');
    });

    it('handles network errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await fetchDefinition('test', 'de');
        expect(result.source).toBe('link');
    });

    it('calls correct API URL for different languages', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    definition: 'En fugl.',
                    source: 'native',
                    url: 'https://no.wiktionary.org/wiki/fugle',
                }),
        });

        await fetchDefinition('fugle', 'nb');
        const url = mockFetch.mock.calls[0]?.[0] as string;
        // Frontend calls our API with the original lang code — backend handles mapping
        expect(url).toBe('/nb/api/definition/fugle');
    });

    it('maps part_of_speech from backend response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    definition: 'To operate a crane.',
                    part_of_speech: 'Verb',
                    source: 'english',
                    url: 'https://en.wiktionary.org/wiki/crane',
                }),
        });

        const result = await fetchDefinition('crane', 'en');
        expect(result.partOfSpeech).toBe('Verb');
    });
});
