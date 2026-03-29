<script setup lang="ts">
/**
 * Best Starting Words — /<lang>/best-starting-words
 *
 * Data-driven analysis of the best starting words for Wordle in each language.
 * Content is computed from actual word list letter frequencies — unique to wordle.global.
 */

definePageMeta({ layout: 'default' });

const route = useRoute();
const lang = route.params.lang as string;

const { data: pageData, error } = await useFetch(`/api/${lang}/starting-words`);
if (error.value || !pageData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const { data: gameData } = await useFetch(`/api/${lang}/data`);
const config = gameData.value?.config;
const langName = pageData.value.lang_name;
const langNative = pageData.value.lang_name_native;
const topWords = pageData.value.top_words;
const letterFreqs = pageData.value.letter_frequency;

// SEO
const title = `Best Starting Words for Wordle in ${langName} — Wordle Global`;
const description = `Data-driven analysis of the best starting words for Wordle in ${langName}. Ranked by letter coverage across ${pageData.value.daily_word_count.toLocaleString()} words.`;

useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: `https://wordle.global/${lang}/best-starting-words`,
    ogType: 'article',
    ogLocale: config?.meta?.locale || lang,
    twitterCard: 'summary',
    twitterTitle: title,
    twitterDescription: description,
});

useHead({
    htmlAttrs: {
        lang: config?.meta?.locale?.split('_')[0] || lang,
        dir: config?.right_to_left === 'true' ? 'rtl' : 'ltr',
    },
    link: [{ rel: 'canonical', href: `https://wordle.global/${lang}/best-starting-words` }],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: title,
                description,
                url: `https://wordle.global/${lang}/best-starting-words`,
                inLanguage: lang,
                publisher: {
                    '@type': 'Organization',
                    name: 'Wordle Global',
                    url: 'https://wordle.global',
                },
            }),
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Wordle Global',
                        item: 'https://wordle.global/',
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: `Wordle ${langNative}`,
                        item: `https://wordle.global/${lang}`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: 'Best Starting Words',
                        item: `https://wordle.global/${lang}/best-starting-words`,
                    },
                ],
            }),
        },
    ],
});

const { data: allLangs } = await useFetch('/api/languages');
if (allLangs.value?.language_codes) {
    useHreflang(allLangs.value.language_codes, '/best-starting-words');
}
</script>

