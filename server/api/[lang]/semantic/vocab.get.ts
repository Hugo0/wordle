import { loadSemanticData } from '~/server/utils/semantic';

export default defineEventHandler(() => {
    const data = loadSemanticData();
    return {
        words: data.vocabulary,
        count: data.vocabulary.length,
    };
});
