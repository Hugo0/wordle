<template>
    <div class="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto px-3 py-2">
        <!-- Play Again (non-daily modes) -->
        <button
            v-if="!isDaily"
            class="w-full max-w-xs py-2.5 px-6 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85 cursor-pointer mb-2"
            @click="$emit('newGame')"
        >
            {{ isSingleBoard ? 'New Word' : 'Play Again' }}
        </button>

        <!-- Next word countdown (daily only) -->
        <div v-if="isDaily" class="flex items-center gap-3 mb-2">
            <span class="text-xs text-muted">{{ nextWordLabel }}</span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span
                class="font-mono font-semibold text-base text-ink"
                style="letter-spacing: 0.08em"
                v-html="game.timeUntilNextDay"
            />
        </div>

        <!-- Mode discovery -->
        <div class="w-full max-w-sm">
            <p class="mono-label text-center mb-1.5" style="font-size: 9px; letter-spacing: 0.15em">
                Try another mode
            </p>
            <div class="grid grid-cols-2 gap-1.5">
                <NuxtLink
                    v-for="mode in otherModes"
                    :key="mode.id"
                    :to="mode.href!"
                    class="flex items-center gap-2 px-2.5 py-1.5 border border-rule hover:bg-paper-warm transition-colors"
                >
                    <component :is="mode.icon" :size="14" class="text-muted shrink-0" />
                    <div class="text-xs font-semibold text-ink truncate">{{ mode.label }}</div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GAME_MODES_UI, getModeRoute } from '~/composables/useGameModes';

defineEmits<{ newGame: [] }>();

const game = useGameStore();
const lang = useLanguageStore();

const isDaily = computed(() => game.gameConfig.playType === 'daily');
const isSingleBoard = computed(
    () => game.gameConfig.mode === 'classic' || game.gameConfig.mode === 'unlimited'
);

const nextWordLabel = computed(() => lang.config?.text?.next_word || 'Next Wordle');

const otherModes = computed(() => {
    const currentMode = game.gameConfig.mode;
    const langCode = lang.languageCode;
    return GAME_MODES_UI.filter((m) => m.enabled && m.id !== currentMode && m.id !== 'classic')
        .slice(0, 4)
        .map((m) => ({
            ...m,
            href: getModeRoute(m, langCode),
        }));
});
</script>
