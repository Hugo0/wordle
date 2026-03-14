<script setup lang="ts">
definePageMeta({ layout: 'default' });

const route = useRoute();
const lang = route.params.lang as string;

const { data: gameData, error } = await useFetch(`/api/${lang}/data`);
if (error.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

useSeoMeta({
    title: `${gameData.value?.config?.name || lang} Wordle — All Words`,
    description: `Browse all past daily words for ${gameData.value?.config?.name || lang} Wordle.`,
});
</script>

<template>
    <div class="max-w-4xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-4">
            {{ gameData?.config?.name || lang }} — Words Archive
        </h1>
        <p class="text-neutral-500">Words archive page — Phase 4</p>
        <NuxtLink :to="`/${lang}`" class="text-green-600 hover:underline mt-4 inline-block">
            ← Back to game
        </NuxtLink>
    </div>
</template>
