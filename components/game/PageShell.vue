<template>
    <div v-if="visible" class="flex h-full" :class="wrapperClass">
        <!-- Sidebar (fixed overlay) -->
        <AppSidebar
            :is-open="sidebarOpen"
            :lang-code="lang"
            :language-name="languageName"
            :is-rtl="langStore.rightToLeft"
            :current-mode="currentMode"
            @close="$emit('closeSidebar')"
            @select-mode="
                (mode: string) => {
                    analytics.trackModeSelected(mode, 'sidebar');
                    navigateTo(`/${lang}/${mode === 'classic' ? '' : mode + '/'}`);
                }
            "
            @select-language="navigateTo('/#languages')"
            @settings="game.showOptionsModal = !game.showOptionsModal"
        />

        <div class="flex-1 min-w-0 flex flex-col h-[100dvh]" :class="innerClass">
            <div
                class="wrapper container mx-auto flex flex-col h-full w-full safe-area-inset"
                :class="maxWidthClass"
            >
                <!-- Header -->
                <GameHeader
                    :title="title"
                    :subtitle="subtitle"
                    :sidebar-open="sidebarOpen"
                    @help="onHelp"
                    @stats="onStats"
                    @settings="game.showOptionsModal = !game.showOptionsModal"
                    @toggle-sidebar="$emit('toggleSidebar')"
                />

                <!-- Pre-keyboard slot (banner, speed timer, boards, etc) -->
                <slot />

                <!-- Keyboard flip container (speed mode excluded — has its own overlay) -->
                <div
                    v-if="!isSpeedMode"
                    class="keyboard-flip-container"
                    :class="{ flipped: showPostGame }"
                >
                    <div class="keyboard-flip-inner">
                        <!-- Front face: keyboard (inert when flipped to prevent focus/SR access) -->
                        <div class="keyboard-face keyboard-front" :inert="showPostGame">
                            <GameKeyboard
                                ref="gameKeyboardRef"
                                :keyboard="langStore.keyboard"
                                :hints="langStore.keyDiacriticHints"
                            />
                        </div>
                        <!-- Back face: post-game panel (only in DOM after game ends) -->
                        <div v-if="game.gameOver" class="keyboard-face keyboard-back">
                            <GamePostGamePanel @new-game="$emit('newGame')" />
                        </div>
                    </div>
                </div>

                <!-- Speed mode: keyboard without flip wrapper -->
                <GameKeyboard
                    v-else
                    ref="gameKeyboardRef"
                    :keyboard="langStore.keyboard"
                    :hints="langStore.keyDiacriticHints"
                />
            </div>

            <!-- Modals (each has its own backdrop via BaseModal) -->
            <GameHelpModal :visible="game.showHelpModal" @close="game.showHelpModal = false" />
            <GameSettingsModal
                :visible="game.showOptionsModal"
                @close="game.showOptionsModal = false"
            />
            <GameStatsModal
                :visible="game.showStatsModal"
                @close="game.showStatsModal = false"
                @new-game="
                    game.showStatsModal = false;
                    $emit('newGame');
                "
            />
            <GameCopyFallbackModal />
            <GameNotificationToast :notification="game.notification" />

            <!-- Extra overlays slot (speed countdown, results, PWA banner) -->
            <slot name="overlays" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = withDefaults(
    defineProps<{
        lang: string;
        languageName: string;
        currentMode: string;
        title: string;
        subtitle: string;
        sidebarOpen: boolean;
        maxWidth?: 'lg' | '2xl';
        wrapperClass?: string;
        innerClass?: string;
        visible?: boolean;
    }>(),
    {
        maxWidth: 'lg',
        wrapperClass: undefined,
        innerClass: undefined,
        visible: true,
    }
);

defineEmits<{ toggleSidebar: []; closeSidebar: []; newGame: [] }>();

const game = useGameStore();
const langStore = useLanguageStore();
const analytics = useAnalytics();
const gameKeyboardRef = ref<{ $el: HTMLElement } | null>(null);

// ---------------------------------------------------------------------------
// Post-game keyboard flip
// ---------------------------------------------------------------------------

// Flip delays must exceed tile reveal + bounce so the user absorbs the result first.
// Win has a longer delay because the bounce celebration adds ~500ms.
const FLIP_DELAY_WIN = 1500;
const FLIP_DELAY_LOSS = 1200;

const isSpeedMode = computed(() => game.gameConfig.mode === 'speed');
const showPostGame = ref(false);
let flipTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
    // Wire keyboard DOM ref to game store for animations
    game.setKeyboardEl(() => gameKeyboardRef.value?.$el ?? null);

    // If page loads with game already over (returning to completed daily),
    // show post-game panel immediately without animation
    if (game.gameOver && !isSpeedMode.value) {
        showPostGame.value = true;
    }
});

onUnmounted(() => {
    if (flipTimeout) clearTimeout(flipTimeout);
});

// Watch for game ending → trigger flip with delay
watch(
    () => game.gameOver,
    (isOver) => {
        if (flipTimeout) {
            clearTimeout(flipTimeout);
            flipTimeout = null;
        }
        if (isOver && !isSpeedMode.value) {
            const delay = game.gameWon ? FLIP_DELAY_WIN : FLIP_DELAY_LOSS;
            flipTimeout = setTimeout(() => {
                showPostGame.value = true;
            }, delay);
        } else {
            // Game reset (Play Again) — flip back
            showPostGame.value = false;
        }
    }
);

// ---------------------------------------------------------------------------
// Header actions
// ---------------------------------------------------------------------------

function onHelp() {
    game.showHelpModal = !game.showHelpModal;
    if (game.showHelpModal) {
        analytics.trackHelpOpen(langStore.languageCode);
    }
}

function onStats() {
    game.showStatsModal = !game.showStatsModal;
    if (game.showStatsModal) {
        analytics.trackStatsOpen(langStore.languageCode, 'manual');
    }
}

const maxWidthClass = computed(() => (props.maxWidth === '2xl' ? 'max-w-2xl' : 'max-w-lg'));

defineExpose({ gameKeyboardRef });
</script>
