<script setup lang="ts">
definePageMeta({ layout: 'default' });

const route = useRoute();
const lang = route.params.lang as string;
const dayIdx = parseInt(route.params.id as string, 10);

const { data: gameData, error: gameError } = await useFetch(`/api/${lang}/data`);
if (gameError.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

useSeoMeta({
    title: `Word #${dayIdx} — ${gameData.value?.config?.name || lang} Wordle`,
    description: `Details for word #${dayIdx} in ${gameData.value?.config?.name || lang} Wordle.`,
});
</script>

<template>
    <div class="max-w-2xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-4">
            {{ gameData?.config?.name || lang }} — Word #{{ dayIdx }}
        </h1>
        <p class="text-neutral-500">Word detail page — Phase 4</p>
        <NuxtLink :to="`/${lang}/words`" class="text-green-600 hover:underline mt-4 inline-block">
            ← All words
        </NuxtLink>
    </div>
</template>
