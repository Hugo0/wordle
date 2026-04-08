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
const dailyCount = computed(() => data.value?.daily_word_count ?? 0);

// Pull localized panel copy from the API response (falls back to defaults
// from data/default_language_config.json which always provides English).
const langNative = computed(() => data.value?.lang_name_native || props.langName);
const bswMeta = computed<LanguagePageMeta>(() => data.value?.meta?.best_starting_words || {});
const interpVars = computed(() => ({
    langNative: langNative.value,
    count: dailyCount.value.toLocaleString(),
}));

const heading = computed(() =>
    interpolate(
        bswMeta.value.panel_heading || 'Best Starting Words — {langNative}',
        interpVars.value
    )
);
const subtitle = computed(() =>
    interpolate(
        bswMeta.value.panel_subtitle ||
            'Ranked from the actual {count}-word {langNative} list by letter coverage — not generic English advice.',
        interpVars.value
    )
);
const linkText = computed(
    () => bswMeta.value.panel_link || 'See the full ranking & letter frequency analysis →'
);
</script>

<template>
    <section v-if="topWords.length" id="best-starting-words" class="space-y-5">
        <h3 class="heading-section text-xl text-ink text-center">{{ heading }}</h3>
        <p class="text-xs text-muted leading-relaxed max-w-lg mx-auto text-center">
            {{ subtitle }}
        </p>
        <SharedStartingWordsList :words="topWords" compact />
        <p class="text-center">
            <a
                :href="`/${lang}/best-starting-words`"
                class="text-sm text-muted underline hover:text-ink transition-colors"
            >
                {{ linkText }}
            </a>
        </p>
    </section>
</template>