<template>
    <div class="min-h-screen bg-paper text-ink">
        <div class="max-w-2xl mx-auto px-5 py-12 space-y-12">
            <!-- Header -->
            <header class="space-y-3">
                <NuxtLink
                    :to="`/${lang}`"
                    class="text-sm text-muted hover:text-ink transition-colors"
                >
                    &larr; Back to Wordle {{ langNative }}
                </NuxtLink>
                <span class="mono-label block mt-4">STRATEGY GUIDE</span>
                <h1 class="heading-display text-3xl sm:text-4xl text-ink">
                    Best Starting Words for Wordle in {{ langName }}
                </h1>
                <p class="text-muted text-base leading-relaxed">
                    Ranked by letter coverage across
                    {{ pageData!.daily_word_count.toLocaleString() }} daily-tier words. Words with
                    all unique letters that test the most common letters in {{ langName }} Wordle.
                </p>
            </header>

            <div class="editorial-rule" />

            <!-- Top 10 Words -->
            <section class="space-y-5">
                <h2 class="heading-section text-xl text-ink">
                    Top {{ Math.min(topWords.length, 10) }} Starting Words
                </h2>
                <div class="border border-rule divide-y divide-rule">
                    <div
                        v-for="(w, i) in topWords.slice(0, 10)"
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
                            <div class="text-sm font-semibold text-ink">
                                {{ w.coverageScore }}
                            </div>
                            <div class="mono-label">Coverage</div>
                        </div>
                    </div>
                </div>
                <p class="text-xs text-muted leading-relaxed">
                    Coverage score = sum of letter frequency percentages for each unique letter.
                    Higher means the word tests more commonly-used letters in {{ langName }} Wordle.
                </p>
            </section>

            <div class="editorial-rule" />

            <!-- Letter Frequency -->
            <section class="space-y-5">
                <h2 class="heading-section text-xl text-ink">
                    Most Common Letters in {{ langName }} Wordle
                </h2>
                <div class="space-y-2 max-w-md">
                    <div
                        v-for="freq in letterFreqs"
                        :key="freq.letter"
                        class="flex items-center gap-3"
                    >
                        <span
                            class="w-8 h-8 inline-flex items-center justify-center font-display font-bold text-base uppercase border border-rule bg-paper-warm flex-shrink-0"
                        >
                            {{ freq.letter }}
                        </span>
                        <div class="flex-1 h-4 bg-muted-soft rounded-sm overflow-hidden">
                            <div
                                class="h-full bg-correct rounded-sm transition-all"
                                :style="{ width: `${freq.percentage}%` }"
                            />
                        </div>
                        <span class="mono-label-md w-10 text-right">{{ freq.percentage }}%</span>
                    </div>
                </div>
                <p class="text-xs text-muted leading-relaxed">
                    Percentage of {{ langName }} Wordle words containing each letter (counting each
                    letter once per word).
                </p>
            </section>

            <div class="editorial-rule" />

            <!-- Strategy explanation -->
            <section class="space-y-4">
                <h2 class="heading-section text-xl text-ink">Why These Words?</h2>
                <div class="text-sm text-muted leading-relaxed space-y-3">
                    <p>
                        A good Wordle starting word maximizes the information you get from your
                        first guess. The ideal word has:
                    </p>
                    <ol class="list-decimal list-inside space-y-2 pl-2">
                        <li>
                            <strong class="text-ink">All unique letters</strong> — no repeats, so
                            each tile gives you new information.
                        </li>
                        <li>
                            <strong class="text-ink">High-frequency letters</strong> — letters that
                            appear in the most words, so you're likely to get greens and yellows.
                        </li>
                        <li>
                            <strong class="text-ink">Familiarity</strong> — a word you can remember
                            and type quickly, especially in Speed Streak mode.
                        </li>
                    </ol>
                    <p>
                        These rankings are computed from the actual
                        {{ pageData!.daily_word_count.toLocaleString() }} daily-tier words in the
                        {{ langName }} word list — not generic English advice.
                        {{
                            langName !== 'English'
                                ? `Letter frequencies vary significantly between languages, so starting words that work for English may not be optimal for ${langName}.`
                                : ''
                        }}
                    </p>
                </div>
            </section>

            <div class="editorial-rule" />

            <!-- More words (11-20) -->
            <section v-if="topWords.length > 10" class="space-y-5">
                <h2 class="heading-section text-xl text-ink">Honorable Mentions</h2>
                <div class="flex flex-wrap gap-2">
                    <span
                        v-for="w in topWords.slice(10)"
                        :key="w.word"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule text-sm font-display font-bold uppercase bg-paper-warm"
                    >
                        {{ w.word }}
                        <span class="text-xs text-muted font-body font-normal">{{
                            w.coverageScore
                        }}</span>
                    </span>
                </div>
            </section>

            <div class="editorial-rule" />

            <!-- Navigation -->
            <footer class="space-y-4 text-center">
                <div class="flex flex-wrap justify-center gap-4">
                    <NuxtLink
                        :to="`/${lang}`"
                        class="text-sm text-muted underline hover:text-ink transition-colors"
                    >
                        Play Daily Wordle in {{ langName }}
                    </NuxtLink>
                    <NuxtLink
                        :to="`/${lang}/unlimited`"
                        class="text-sm text-muted underline hover:text-ink transition-colors"
                    >
                        Practice in Unlimited Mode
                    </NuxtLink>
                </div>
                <p class="mono-label pt-4">
                    <a href="https://wordle.global/" class="hover:text-ink transition-colors"
                        >wordle.global</a
                    >
                    — the free daily word game in 80+ languages
                </p>
            </footer>
        </div>
    </div>
</template>
