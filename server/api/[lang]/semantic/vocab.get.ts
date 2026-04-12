import { getValidWords } from '~/server/plugins/semantic-warmup';

// Cache the array form — Set never changes after startup
let _cachedArray: string[] | null = null;

export default defineEventHandler(() => {
    const words = getValidWords();
    if (!_cachedArray && words.size > 0) {
        _cachedArray = Array.from(words);
    }
    return {
        words: _cachedArray ?? [],
        count: words.size,
    };
});
