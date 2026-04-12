<!--
    LanguagePickerModal — modal for switching language without leaving the game.

    Opens from the sidebar's Language item. Shows a searchable grid of
    languages with flags. Selecting navigates to the same mode + play type
    in the new language.
-->

<template>
    <BaseModal
        :visible="visible"
        size="lg"
        align="top"
        no-padding
        :aria-label="ui?.choose_language || 'Choose a language'"
        @close="$emit('close')"
    >
        <div class="px-5 pt-5 pb-3">
            <h2 class="heading-section text-xl text-ink mb-3">{{ ui?.choose_language || 'Choose Language' }}</h2>
            <input
                ref="searchRef"
                v-model="searchQuery"
                type="text"
                class="w-full px-4 py-2.5 border border-rule bg-transparent font-body text-sm text-ink outline-none transition-colors focus:border-ink"
                :placeholder="ui?.search_languages || 'Search languages...'"
                autocomplete="off"
            />
        </div>
        <div class="px-2 pb-4 max-h-[60vh] overflow-y-auto editorial-scroll">
            <button
                v-for="lang in filteredLanguages"
                :key="lang.code"
                class="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-paper-warm"
                :class="{ 'bg-paper-warm font-semibold': lang.code === currentLangCode }"
                @click="selectLanguage(lang.code)"
            >
                <img
                    v-if="lang.flagSrc"
                    :src="lang.flagSrc"
                    :alt="lang.name"
                    class="flag-icon flag-icon-sm"
                />
                <span class="flex-1 text-sm text-ink">{{ lang.nativeName || lang.name }}</span>
                <span class="text-xs text-muted">{{ lang.name }}</span>
                <span v-if="lang.code === currentLangCode" class="text-correct text-xs"
                    >&#10003;</span
                >
            </button>
            <div v-if="filteredLanguages.length === 0" class="text-center py-6 text-sm text-muted">
                {{ ui?.no_languages_match || 'No languages match' }} "{{ searchQuery }}"
            </div>
        </div>
    </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useFlag } from '~/composables/useFlag';

const props = withDefaults(
    defineProps<{
        visible: boolean;
        currentLangCode: string;
        /** Current mode route suffix (e.g., 'dordle', 'semantic', ''). Used to try same mode in new language. */
        currentModeSuffix?: string;
    }>(),
    { currentModeSuffix: '' }
);

const emit = defineEmits<{ close: [] }>();

const langStore = useLanguageStore();
const ui = computed(() => langStore.config?.ui);

const searchRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');

// Fetch language data once (cached by Nuxt)
const { data: langData } = useFetch('/api/languages', { key: 'languages-picker' });

// Auto-focus search on open
watch(
    () => props.visible,
    async (show) => {
        if (show) {
            searchQuery.value = '';
            await nextTick();
            searchRef.value?.focus();
        }
    }
);

const languages = computed(() => {
    const codes = langData.value?.language_codes ?? [];
    const names = langData.value?.languages ?? {};
    return codes.map((code: string) => {
        const info = names[code];
        return {
            code,
            name: info?.language_name || code,
            nativeName: info?.language_name_native || info?.language_name || code,
            flagSrc: useFlag(code),
        };
    });
});

const filteredLanguages = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    if (!q) return languages.value;
    return languages.value.filter(
        (l) =>
            l.name.toLowerCase().includes(q) ||
            l.nativeName.toLowerCase().includes(q) ||
            l.code.includes(q)
    );
});

function selectLanguage(code: string) {
    emit('close');
    // Try to stay in the same game mode in the new language.
    // Modes that are language-restricted (e.g., semantic = English-only)
    // have server-side redirects that will send the user to the right place.
    if (props.currentModeSuffix) {
        navigateTo(`/${code}/${props.currentModeSuffix}`);
    } else {
        navigateTo(`/${code}`);
    }
}
</script>
