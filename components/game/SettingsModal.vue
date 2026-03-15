<template>
    <SharedBaseModal :visible="visible" size="sm" :z-index="30" @close="$emit('close')">
        <div class="flex flex-col gap-2">
            <h3 class="uppercase font-bold text-xl tracking-wider mb-5">
                {{ lang.config?.ui?.settings || 'Settings' }}
            </h3>

            <div class="space-y-4">
                <!-- Dark mode toggle -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p>
                            {{ lang.config?.ui?.dark_mode || 'Dark Mode' }}
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.darkMode"
                        @update:model-value="settings.toggleDarkMode()"
                    />
                </div>

                <div class="border-t-2 border-gray-300 dark:border-gray-600" />

                <!-- Sound & Haptics -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p>
                            {{ lang.config?.ui?.sound_and_haptics || 'Sound & Haptics' }}
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.feedbackEnabled"
                        @update:model-value="settings.toggleFeedback()"
                    />
                </div>

                <div class="border-t-2 border-gray-300 dark:border-gray-600" />

                <!-- Word Info -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p>
                            {{ lang.config?.ui?.word_info || 'Word Info' }}
                        </p>
                        <p class="text-xs text-neutral-500 dark:text-neutral-400">
                            {{
                                lang.config?.ui?.word_info_desc || 'Definition & AI art after game'
                            }}
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.wordInfoEnabled"
                        @update:model-value="settings.toggleWordInfo()"
                    />
                </div>

                <div class="border-t-2 border-gray-300 dark:border-gray-600" />

                <!-- Difficulty selector (3-way: Easy / Normal / Hard) -->
                <div>
                    <p class="text-sm font-semibold mb-2">
                        {{ lang.config?.ui?.difficulty || 'Difficulty' }}
                    </p>
                    <div
                        class="flex rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-600"
                        :class="{ shake: settings.difficultyShake }"
                    >
                        <button
                            type="button"
                            class="flex-1 py-2 px-1 text-xs font-medium transition-colors"
                            :class="
                                allowAnyWord && !settings.hardMode
                                    ? 'bg-green-500 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                            "
                            @click="setDifficulty('easy')"
                        >
                            Easy
                        </button>
                        <button
                            type="button"
                            class="flex-1 py-2 px-1 text-xs font-medium transition-colors border-x border-neutral-300 dark:border-neutral-600"
                            :class="
                                !allowAnyWord && !settings.hardMode
                                    ? 'bg-green-500 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                            "
                            @click="setDifficulty('normal')"
                        >
                            Normal
                        </button>
                        <button
                            type="button"
                            class="flex-1 py-2 px-1 text-xs font-medium transition-colors"
                            :class="
                                settings.hardMode
                                    ? 'bg-green-500 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                            "
                            @click="setDifficulty('hard')"
                        >
                            Hard
                        </button>
                    </div>
                    <p
                        v-if="allowAnyWord && !settings.hardMode"
                        class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                    >
                        Any word accepted, even if not in the dictionary
                    </p>
                    <p
                        v-if="!allowAnyWord && !settings.hardMode"
                        class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                    >
                        Guesses must be valid words from the dictionary
                    </p>
                    <p
                        v-if="settings.hardMode"
                        class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                    >
                        Revealed hints must be used in subsequent guesses
                    </p>
                    <p v-if="settings.difficultyWarning" class="text-xs text-amber-500 mt-1">
                        {{ settings.difficultyWarning }}
                    </p>
                </div>

                <div class="border-t-2 border-gray-300 dark:border-gray-600" />

                <!-- High Contrast / Colorblind mode -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p>High Contrast</p>
                        <p class="text-xs text-neutral-500 dark:text-neutral-400">
                            Colorblind-friendly colors
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.highContrast"
                        @update:model-value="settings.toggleHighContrast()"
                    />
                </div>

                <div class="border-t-2 border-gray-300 dark:border-gray-600" />

                <!-- Right-to-left toggle -->
                <div class="flex flex-row">
                    <p class="flex-grow">
                        {{ lang.config?.ui?.right_to_left || 'Right to left' }}
                    </p>
                    <div class="flex flex-row items-center">
                        <label for="right_to_left" class="flex items-center ml-2 animate-bounce">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="text-neutral-500 mr-4"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                stroke-width="2"
                                stroke="currentColor"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path
                                    d="M12 15v3.586a1 1 0 0 1 -1.707 .707l-6.586 -6.586a1 1 0 0 1 0 -1.414l6.586 -6.586a1 1 0 0 1 1.707 .707v3.586h3v6h-3z"
                                />
                                <path d="M21 15v-6" />
                                <path d="M18 15v-6" />
                            </svg>
                        </label>
                        <input id="right_to_left" v-model="localRtl" type="checkbox" />
                    </div>
                    <div class="flex-row gap-2">
                        <button
                            class="font-bold text-sm tracking-wider"
                            @click="localRtl = !localRtl"
                        >
                            {{ lang.config?.right_to_left_on }}
                        </button>
                    </div>
                </div>

                <!-- Keyboard layout selector (when multiple layouts available) -->
                <template v-if="Object.keys(lang.keyboardLayouts).length > 1">
                    <div class="border-t-2 border-gray-300 dark:border-gray-600" />
                    <div class="flex flex-row items-center">
                        <p id="keyboard-layout-label" class="flex-grow">
                            {{ lang.config?.ui?.keyboard_layout || 'Keyboard layout' }}
                        </p>
                        <select
                            id="keyboard-layout-select"
                            :value="lang.activeLayout"
                            aria-labelledby="keyboard-layout-label"
                            class="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-700 dark:text-white"
                            @change="
                                lang.setKeyboardLayout(($event.target as HTMLSelectElement).value)
                            "
                        >
                            <option
                                v-for="(meta, name) in lang.keyboardLayouts"
                                :key="name"
                                :value="name"
                            >
                                {{ meta.label }}
                            </option>
                        </select>
                    </div>
                </template>

                <!-- Language selector -->
                <div class="border-t-2 border-gray-300 dark:border-gray-600" />
                <div class="flex flex-row items-center">
                    <p class="flex-grow">
                        {{ lang.config?.ui?.language || 'Language' }}
                    </p>
                    <NuxtLink
                        to="/"
                        class="border border-neutral-300 dark:border-neutral-600 rounded px-3 py-1 bg-white dark:bg-neutral-700 dark:text-white text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                    >
                        {{ lang.config?.ui?.change_language || 'Change Language' }}
                    </NuxtLink>
                </div>

                <!-- Install App button (only shown when PWA install is available) -->
                <div
                    v-if="canInstallPwa"
                    class="border-t-2 border-gray-300 dark:border-gray-600 mt-2 pt-4"
                >
                    <button
                        class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                        @click="installPwa()"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path
                                d="M12 18h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v7.5"
                            />
                            <path d="M16 19h6" />
                            <path d="M19 16v6" />
                        </svg>
                        {{ lang.config?.ui?.install_app || 'Install App' }}
                    </button>
                    <p class="text-xs text-center text-neutral-500 dark:text-neutral-400 mt-1">
                        {{ lang.config?.ui?.install_app_desc || 'Play offline & get app icon' }}
                    </p>
                </div>
            </div>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSettingsStore } from '~/stores/settings';
