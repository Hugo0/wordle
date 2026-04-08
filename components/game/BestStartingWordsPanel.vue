<!--
    Compact ranked list of best starting words, embedded in the below-game SEO
    section. Links to the full /[lang]/best-starting-words strategy page.

    `lazy: true` — the panel is below-the-fold on the main game page, so it
    must not block SSR TTFB. Nuxt will render an empty slot on the server and
    hydrate the data after mount. The full strategy page uses the same URL so
    useFetch dedupes automatically.
-->
<script setup lang="ts">
import { interpolate } from '~/utils/interpolate';
import type { LanguagePageMeta } from '~/utils/types';

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
    lang_name_native?: string;
    meta?: { best_starting_words?: LanguagePageMeta };
}>(`/api/${props.lang}/starting-words`, { lazy: true });

const topWords = computed<TopWord[]>(() => (data.value?.top_words || []).slice(0, 5));

// Localized panel copy. The server merges per-language meta over
// data/default_language_config.json, so panel_* keys are always populated
// when topWords renders (the v-if guards against the no-data case).
const copy = computed(() => {
    const d = data.value;
    if (!d) return { heading: '', subtitle: '', linkText: '' };
    const m = d.meta?.best_starting_words ?? {};
    const vars = {
        langNative: d.lang_name_native || props.langName,
        count: (d.daily_word_count ?? 0).toLocaleString(),
    };
    return {
        heading: interpolate(m.panel_heading ?? '', vars),
        subtitle: interpolate(m.panel_subtitle ?? '', vars),
        linkText: m.panel_link ?? '',
    };
});
</script>

<template>
    <section v-if="topWords.length" id="best-starting-words" class="space-y-5">
        <h3 class="heading-section text-xl text-ink text-center">{{ copy.heading }}</h3>
        <p class="text-xs text-muted leading-relaxed max-w-lg mx-auto text-center">
            {{ copy.subtitle }}
        </p>
        <SharedStartingWordsList :words="topWords" compact />
        <p class="text-center">
            <a
                :href="`/${lang}/best-starting-words`"
                class="text-sm text-muted underline hover:text-ink transition-colors"
            >
                {{ copy.linkText }}
            </a>
        </p>
    </section>
</template>
