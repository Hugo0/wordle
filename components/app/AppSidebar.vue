<template>
    <!-- Backdrop (mobile overlay) -->
    <Teleport to="body">
        <Transition name="sidebar-backdrop">
            <div
                v-if="isOpen"
                class="fixed inset-0 z-40 bg-ink/30"
                aria-hidden="true"
                @click="close"
            />
        </Transition>
    </Teleport>

    <!-- Sidebar — always fixed overlay, never shifts layout -->
    <Transition name="sidebar-slide">
        <aside
            v-if="isOpen"
            id="app-sidebar"
            ref="sidebarEl"
            role="navigation"
            :aria-label="isRtl ? 'תפריט ניווט' : 'Navigation menu'"
            class="fixed inset-y-0 z-50 shadow-xl"
            :class="isRtl ? 'right-0' : 'left-0'"
            @keydown.escape="close"
        >
            <div class="flex flex-col h-full w-[280px] bg-paper overflow-y-auto sidebar-scroll">
                <!-- Logo -->
                <div class="px-6 pb-5 pt-6 editorial-rule">
                    <NuxtLink
                        to="/"
                        class="heading-body text-xl text-ink hover:opacity-80 transition-opacity"
                    >
                        Wordle<span class="text-accent">.</span>Global
                    </NuxtLink>
                </div>

                <!-- Play section -->
                <nav class="py-4 editorial-rule">
                    <div class="mono-label px-6 pb-2">Play</div>
                    <SidebarItem
                        v-for="mode in gameModes"
                        :key="mode.id"
                        :icon="mode.icon"
                        :label="mode.label"
                        :badge="mode.badge"
                        :active="mode.id === currentMode"
                        :href="mode.href"
                        :disabled="mode.disabled"
                        @click="selectMode(mode.id)"
                    />
                </nav>

                <!-- Language section -->
                <div class="py-4 editorial-rule">
                    <div class="mono-label px-6 pb-2">Language</div>
                    <button class="sidebar-item w-full" @click="$emit('selectLanguage')">
                        <span class="item-icon">
                            <img
                                v-if="flagSrc"
                                :src="flagSrc"
                                :alt="languageName"
                                class="flag-icon flag-icon-sm"
                                @error="($event.target as HTMLImageElement).style.display = 'none'"
                            />
                            <Globe v-if="!flagSrc" :size="18" class="text-muted" />
                        </span>
                        <span class="flex-1 text-sm text-ink">{{ languageName }}</span>
                        <ChevronRight :size="14" class="text-muted" />
                    </button>
                </div>

                <!-- You section -->
                <div class="py-4 editorial-rule">
                    <div class="mono-label px-6 pb-2">You</div>
                    <SidebarItem icon="BarChart2" label="Statistics" href="/stats" />
                    <SidebarItem icon="Award" label="Badges" disabled badge="SOON" />
                    <SidebarItem icon="Calendar" label="Archive" :href="`/${langCode}/words`" />
                    <SidebarItem
                        icon="Settings"
                        label="Settings"
                        @click="
                            $emit('settings');
                            close();
                        "
                    />
                    <a
                        :href="bugReportUrl"
                        target="_blank"
                        rel="noopener"
                        class="sidebar-item w-full"
                    >
                        <span class="item-icon w-5 flex items-center justify-center">
                            <Bug :size="18" class="text-current" />
                        </span>
                        <span class="text-sm text-ink">Report a bug</span>
                    </a>
                </div>

                <!-- Learn section -->
                <div class="py-4 editorial-rule">
                    <div class="mono-label px-6 pb-2">Learn</div>
                    <SidebarItem
                        icon="Lightbulb"
                        label="Best Starting Words"
                        :href="`/${langCode}/best-starting-words`"
                    />
                </div>

                <!-- Profile (placeholder for Phase 2) — pinned to bottom -->
                <div
                    class="mt-auto px-6 py-4 editorial-rule flex items-center gap-3 cursor-default"
                >
                    <div
                        class="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center heading-body text-sm"
                    >
                        ?
                    </div>
                    <div>
                        <div class="text-sm font-semibold text-ink">Guest</div>
                        <div class="mono-label">Sign in coming soon</div>
                    </div>
                </div>
            </div>
        </aside>
    </Transition>
</template>

<script setup lang="ts">
import { Globe, ChevronRight, Bug } from 'lucide-vue-next';
import { useFlag } from '~/composables/useFlag';
import { GAME_MODES_UI, getModeRoute } from '~/composables/useGameModes';
import SidebarItem from './SidebarItem.vue';

const props = withDefaults(
    defineProps<{
        isOpen: boolean;
        currentMode?: string;
        langCode?: string;
        languageName?: string;
        isRtl?: boolean;
    }>(),
    {
        currentMode: 'classic',
        langCode: 'en',
        languageName: 'English',
        isRtl: false,
    }
);

const emit = defineEmits<{
    close: [];
    selectMode: [mode: string];
    selectLanguage: [];
    settings: [];
}>();

const sidebarEl = ref<HTMLElement | null>(null);

const flagSrc = computed(() => useFlag(props.langCode));

function close() {
    emit('close');
}

function selectMode(mode: string) {
    emit('selectMode', mode);
    close();
}

const gameModes = computed(() =>
    GAME_MODES_UI.map((mode) => ({
        id: mode.id,
        icon: mode.icon,
        label: mode.label,
        badge: mode.badge,
        href: getModeRoute(mode, props.langCode) ?? undefined,
        disabled: !mode.enabled,
    }))
);

// Pre-fill bug report with language, mode, and device info
const bugReportUrl = computed(() => {
    const params = new URLSearchParams({
        template: 'bug.yml',
        labels: 'bug',
        language: props.langCode || '',
    });
    if (import.meta.client) {
        const ua = navigator.userAgent;
        const platform = /iPhone|iPad/.test(ua)
            ? 'iOS'
            : /Android/.test(ua)
              ? 'Android'
              : /Mac/.test(ua)
                ? 'Mac'
                : /Windows/.test(ua)
                  ? 'Windows'
                  : 'Other';
        params.set(
            'device',
            `${platform} / ${navigator.userAgent.split(') ').pop()?.split('/')[0] || 'Unknown'}`
        );
    }
    if (props.currentMode && props.currentMode !== 'classic') {
        params.set('title', `Bug in ${props.currentMode} mode (${props.langCode})`);
    }
    return `https://github.com/Hugo0/wordle/issues/new?${params}`;
});
</script>

<style scoped>
/* Minimal scrollbar */
.sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--color-rule) transparent;
}
.sidebar-scroll::-webkit-scrollbar {
    width: 4px;
}
.sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
    background: var(--color-rule);
    border-radius: 2px;
}
.sidebar-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--color-muted);
}

/* Sidebar item base (used by child SidebarItem too via :deep) */
.sidebar-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 24px;
    cursor: pointer;
    font-size: 14px;
    transition:
        background 0.15s,
        border-color 0.15s;
    border-left: 3px solid transparent;
    text-align: start;
}
[dir='rtl'] .sidebar-item {
    border-left: none;
    border-right: 3px solid transparent;
}
.sidebar-item:hover {
    background: var(--color-paper-warm);
}

/* Transitions */
.sidebar-backdrop-enter-active,
.sidebar-backdrop-leave-active {
    transition: opacity 0.3s ease;
}
.sidebar-backdrop-enter-from,
.sidebar-backdrop-leave-to {
    opacity: 0;
}

.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
    transform: translateX(-100%);
}
[dir='rtl'] .sidebar-slide-enter-from,
[dir='rtl'] .sidebar-slide-leave-to {
    transform: translateX(100%);
}
</style>
