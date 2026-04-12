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

// Try to load UI strings for the language in the URL (e.g., /de/nonexistent → de)
const ui = ref<Record<string, string>>({});
const langFromUrl = computed(() => {
    const path = useRequestURL().pathname;
    const seg = path.split('/')[1];
    return seg && /^[a-z]{2,3}$/.test(seg) ? seg : null;
});

onMounted(async () => {
    try {
        const res = await fetch('/api/languages');
        const data = await res.json();
        languages.value = data.languages || {};
        languageCodes.value = data.language_codes || [];
    } catch {
        // API unavailable — show page without language picker
    }
    // Load translated UI strings for the detected language
    if (langFromUrl.value) {
        try {
            const res = await fetch(`/api/${langFromUrl.value}/data`);
            const data = await res.json();
            ui.value = data?.config?.ui || {};
        } catch {
            // Fall back to English defaults
        }
    }
});
</script>

<template>
    <div class="min-h-screen flex flex-col bg-paper">
        <!-- Error message — always vertically + horizontally centered -->
        <div class="flex-1 flex items-center justify-center px-4">
            <div class="text-center">
                <h1
                    class="font-display font-bold text-muted mb-2"
                    style="font-size: 72px; font-variation-settings: 'opsz' 144; line-height: 1"
                >
                    {{ error.statusCode }}
                </h1>
                <p class="text-lg text-muted mb-8">
                    {{
                        error.statusCode === 404
                            ? ui.error_404 || "This page doesn't exist."
                            : ui.error_500 || 'Something went wrong.'
                    }}
                </p>
                <NuxtLink
                    to="/"
                    class="inline-block py-3 px-8 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85"
                >
                    {{ ui.play_wordle || 'Play Wordle' }}
                </NuxtLink>
            </div>
        </div>

        <!-- Language picker — bottom section, separate from centering -->
        <div v-if="languageCodes.length" class="px-4 pb-10 pt-4">
            <div class="mono-label mb-4 text-center">
                {{ ui.or_pick_language || 'Or pick a language' }}
            </div>
            <div class="max-w-3xl mx-auto flex flex-wrap justify-center gap-2">
                <NuxtLink
                    v-for="lc in languageCodes"
                    :key="lc"
                    :to="`/${lc}`"
                    class="text-sm px-2.5 py-1 border border-rule text-ink hover:bg-paper-warm transition-colors"
                >
                    {{ languages[lc]?.language_name_native || lc }}
                </NuxtLink>
            </div>
        </div>
    </div>
</template>
