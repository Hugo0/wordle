<template>
    <div class="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto px-3 py-2">
        <!-- Play Again (unlimited modes) -->
        <button
            v-if="!isDaily"
            class="w-full max-w-xs py-2.5 px-6 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85 cursor-pointer mb-2"
            @click="$emit('newGame')"
        >
            {{ isSingleBoard ? 'New Word' : 'Play Again' }}
        </button>

        <!-- After unlimited: subtle daily nudge -->
        <NuxtLink
            v-if="!isDaily && dailyRoute"
            :to="dailyRoute"
            class="text-xs text-ink underline underline-offset-2 hover:opacity-70 transition-opacity mb-2"
        >
            Play today's daily &rarr;
        </NuxtLink>

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

        <!-- After daily: unlimited nudge -->
        <NuxtLink
            v-if="isDaily && unlimitedRoute"
            :to="unlimitedRoute"
            class="text-xs text-ink underline underline-offset-2 hover:opacity-70 transition-opacity mb-2"
        >
            Keep playing &rarr;
        </NuxtLink>

        <!-- Sign-in nudge (logged out only) -->
        <button
            v-if="!authLoggedIn"
            class="text-xs text-muted hover:text-ink transition-colors cursor-pointer mb-2"
            @click="openLoginModal()"
        >
            Sign in to protect your streak &rarr;
        </button>

        <!-- Ad slot placeholder (future: Ezoic/Mediavine banner) -->
        <!-- <div class="w-full max-w-sm h-[50px] mb-2" id="post-game-ad" /> -->

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
                    class="group flex items-center gap-2 px-2.5 py-1.5 border border-rule transition-all duration-200 hover:border-ink hover:bg-paper-warm hover:shadow-sm active:scale-95"
                >
                    <component
                        :is="mode.icon"
                        :size="14"
                        class="text-muted shrink-0 transition-colors duration-200 group-hover:text-ink"
                    />
                    <div class="text-xs font-semibold text-ink truncate">{{ mode.label }}</div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GAME_MODES_UI, getModeRoute, getModeLabel } from '~/composables/useGameModes';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

defineEmits<{ newGame: [] }>();

const game = useGameStore();
const lang = useLanguageStore();
const { loggedIn: authLoggedIn } = useAuth();
const { openLoginModal } = useLoginModal();

const isDaily = computed(() => game.gameConfig.playType === 'daily');
const isSingleBoard = computed(
    () => game.gameConfig.mode === 'classic' || game.gameConfig.mode === 'unlimited'
);

const nextWordLabel = computed(() => lang.config?.text?.next_word || 'Next Wordle');

// Cross-pollination routes
const modeDef = computed(() => GAME_MODE_CONFIG[game.gameConfig.mode]);
const modeBase = computed(() => {
    const suffix = modeDef.value?.routeSuffix;
    return suffix ? `/${lang.languageCode}/${suffix}` : `/${lang.languageCode}`;
});
const unlimitedRoute = computed(() => {
    if (!modeDef.value?.supportedPlayTypes.includes('unlimited')) return null;
    if (game.gameConfig.mode === 'classic') return `/${lang.languageCode}/unlimited`;
    return `${modeBase.value}?play=unlimited`;
});
const dailyRoute = computed(() => {
    if (!modeDef.value?.supportedPlayTypes.includes('daily')) return null;
    return modeBase.value;
});

const otherModes = computed(() => {
    const currentMode = game.gameConfig.mode;
    const langCode = lang.languageCode;
    const ui = lang.config?.ui;
    return GAME_MODES_UI.filter(
        (m) => m.enabled && m.id !== currentMode && m.id !== 'classic' && m.id !== 'unlimited'
    )
        .slice(0, 4)
        .map((m) => ({
            ...m,
            label: getModeLabel(m, ui),
            href: getModeRoute(m, langCode),
        }));
});
</script>
