<template>
    <SharedBaseModal :visible="visible" size="sm" @close="$emit('close')">
        <div class="flex flex-col gap-2">
            <h3 class="heading-section text-xl text-ink mb-5">
                {{ lang.config?.ui?.settings }}
            </h3>

            <div class="space-y-4">
                <!-- Dark mode toggle -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p class="text-sm text-ink">
                            {{ lang.config?.ui?.dark_mode }}
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.darkMode"
                        @update:model-value="settings.toggleDarkMode()"
                    />
                </div>

                <div class="editorial-rule" />

                <!-- Sound & Haptics -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p class="text-sm text-ink">
                            {{ lang.config?.ui?.sound_and_haptics }}
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.feedbackEnabled"
                        @update:model-value="settings.toggleFeedback()"
                    />
                </div>

                <div class="editorial-rule" />

                <!-- Difficulty selector (3-way: Easy / Normal / Hard) -->
                <div>
                    <p class="text-sm font-semibold text-ink mb-2">
                        {{ lang.config?.ui?.difficulty }}
                    </p>
                    <div
                        class="flex overflow-hidden border border-rule"
                        :class="{ shake: settings.difficultyShake }"
                    >
                        <button
                            type="button"
                            class="flex-1 py-2 px-1 text-xs font-medium transition-colors"
                            :class="
                                allowAnyWord && !settings.hardMode
                                    ? 'bg-correct text-white'
                                    : 'bg-paper-warm text-muted hover:bg-muted-soft'
                            "
                            @click="setDifficulty('easy')"
                        >
                            {{ lang.config?.ui?.easy }}
                        </button>
                        <button
                            type="button"
                            class="flex-1 py-2 px-1 text-xs font-medium transition-colors border-x border-rule"
                            :class="
                                !allowAnyWord && !settings.hardMode
                                    ? 'bg-correct text-white'
                                    : 'bg-paper-warm text-muted hover:bg-muted-soft'
                            "
                            @click="setDifficulty('normal')"
                        >
                            {{ lang.config?.ui?.normal }}
                        </button>
                        <button
                            type="button"
                            class="flex-1 py-2 px-1 text-xs font-medium transition-colors"
                            :class="
                                settings.hardMode
                                    ? 'bg-correct text-white'
                                    : 'bg-paper-warm text-muted hover:bg-muted-soft'
                            "
                            @click="setDifficulty('hard')"
                        >
                            {{ lang.config?.ui?.hard }}
                        </button>
                    </div>
                    <p v-if="allowAnyWord && !settings.hardMode" class="text-xs text-muted mt-1">
                        {{ lang.config?.ui?.easy_desc }}
                    </p>
                    <p v-if="!allowAnyWord && !settings.hardMode" class="text-xs text-muted mt-1">
                        {{ lang.config?.ui?.normal_desc }}
                    </p>
                    <p v-if="settings.hardMode" class="text-xs text-muted mt-1">
                        {{ lang.config?.ui?.hard_desc }}
                    </p>
                    <p v-if="settings.difficultyWarning" class="text-xs text-accent mt-1">
                        {{ settings.difficultyWarning }}
                    </p>
                </div>

                <div class="editorial-rule" />

                <!-- Word Info (definition + image after game) -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p class="text-sm text-ink">
                            {{ lang.config?.ui?.word_info || 'Word Info' }}
                        </p>
                        <p class="text-xs text-muted">
                            {{
                                lang.config?.ui?.word_info_desc ||
                                'Show definition and image after solving'
                            }}
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.wordInfoEnabled"
                        @update:model-value="settings.toggleWordInfo()"
                    />
                </div>

                <div class="editorial-rule" />

                <!-- Animations -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p class="text-sm text-ink">
                            {{ lang.config?.ui?.animations || 'Animations' }}
                        </p>
                        <p class="text-xs text-muted">
                            {{
                                lang.config?.ui?.animations_desc ||
                                'Tile flip, bounce, and pop effects'
                            }}
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.animationsEnabled"
                        @update:model-value="settings.toggleAnimations()"
                    />
                </div>

                <div class="editorial-rule" />

                <!-- High Contrast / Colorblind mode -->
                <div class="flex flex-row items-center">
                    <div class="flex-grow">
                        <p class="text-sm text-ink">{{ lang.config?.ui?.high_contrast }}</p>
                        <p class="text-xs text-muted">
                            {{ lang.config?.ui?.high_contrast_desc }}
                        </p>
                    </div>
                    <SharedToggleSwitch
                        :model-value="settings.highContrast"
                        @update:model-value="settings.toggleHighContrast()"
                    />
                </div>

                <!-- Keyboard layout selector (only when multiple layouts available) -->
                <template v-if="Object.keys(lang.keyboardLayouts).length > 1">
                    <div class="editorial-rule" />
                    <div class="flex flex-row items-center">
                        <p id="keyboard-layout-label" class="flex-grow text-sm text-ink">
                            {{ lang.config?.ui?.keyboard_layout }}
                        </p>
                        <select
                            id="keyboard-layout-select"
                            :value="lang.activeLayout"
                            aria-labelledby="keyboard-layout-label"
                            class="border border-rule px-2 py-1 bg-paper text-ink text-sm"
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

                <!-- Install App (only shown when PWA install is available) -->
                <template v-if="canInstallPwa">
                    <div class="editorial-rule" />
                    <button
                        class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-correct hover:opacity-90 text-white font-medium transition-opacity"
                        @click="installPwa()"
                    >
                        <Download :size="18" />
                        {{ lang.config?.ui?.install_app }}
                    </button>
                    <p class="text-xs text-center text-muted mt-1">
                        {{ lang.config?.ui?.install_app_desc }}
                    </p>
                </template>
            </div>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Download } from 'lucide-vue-next';
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

/**
 * Smart difficulty gating: check if all past guesses satisfy the target level.
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
    if (DIFFICULTY_LEVELS[level] <= currentLevel) return true;
    if (DIFFICULTY_LEVELS[level] >= 1 && !allGuessesAreValidWords()) return false;
    if (DIFFICULTY_LEVELS[level] >= 2 && !allGuessesFollowHardMode()) return false;
    return true;
}

/** PWA install support */
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
        settings.difficultyWarning = "Can't change difficulty after guessing";
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
