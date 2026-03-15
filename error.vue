<script setup lang="ts">
const props = defineProps<{
    error: {
        statusCode: number;
        message: string;
    };
}>();

useSeoMeta({
    title: `${props.error.statusCode} — Wordle Global`,
    robots: 'noindex, nofollow',
});

interface LangInfo {
    language_name_native: string;
    language_code: string;
}

const languages = ref<Record<string, LangInfo>>({});
const languageCodes = ref<string[]>([]);

onMounted(async () => {
    try {
        const res = await fetch('/api/languages');
        const data = await res.json();
        languages.value = data.languages || {};
        languageCodes.value = data.language_codes || [];
    } catch {
        // API unavailable — show page without language picker
    }
});
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900 px-4">
        <div class="text-center max-w-lg">
            <h1 class="text-6xl font-bold text-neutral-300 dark:text-neutral-600 mb-4">
                {{ error.statusCode }}
            </h1>
            <p class="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
                {{ error.message || "This page doesn't exist." }}
            </p>
            <NuxtLink
                to="/"
                class="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
                Play Wordle
            </NuxtLink>

            <div v-if="languageCodes.length" class="mt-10">
                <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                    Or pick a language:
                </p>
                <div class="flex flex-wrap justify-center gap-2">
                    <NuxtLink
                        v-for="lc in languageCodes"
                        :key="lc"
                        :to="`/${lc}`"
                        class="text-sm px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                    >
                        {{ languages[lc]?.language_name_native || lc }}
                    </NuxtLink>
                </div>
            </div>
        </div>
    </div>
</template>
