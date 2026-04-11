<!--
    LanguagePickerModal — modal for switching language without leaving the game.

    Opens from the sidebar's Language item. Shows a searchable grid of
    languages with flags. Selecting navigates to the same mode + play type
    in the new language.
-->

<template>
    <SharedBaseModal
        :visible="visible"
        size="lg"
        align="top"
        no-padding
        aria-label="Choose a language"
        @close="$emit('close')"
    >
        <div class="px-5 pt-5 pb-3">
            <h2 class="heading-section text-xl text-ink mb-3">Choose Language</h2>
            <input
                ref="searchRef"
                v-model="searchQuery"
                type="text"
                class="w-full px-4 py-2.5 border border-rule bg-transparent font-body text-sm text-ink outline-none transition-colors focus:border-ink"
                placeholder="Search languages..."
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
                No languages match "{{ searchQuery }}"
            </div>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useFlag } from '~/composables/useFlag';

const props = defineProps<{
    visible: boolean;
    currentLangCode: string;
    /** All available language codes */
    languageCodes: string[];
    /** Language name map: code → { name, nativeName } */
    languageNames?: Record<string, { name: string; nativeName?: string }>;
    /** Current mode route suffix (e.g., 'dordle', 'semantic', '') */
    currentModeSuffix?: string;
    /** Current play type query */
    currentPlayType?: string;
}>();

const emit = defineEmits<{ close: [] }>();

const searchRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');

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

const languages = computed(() =>
    props.languageCodes.map((code) => {
        const names = props.languageNames?.[code];
        return {
            code,
            name: names?.name || code,
            nativeName: names?.nativeName || names?.name || code,
            flagSrc: useFlag(code),
        };
    })
);

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
    const suffix = props.currentModeSuffix ? `/${props.currentModeSuffix}` : '';
    const playParam = props.currentPlayType === 'unlimited' ? '?play=unlimited' : '';
    navigateTo(`/${code}${suffix}${playParam}`);
}
</script>
