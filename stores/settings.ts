/**
 * Settings Store
 *
 * Manages user preferences: dark mode, feedback (haptics/sound),
 * word info, hard mode, and high contrast / colorblind mode.
 *
 * SSR-safe: all localStorage and document access is guarded
 * behind `import.meta.client`.
 */
import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { readLocal, writeLocal } from '~/utils/storage';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSettingsStore = defineStore('settings', () => {
    // ---- State ----

    const darkMode = ref(false);
    const feedbackEnabled = ref(true);
    const wordInfoEnabled = ref(true);
    const hardMode = ref(false);
    const highContrast = ref(false);

    const difficultyShake = ref(false);
    const difficultyWarning = ref('');
    const difficultyLevel = computed(() => {
        if (hardMode.value) return 2;
        // allowAnyWord would be 0, but it's managed in game store
        return 1; // normal
    });

    // ---- Initialisation (client-only) ----

    function init(): void {
        if (!import.meta.client) return;

        // Dark mode: initial value comes from the class that the server or
        // color-scheme script already placed on <html>.
        darkMode.value = document.documentElement.classList.contains('dark');

        // Feedback
        const storedFeedback = readLocal('feedbackEnabled');
        if (storedFeedback !== null) {
            feedbackEnabled.value = storedFeedback === 'true';
        }

        if (import.meta.client) {
            const { setHapticsEnabled } = useHaptics();
            const { setSoundEnabled } = useSounds();
            setHapticsEnabled(feedbackEnabled.value);
            setSoundEnabled(feedbackEnabled.value);
        }

        // Word info
        const storedWordInfo = readLocal('wordInfoEnabled');
        if (storedWordInfo !== null) {
            wordInfoEnabled.value = storedWordInfo !== 'false';
        }

        // Hard mode
        const storedHard = readLocal('hardMode');
        if (storedHard !== null) {
            hardMode.value = storedHard === 'true';
        }

        // High contrast / colorblind
        const storedContrast = readLocal('highContrast');
        if (storedContrast === 'true') {
            highContrast.value = true;
            document.documentElement.classList.add('high-contrast');
        }
    }

    // ---- Watchers (client-only syncing to the DOM) ----

    if (import.meta.client) {
        watch(darkMode, (isDark) => {
            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        });

        watch(highContrast, (isHigh) => {
            if (isHigh) {
                document.documentElement.classList.add('high-contrast');
            } else {
                document.documentElement.classList.remove('high-contrast');
            }
        });
    }

    // ---- Analytics ----

    const analytics = useAnalytics();

    // ---- Toggle / persistence methods ----

    function toggleDarkMode(): void {
        darkMode.value = !darkMode.value;
        writeLocal('darkMode', darkMode.value ? 'true' : 'false');
        analytics.trackSettingsChange({ setting: 'dark_mode', value: darkMode.value });
    }

    function setDarkMode(value: boolean): void {
        darkMode.value = value;
        writeLocal('darkMode', value ? 'true' : 'false');
    }

    function toggleFeedback(): void {
        feedbackEnabled.value = !feedbackEnabled.value;
        writeLocal('feedbackEnabled', feedbackEnabled.value ? 'true' : 'false');
        if (import.meta.client) {
            const { setHapticsEnabled } = useHaptics();
            const { setSoundEnabled } = useSounds();
            setHapticsEnabled(feedbackEnabled.value);
            setSoundEnabled(feedbackEnabled.value);
        }
        analytics.trackSettingsChange({ setting: 'feedback', value: feedbackEnabled.value });
    }

    function setFeedbackEnabled(value: boolean): void {
        feedbackEnabled.value = value;
        writeLocal('feedbackEnabled', value ? 'true' : 'false');
    }

    function toggleWordInfo(): void {
        wordInfoEnabled.value = !wordInfoEnabled.value;
        writeLocal('wordInfoEnabled', wordInfoEnabled.value ? 'true' : 'false');
        analytics.trackSettingsChange({ setting: 'word_info', value: wordInfoEnabled.value });
    }

    function setWordInfoEnabled(value: boolean): void {
        wordInfoEnabled.value = value;
        writeLocal('wordInfoEnabled', value ? 'true' : 'false');
    }

    function toggleHardMode(): void {
        hardMode.value = !hardMode.value;
        writeLocal('hardMode', hardMode.value ? 'true' : 'false');
        analytics.trackSettingsChange({ setting: 'hard_mode', value: hardMode.value });
    }

    function setHardMode(value: boolean): void {
        hardMode.value = value;
        writeLocal('hardMode', value ? 'true' : 'false');
    }

    function toggleHighContrast(): void {
        highContrast.value = !highContrast.value;
        writeLocal('highContrast', highContrast.value ? 'true' : 'false');
        analytics.trackSettingsChange({ setting: 'high_contrast', value: highContrast.value });
    }

    function setHighContrast(value: boolean): void {
        highContrast.value = value;
        writeLocal('highContrast', value ? 'true' : 'false');
    }

    return {
        // State
        darkMode,
        feedbackEnabled,
        wordInfoEnabled,
        hardMode,
        highContrast,
        difficultyShake,
        difficultyWarning,
        difficultyLevel,

        // Init
        init,

        // Toggles (flip current value and persist)
        toggleDarkMode,
        toggleFeedback,
        toggleWordInfo,
        toggleHardMode,
        toggleHighContrast,

        // Setters (explicit value and persist)
        setDarkMode,
        setFeedbackEnabled,
        setWordInfoEnabled,
        setHardMode,
        setHighContrast,
    };
});
