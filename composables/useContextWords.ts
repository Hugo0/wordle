/**
 * useContextWords — URL-driven state for the word page's context set.
 *
 * The "context" is the neighborhood of words displayed alongside the
 * primary word on /[lang]/word/[slug]. By default it's auto-populated
 * from the primary word's nearest semantic neighbors; the user can edit
 * it via `?context=a,b,c` and the state round-trips through the URL.
 *
 * When `?context=` is absent, `userWords` is empty — callers should fall
 * back to the auto-selected neighbors. When present, the user's explicit
 * set wins.
 */

import { computed } from 'vue';

export const CONTEXT_MAX_TOTAL = 20;

export function useContextWords(baseWord: () => string) {
    const route = useRoute();
    const router = useRouter();

    const userWords = computed<string[]>(() => {
        const raw = route.query.context;
        if (!raw || typeof raw !== 'string') return [];
        return raw
            .split(',')
            .map((w) => w.trim().toLowerCase())
            .filter((w) => w.length > 0 && w !== baseWord().toLowerCase())
            .slice(0, CONTEXT_MAX_TOTAL - 1);
    });

    const isCustom = computed(() => userWords.value.length > 0);
    const isFull = computed(() => userWords.value.length >= CONTEXT_MAX_TOTAL - 1);

    function writeQuery(next: string[]) {
        const cleaned = next.filter(
            (w) => w.length > 0 && w !== baseWord().toLowerCase()
        );
        const newQuery = { ...route.query };
        if (cleaned.length === 0) delete newQuery.context;
        else newQuery.context = cleaned.join(',');
        router.replace({ query: newQuery });
    }

    function addWord(w: string) {
        const normalized = w.trim().toLowerCase();
        if (!normalized || normalized === baseWord().toLowerCase()) return;
        if (userWords.value.includes(normalized) || isFull.value) return;
        writeQuery([...userWords.value, normalized]);
    }

    function removeWord(w: string) {
        writeQuery(userWords.value.filter((x) => x !== w));
    }

    function resetToAuto() {
        writeQuery([]);
    }

    /** Write an arbitrary list of words to the URL — used by the page to
     *  seed the context from auto-selected neighbors when the user first
     *  interacts, so the interaction doesn't visually "reset" the map. */
    function setWords(words: string[]) {
        writeQuery(words);
    }

    return {
        userWords,
        isCustom,
        isFull,
        addWord,
        removeWord,
        resetToAuto,
        setWords,
    };
}
