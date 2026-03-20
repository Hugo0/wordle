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

                <!-- Keyboard -->
                <GameKeyboard
                    ref="gameKeyboardRef"
                    :keyboard="langStore.keyboard"
                    :hints="langStore.keyDiacriticHints"
                />

                <!-- Post-keyboard slot (new word button, etc) -->
                <slot name="post-keyboard" />
            </div>

            <!-- Modals -->
            <div
                class="container mx-auto flex w-full justify-center items-center overflow z-1"
                :class="maxWidthClass"
            >
                <SharedModalBackdrop
                    :visible="game.showHelpModal || game.showStatsModal || game.showOptionsModal"
                    @close="
                        game.showHelpModal = false;
                        game.showStatsModal = false;
                        game.showOptionsModal = false;
                    "
                />
                <GameHelpModal :visible="game.showHelpModal" @close="game.showHelpModal = false" />
                <GameSettingsModal
                    :visible="game.showOptionsModal"
                    @close="game.showOptionsModal = false"
                />
            </div>
            <GameStatsModal :visible="game.showStatsModal" @close="game.showStatsModal = false" />
            <GameCopyFallbackModal />
            <GameNotificationToast :notification="game.notification" />

            <!-- Extra overlays slot (speed countdown, results, PWA banner) -->
            <slot name="overlays" />
        </div>
    </div>
</template>

<script setup lang="ts">
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

defineEmits<{ toggleSidebar: []; closeSidebar: [] }>();

const game = useGameStore();
const langStore = useLanguageStore();
const analytics = useAnalytics();
const gameKeyboardRef = ref<{ $el: HTMLElement } | null>(null);

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

// Wire keyboard DOM ref to game store for animations
onMounted(() => {
    game.setKeyboardEl(() => gameKeyboardRef.value?.$el ?? null);
});

defineExpose({ gameKeyboardRef });
</script>
