<template>
    <!-- Wrapper does NOT impose layout (no flex / 100dvh) so editorial pages
         scroll naturally. Sidebar is fixed-overlay, so content flows under it
         when closed and is dimmed when open. -->
    <div :dir="isRtl ? 'rtl' : 'ltr'">
        <AppSidebar
            :is-open="sidebarOpen"
            :lang-code="lang"
            :language-name="langName"
            :is-rtl="isRtl"
            :current-mode="currentMode ?? undefined"
            :ui="ui"
            @close="sidebarOpen = false"
            @select-mode="onSelectMode"
            @select-language="onSelectLanguage"
            @settings="
                showSettings = true;
                sidebarOpen = false;
            "
        />

        <!-- Unified header — same AppHeader component used on game pages,
             with logoMode + game-specific features turned off. -->
        <div class="sticky top-0 z-30 bg-paper app-shell-header">
            <div class="w-full max-w-6xl mx-auto safe-area-inset px-2">
                <AppHeader
                    logo-mode
                    :home-href="resolvedHomeHref"
                    :sidebar-open="sidebarOpen"
                    :show-help="false"
                    :show-streak="true"
                    :streak-count="streakCount"
                    @toggle-sidebar="sidebarOpen = !sidebarOpen"
                    @streak="showStreakModal = true"
                    @settings="showSettings = !showSettings"
                />
            </div>
        </div>

        <slot />

        <!-- Settings modal — works on non-game pages because useSettingsStore()
             is always available. Game-specific options (difficulty) are inert
             when no game is active. Labels fall back to English. -->
        <GameSettingsModal :visible="showSettings" @close="showSettings = false" />

        <!-- Streak modal — available on all pages -->
        <GameStreakModal :visible="showStreakModal" @close="showStreakModal = false" />

        <!-- Language picker modal — consistent with game pages -->
        <AppLanguagePickerModal
            :visible="showLanguageModal"
            :current-lang-code="lang"
            @close="showLanguageModal = false"
        />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppSidebar from './AppSidebar.vue';

const props = withDefaults(
    defineProps<{
        /** Language code used for sidebar mode links + flag. */
        lang: string;
        /** Display name shown in the sidebar's Language section. */
        langName: string;
        /** UI translation strings (from the page's API response). */
        ui?: Record<string, any>;
        /** Highlights the active mode in the sidebar. Null on non-game pages. */
        currentMode?: string | null;
        /** Whether the current language is right-to-left. */
        isRtl?: boolean;
        /** Where the logo links to. Defaults to /<lang>. */
        homeHref?: string;
    }>(),
    {
        ui: undefined,
        currentMode: null,
        isRtl: false,
        homeHref: undefined,
    }
);

const sidebarOpen = ref(false);
const showSettings = ref(false);
const showStreakModal = ref(false);
const showLanguageModal = ref(false);

// Product-wide streak — single source via composable (client-only, returns 0 during SSR)
const { streak: streakCount } = useProductStreak();

const resolvedHomeHref = computed(() => props.homeHref ?? `/${props.lang}`);

function onSelectMode(mode: string) {
    sidebarOpen.value = false;
    const path = mode === 'classic' ? `/${props.lang}` : `/${props.lang}/${mode}`;
    navigateTo(path);
}

function onSelectLanguage() {
    sidebarOpen.value = false;
    showLanguageModal.value = true;
}
</script>

<style scoped>
.app-shell-header {
    backdrop-filter: saturate(180%) blur(8px);
    -webkit-backdrop-filter: saturate(180%) blur(8px);
}
</style>
