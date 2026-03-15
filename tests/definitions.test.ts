/**
 * Unit tests for definition fetching
 *
 * The Nuxt version uses $fetch (via the useDefinitions composable) instead of
 * raw fetch. For unit testing we mock $fetch globally and test the composable's
 * fetchDefinition function directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock $fetch globally (Nuxt's fetch wrapper)
const mock$fetch = vi.fn();
vi.stubGlobal('$fetch', mock$fetch);

// Import after mocking so the composable picks up the stubbed $fetch
import { useDefinitions } from '../composables/useDefinitions';

const { fetchDefinition } = useDefinitions();

beforeEach(() => {
    mock$fetch.mockReset();
});

describe('fetchDefinition', () => {
    it('fetches definition from backend API', async () => {
        mock$fetch.mockResolvedValueOnce({
            definition: 'A large bird.',
            part_of_speech: 'Noun',
            source: 'english',
            url: 'https://en.wiktionary.org/wiki/crane',
        });

        const result = await fetchDefinition('crane', 'en');
        expect(result.source).toBe('english');
        expect(result.definition).toBe('A large bird.');
        expect(result.partOfSpeech).toBe('Noun');
        expect(result.word).toBe('crane');

        // Should call our backend API
        const url = mock$fetch.mock.calls[0]?.[0] as string;
        expect(url).toBe('/api/en/definition/crane');
    });

    it('returns native source when backend provides it', async () => {
        mock$fetch.mockResolvedValueOnce({
            definition: 'Ein großer Vogel.',
            source: 'native',
            url: 'https://de.wiktionary.org/wiki/Kran',
        });

        const result = await fetchDefinition('krane', 'de');
        expect(result.source).toBe('native');
        expect(result.definition).toBe('Ein großer Vogel.');
        expect(mock$fetch).toHaveBeenCalledTimes(1);
    });

    it('returns link fallback when API returns error', async () => {
        mock$fetch.mockRejectedValueOnce(new Error('404'));

        const result = await fetchDefinition('xyz', 'de');
        expect(result.source).toBe('link');
        expect(result.definition).toBe('');
        expect(result.url).toContain('en.wiktionary.org');
    });

    it('handles network errors gracefully', async () => {
        mock$fetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await fetchDefinition('test', 'de');
        expect(result.source).toBe('link');
    });

    it('calls correct API URL for different languages', async () => {
        mock$fetch.mockResolvedValueOnce({
            definition: 'En fugl.',
            source: 'native',
            url: 'https://no.wiktionary.org/wiki/fugle',
        });

        await fetchDefinition('fugle', 'nb');
        const url = mock$fetch.mock.calls[0]?.[0] as string;
        expect(url).toBe('/api/nb/definition/fugle');
    });

    it('maps part_of_speech from backend response', async () => {
        mock$fetch.mockResolvedValueOnce({
            definition: 'To operate a crane.',
            part_of_speech: 'Verb',
            source: 'english',
            url: 'https://en.wiktionary.org/wiki/crane',
        });

        const result = await fetchDefinition('crane', 'en');
        expect(result.partOfSpeech).toBe('Verb');
    });
});
