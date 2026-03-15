/**
 * Language Store
 *
 * Holds the current language's data: word list, config, keyboard layout,
 * normalization maps, and derived state. Populated via `init(data)` from
 * the API response when a game page loads.
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { buildNormalizeMap } from '~/utils/diacritics';
import { buildFinalFormReverseMap } from '~/utils/positional';
import type { LanguageConfig, GameData, KeyboardLayout } from '~/utils/types';

export const useLanguageStore = defineStore('language', () => {
    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    const config = ref<LanguageConfig | undefined>(undefined);
    const wordList = ref<string[]>([]);
    const characters = ref<string[]>([]);
    const todaysIdx = ref(0);
    const todaysWord = ref('');
    const timezoneOffset = ref(0);

    // Keyboard
    const keyboard = ref<string[][]>([]);
    const keyboardLayouts = ref<Record<string, KeyboardLayout>>({});
    const activeLayout = ref('');
    const keyDiacriticHints = ref<Record<string, { text: string; above: boolean }>>({});

    // Normalization maps
    const normalizeMap = ref(new Map<string, string>());
    const finalFormReverseMap = ref(new Map<string, string>());

    // -----------------------------------------------------------------------
    // Computed
    // -----------------------------------------------------------------------

    /** All valid characters joined into a single string for quick `.includes()` checks. */
    const acceptableCharacters = computed(() => characters.value.join(''));

    /** Whether the current language reads right-to-left. */
    const rightToLeft = computed(() => config.value?.right_to_left === 'true');

    /** Whether grapheme cluster counting is needed (e.g. Devanagari). */
    const graphemeMode = computed(() => config.value?.grapheme_mode === 'true');

    /** Language code shorthand. */
    const languageCode = computed(() => config.value?.language_code ?? '');

    /** Word list as Set for O(1) exact-match lookups. */
    const wordListSet = computed(() => new Set(wordList.value));

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------

    /**
     * Populate the store from the API response.
     *
     * Call this once when the game page mounts with the data fetched from
     * the `/api/game/:lang` endpoint (or equivalent SSR payload).
     */
    function init(data: GameData): void {
        config.value = data.config;
        wordList.value = data.word_list;
        characters.value = data.characters;
        todaysIdx.value = data.todays_idx;
        todaysWord.value = data.todays_word;
        timezoneOffset.value = data.timezone_offset;

        // Keyboard
        keyboard.value = data.keyboard;
        keyboardLayouts.value = data.keyboard_layouts;
        activeLayout.value = data.keyboard_layout_name;
        keyDiacriticHints.value = data.key_diacritic_hints;

        // Build normalization maps from config
        normalizeMap.value = buildNormalizeMap(data.config);
        finalFormReverseMap.value = buildFinalFormReverseMap(data.config);
    }

    /**
     * Switch the active keyboard layout by name.
     *
     * Updates `activeLayout` and the `keyboard` rows to match the
     * selected layout. No-ops if the layout name is not found.
     */
    function setKeyboardLayout(layoutName: string): void {
        const layout = keyboardLayouts.value[layoutName];
        if (!layout) return;
        activeLayout.value = layoutName;
        keyboard.value = layout.rows;
    }

    return {
        // State
        config,
        wordList,
        characters,
        todaysIdx,
        todaysWord,
        timezoneOffset,
        keyboard,
        keyboardLayouts,
        activeLayout,
        keyDiacriticHints,
        normalizeMap,
        finalFormReverseMap,

        // Computed
        acceptableCharacters,
        rightToLeft,
        graphemeMode,
        languageCode,
        wordListSet,

        // Actions
        init,
        setKeyboardLayout,
    };
});