import { useLanguageStore } from '~/stores/language';
import { useGameStore } from '~/stores/game';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const settings = useSettingsStore();
const lang = useLanguageStore();
const game = useGameStore();

/** Easy mode (allow any word) — synced with game store. */
const allowAnyWord = computed({
    get: () => game.allowAnyWord,
    set: (v: boolean) => {
        game.allowAnyWord = v;
    },
});

/** Local RTL toggle -- mirrors the computed value but allows user override. */
const localRtl = ref(lang.rightToLeft);

// Sync local RTL with language store changes
watch(
    () => lang.rightToLeft,
    (val) => {
        localRtl.value = val;
    }
);

// TODO: When localRtl changes, update the game board direction
// (requires adding a mutable RTL override to the language or game store)

/**
 * Smart difficulty gating: check if all past guesses satisfy the target level.
 * - Easy → Normal: all guesses must be valid dictionary words
 * - Easy/Normal → Hard: all guesses must follow hard mode rules (use revealed hints)
 * Going down is always allowed.
 */
const DIFFICULTY_LEVELS = { easy: 0, normal: 1, hard: 2 } as const;

function allGuessesAreValidWords(): boolean {
    for (let r = 0; r < game.activeRow; r++) {
        const row = game.tiles[r];
        if (!row) continue;
        const word = row.join('').toLowerCase();
        if (word && !lang.wordListSet.has(word)) return false;
    }
    return true;
}

function allGuessesFollowHardMode(): boolean {
    for (let r = 1; r < game.activeRow; r++) {
        const row = game.tiles[r];
        if (!row) continue;
        const guess = row.join('').toLowerCase();
        if (!guess) continue;
        for (let prev = 0; prev < r; prev++) {
            const prevRow = game.tiles[prev];
            const prevColors = game.tileColors[prev];
            if (!prevRow || !prevColors) continue;
            for (let c = 0; c < prevRow.length; c++) {
                const color = prevColors[c];
                const letter = prevRow[c]?.toLowerCase();
                if (!letter) continue;
                if (color === 'correct' && guess[c] !== letter) return false;
                if (color === 'semicorrect' && !guess.includes(letter)) return false;
            }
        }
    }
    return true;
}

function canSetDifficulty(level: 'easy' | 'normal' | 'hard'): boolean {
    if (game.activeRow === 0 || game.gameOver) return true;

    const currentLevel = settings.hardMode ? 2 : allowAnyWord.value ? 0 : 1;
    // Going down is always allowed
    if (DIFFICULTY_LEVELS[level] <= currentLevel) return true;

    // Going up: check if past guesses satisfy the target
    if (DIFFICULTY_LEVELS[level] >= 1 && !allGuessesAreValidWords()) return false;
    if (DIFFICULTY_LEVELS[level] >= 2 && !allGuessesFollowHardMode()) return false;
    return true;
}

/** PWA install support -- will be false until a beforeinstallprompt event fires. */
const canInstallPwa = ref(false);
let deferredPrompt: Event | null = null;

if (import.meta.client) {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        deferredPrompt = e;
        canInstallPwa.value = true;
    });
}

function installPwa(): void {
    if (deferredPrompt && 'prompt' in deferredPrompt) {
        (deferredPrompt as any).prompt();
        canInstallPwa.value = false;
        deferredPrompt = null;
    }
}

function setDifficulty(level: 'easy' | 'normal' | 'hard'): void {
    if (!canSetDifficulty(level)) {
        settings.difficultyShake = true;
        settings.difficultyWarning = 'Can\'t change difficulty after guessing';
        setTimeout(() => {
            settings.difficultyShake = false;
            settings.difficultyWarning = '';
        }, 1500);
        return;
    }
    if (level === 'easy') {
        allowAnyWord.value = true;
        if (settings.hardMode) settings.toggleHardMode();
    } else if (level === 'normal') {
        allowAnyWord.value = false;
        if (settings.hardMode) settings.toggleHardMode();
    } else if (level === 'hard') {
        allowAnyWord.value = false;
        if (!settings.hardMode) settings.toggleHardMode();
    }
}
</script>
