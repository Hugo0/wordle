<template>
    <div
        v-show="visible"
        class="fixed top-10 left-0 w-full h-full z-30 items-center mx-auto flex"
    >
        <div
            class="modal-animate bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-5 m-4 border-2 border-slate-200 dark:border-neutral-600 mx-auto w-full max-w-xs sm:max-w-md"
        >
            <div class="flex flex-col gap-2 relative">
                <!-- Close (X) button -->
                <button
                    type="button"
                    aria-label="Close"
                    class="absolute top-0 right-0 p-1 ml-auto z-50"
                    @click="$emit('close')"
                >
                    <span
                        class="leading-[0.25] h-5 w-5 text-3xl text-neutral-400 block outline-none focus:outline-none"
                        >&times;</span
                    >
                </button>

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

                    <div
                        class="border-t-2 border-gray-300 dark:border-gray-600"
                    />

                    <!-- Sound & Haptics -->
                    <div class="flex flex-row items-center">
                        <div class="flex-grow">
                            <p>
                                {{
                                    lang.config?.ui?.sound_and_haptics ||
                                    'Sound & Haptics'
                                }}
                            </p>
                        </div>
                        <SharedToggleSwitch
                            :model-value="settings.feedbackEnabled"
                            @update:model-value="settings.toggleFeedback()"
                        />
                    </div>

                    <div
                        class="border-t-2 border-gray-300 dark:border-gray-600"
                    />

                    <!-- Word Info -->
                    <div class="flex flex-row items-center">
                        <div class="flex-grow">
                            <p>
                                {{ lang.config?.ui?.word_info || 'Word Info' }}
                            </p>
                            <p
                                class="text-xs text-neutral-500 dark:text-neutral-400"
                            >
                                {{
                                    lang.config?.ui?.word_info_desc ||
                                    'Definition & AI art after game'
                                }}
                            </p>
                        </div>
                        <SharedToggleSwitch
                            :model-value="settings.wordInfoEnabled"
                            @update:model-value="settings.toggleWordInfo()"
                        />
                    </div>

                    <div
                        class="border-t-2 border-gray-300 dark:border-gray-600"
                    />

                    <!-- Difficulty selector (3-way: Easy / Normal / Hard) -->
                    <div>
                        <p class="text-sm font-semibold mb-2">
                            {{ lang.config?.ui?.difficulty || 'Difficulty' }}
                        </p>
                        <div
                            class="flex rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-600"
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
                                :class="[
                                    settings.hardMode
                                        ? 'bg-green-500 text-white'
                                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600',
                                    canToggleHard
                                        ? ''
                                        : 'opacity-40 cursor-not-allowed',
                                ]"
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
                        <p
                            v-if="!canToggleHard"
                            class="text-xs text-amber-500 mt-1"
                        >
                            Hard mode can be enabled before your first guess
                            tomorrow
                        </p>
                    </div>

                    <div
                        class="border-t-2 border-gray-300 dark:border-gray-600"
                    />

                    <!-- High Contrast / Colorblind mode -->
                    <div class="flex flex-row items-center">
                        <div class="flex-grow">
                            <p>High Contrast</p>
                            <p
                                class="text-xs text-neutral-500 dark:text-neutral-400"
                            >
                                Colorblind-friendly colors
                            </p>
                        </div>
                        <SharedToggleSwitch
                            :model-value="settings.highContrast"
                            @update:model-value="settings.toggleHighContrast()"
                        />
                    </div>

                    <div
                        class="border-t-2 border-gray-300 dark:border-gray-600"
                    />

                    <!-- Right-to-left toggle -->
                    <div class="flex flex-row">
                        <p class="flex-grow">
                            {{
                                lang.config?.ui?.right_to_left ||
                                'Right to left'
                            }}
                        </p>
                        <div class="flex flex-row items-center">
                            <label
                                for="right_to_left"
                                class="flex items-center ml-2 animate-bounce"
                            >
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
                                    <path
                                        stroke="none"
                                        d="M0 0h24v24H0z"
                                        fill="none"
                                    />
                                    <path
                                        d="M12 15v3.586a1 1 0 0 1 -1.707 .707l-6.586 -6.586a1 1 0 0 1 0 -1.414l6.586 -6.586a1 1 0 0 1 1.707 .707v3.586h3v6h-3z"
                                    />
                                    <path d="M21 15v-6" />
                                    <path d="M18 15v-6" />
                                </svg>
                            </label>
                            <input
                                id="right_to_left"
                                v-model="localRtl"
                                type="checkbox"
                            />
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
                    <template
                        v-if="Object.keys(lang.keyboardLayouts).length > 1"
                    >
                        <div
                            class="border-t-2 border-gray-300 dark:border-gray-600"
                        />
                        <div class="flex flex-row items-center">
                            <p id="keyboard-layout-label" class="flex-grow">
                                {{
                                    lang.config?.ui?.keyboard_layout ||
                                    'Keyboard layout'
                                }}
                            </p>
                            <select
                                id="keyboard-layout-select"
                                :value="lang.activeLayout"
                                aria-labelledby="keyboard-layout-label"
                                class="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-700 dark:text-white"
                                @change="
                                    lang.setKeyboardLayout(
                                        ($event.target as HTMLSelectElement)
                                            .value,
                                    )
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
                    <div
                        class="border-t-2 border-gray-300 dark:border-gray-600"
                    />
                    <div class="flex flex-row items-center">
                        <p class="flex-grow">
                            {{ lang.config?.ui?.language || 'Language' }}
                        </p>
                        <NuxtLink
                            to="/"
                            class="border border-neutral-300 dark:border-neutral-600 rounded px-3 py-1 bg-white dark:bg-neutral-700 dark:text-white text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                        >
                            {{
                                lang.config?.ui?.change_language ||
                                'Change Language'
                            }}
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
                                <path
                                    stroke="none"
                                    d="M0 0h24v24H0z"
                                    fill="none"
                                />
                                <path
                                    d="M12 18h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v7.5"
                                />
                                <path d="M16 19h6" />
                                <path d="M19 16v6" />
                            </svg>
                            {{
                                lang.config?.ui?.install_app || 'Install App'
                            }}
                        </button>
                        <p
                            class="text-xs text-center text-neutral-500 dark:text-neutral-400 mt-1"
                        >
                            {{
                                lang.config?.ui?.install_app_desc ||
                                'Play offline & get app icon'
                            }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
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
    set: (v: boolean) => { game.allowAnyWord = v; },
});

/** Local RTL toggle -- mirrors the computed value but allows user override. */
const localRtl = ref(lang.rightToLeft);

// Sync local RTL with language store changes
watch(
    () => lang.rightToLeft,
    (val) => {
        localRtl.value = val;
    },
);

// TODO: When localRtl changes, update the game board direction
// (requires adding a mutable RTL override to the language or game store)

/** Whether the player can still toggle hard mode (only before first guess). */
const canToggleHard = computed(
    () => settings.hardMode || game.activeRow === 0 || game.gameOver,
);

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
    if (level === 'easy') {
        allowAnyWord.value = true;
        if (settings.hardMode) settings.toggleHardMode();
    } else if (level === 'normal') {
        allowAnyWord.value = false;
        if (settings.hardMode) settings.toggleHardMode();
    } else if (level === 'hard') {
        if (!canToggleHard.value) return;
        allowAnyWord.value = false;
        if (!settings.hardMode) settings.toggleHardMode();
    }
}
</script>
