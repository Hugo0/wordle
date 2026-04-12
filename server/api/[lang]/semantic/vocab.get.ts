import { getValidWords } from '~/server/plugins/semantic-warmup';

export default defineEventHandler(() => {
    const words = getValidWords();
    return {
        words: Array.from(words),
        count: words.size,
    };
});
