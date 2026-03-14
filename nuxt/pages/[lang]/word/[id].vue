<script setup lang="ts">
/**
 * Word Detail — /<lang>/word/<id>
 *
 * Shows a past daily word with definition, stats, and AI image.
 * The word is only revealed if the day has passed.
 */

const route = useRoute();
const lang = route.params.lang as string;
const dayIdx = parseInt(route.params.id as string, 10);

const { data: gameData, error: gameError } = await useFetch(`/api/${lang}/data`);
if (gameError.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const config = gameData.value.config;
const todaysIdx = gameData.value.todays_idx;
const isPastWord = dayIdx < todaysIdx;
const langName = config.name_native || config.name;

// TODO: fetch actual word for past days from a word-history API
// For now, we show the day number and whether it's past/current/future

const title = `Word #${dayIdx} — ${langName} Wordle`;
const description = `${langName} Wordle word #${dayIdx}. See the definition, community stats, and AI-generated art.`;

useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: `https://wordle.global/${lang}/word/${dayIdx}`,
});

useHead({
    link: [{ rel: 'canonical', href: `https://wordle.global/${lang}/word/${dayIdx}` }],
});

// Fetch definition if past word
const definition = ref<any>(null);
if (isPastWord && import.meta.client) {
    onMounted(async () => {
        try {
            // TODO: need word-history API to get the actual word for this day
            // definition.value = await $fetch(`/api/${lang}/definition/${word}`);
        } catch {
            // ignore
        }
    });
}
</script>

<template>
    <div class="min-h-[100dvh] bg-white dark:bg-neutral-900 text-black dark:text-white">
        <div class="max-w-2xl mx-auto px-4 py-8">
            <NuxtLink :to="`/${lang}/words`" class="text-green-600 hover:underline text-sm">
                ← All words
            </NuxtLink>

            <h1 class="text-2xl font-bold mt-4 mb-2">{{ langName }} — Word #{{ dayIdx }}</h1>

            <div v-if="dayIdx === todaysIdx" class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p class="font-bold text-green-700 dark:text-green-400">Today's word!</p>
                <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Play today's game to reveal this word.
                </p>
                <NuxtLink :to="`/${lang}`" class="inline-block mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">
                    Play now →
                </NuxtLink>
            </div>

            <div v-else-if="dayIdx > todaysIdx" class="mt-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <p class="text-neutral-500">This word hasn't been played yet.</p>
            </div>

            <div v-else class="mt-4">
                <!-- Past word — would show word, definition, stats, image -->
                <div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <p class="text-sm text-neutral-500">Word #{{ dayIdx }} — played in the past</p>
                    <!-- TODO: show actual word, definition, community stats once word-history API exists -->
                </div>
            </div>

            <!-- Navigation -->
            <div class="flex justify-between mt-8">
                <NuxtLink
                    v-if="dayIdx > 1"
                    :to="`/${lang}/word/${dayIdx - 1}`"
                    class="text-sm text-green-600 hover:underline"
                >
                    ← #{{ dayIdx - 1 }}
                </NuxtLink>
                <span v-else />
                <NuxtLink
                    v-if="dayIdx < todaysIdx"
                    :to="`/${lang}/word/${dayIdx + 1}`"
                    class="text-sm text-green-600 hover:underline"
                >
                    #{{ dayIdx + 1 }} →
                </NuxtLink>
            </div>
        </div>
    </div>
</template>
