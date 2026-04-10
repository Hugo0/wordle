import { loadSemanticDataSafe } from '~/server/utils/semantic';

export default defineEventHandler(() => {
    const data = loadSemanticDataSafe();
    return {
        words: data.vocabulary,
        count: data.vocabulary.length,
    };
});
