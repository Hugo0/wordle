<!--
    Compact ranked list of the best starting words for a given language.

    Rendered inside the below-game SEO section (classic mode) and linked to the
    full /[lang]/best-starting-words analysis page. Data comes from the same
    cached /api/[lang]/starting-words endpoint used by the full page.
-->
<script setup lang="ts">
interface TopWord {
    word: string;
    coverageScore: number;
}

const props = defineProps<{
    lang: string;
    langName: string;
    /** How many ranked words to show inline. Defaults to 5 for the SEO panel. */
    limit?: number;
}>();

const limit = computed(() => props.limit ?? 5);

const { data } = await useFetch<{
    top_words: TopWord[];
    daily_word_count: number;
}>(`/api/${props.lang}/starting-words`, {
    // Share the cache with the full /best-starting-words page
    key: `starting-words-${props.lang}`,
});

const topWords = computed<TopWord[]>(() => (data.value?.top_words || []).slice(0, limit.value));
const dailyCount = computed(() => data.value?.daily_word_count ?? 0);
</script>

<template>
    <section v-if="topWords.length" id="best-starting-words" class="space-y-5">
        <h3 class="heading-section text-xl text-ink text-center">
            Best Starting Words &mdash; {{ langName }}
        </h3>
        <p class="text-xs text-muted leading-relaxed max-w-lg mx-auto text-center">
            Ranked from the actual {{ dailyCount.toLocaleString() }}-word {{ langName }} list by
            letter coverage &mdash; not generic English advice.
        </p>
        <div class="border border-rule divide-y divide-rule max-w-md mx-auto">
            <div
                v-for="(w, i) in topWords"
                :key="w.word"
                class="flex items-center gap-4 px-5 py-3"
                :class="i < 3 ? 'bg-paper-warm' : ''"
            >
                <span
                    class="w-7 h-7 flex items-center justify-center border border-rule font-display font-bold text-sm text-ink flex-shrink-0"
                    :class="i < 3 ? 'bg-paper' : 'bg-paper-warm'"
                >
                    {{ i + 1 }}
                </span>
                <div class="flex-1 min-w-0">
                    <div class="grid grid-cols-5 gap-1 max-w-[180px]">
                        <div
                            v-for="(c, j) in w.word.split('')"
                            :key="j"
                            class="tile aspect-square inline-flex justify-center items-center text-sm uppercase font-display font-bold select-none filled"
                        >
                            {{ c }}
                        </div>
                    </div>
                </div>
                <div class="text-right flex-shrink-0">
                    <div class="text-sm font-semibold text-ink tabular-nums">
                        {{ w.coverageScore }}
                    </div>
                    <div class="mono-label">Coverage</div>
                </div>
            </div>
        </div>
        <p class="text-center">
            <a
                :href="`/${lang}/best-starting-words`"
                class="text-sm text-muted underline hover:text-ink transition-colors"
            >
                See the full ranking &amp; letter frequency analysis &rarr;
            </a>
        </p>
    </section>
</template>
