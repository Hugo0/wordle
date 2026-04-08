<!--
    Compact ranked list of best starting words, embedded in the below-game SEO
    section. Links to the full /[lang]/best-starting-words strategy page.

    `lazy: true` — the panel is below-the-fold on the main game page, so it
    must not block SSR TTFB. Nuxt will render an empty slot on the server and
    hydrate the data after mount. The full strategy page uses the same URL so
    useFetch dedupes automatically.
-->
<script setup lang="ts">
interface TopWord {
    word: string;
    coverageScore: number;
}

const props = defineProps<{
    lang: string;
    langName: string;
}>();

const { data } = await useFetch<{
    top_words: TopWord[];
    daily_word_count: number;
}>(`/api/${props.lang}/starting-words`, { lazy: true });

const topWords = computed<TopWord[]>(() => (data.value?.top_words || []).slice(0, 5));
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
        <SharedStartingWordsList :words="topWords" compact />
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
