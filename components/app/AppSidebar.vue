<template>
    <!-- Backdrop (mobile overlay) -->
    <Teleport to="body">
        <Transition name="sidebar-backdrop">
            <div
                v-if="isOpen"
                class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
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
                <nav ref="playNavRef" class="py-4 editorial-rule">
                    <div class="mono-label px-6 pb-2">Play</div>

                    <!-- Daily Puzzle (top-level, most played) -->
                    <SidebarItem
                        icon="Square"
                        label="Daily Puzzle"
                        :active="currentMode === 'classic' && currentPlayType === 'daily'"
                        :href="`/${langCode}`"
                        @click="selectMode('classic')"
                    />

                    <!-- Unlimited (top-level, most played) -->
                    <SidebarItem
                        icon="Infinity"
                        label="Unlimited"
                        :active="
                            currentMode === 'unlimited' ||
                            (currentMode === 'classic' && currentPlayType === 'unlimited')
                        "
                        :href="`/${langCode}/unlimited`"
                        @click="selectMode('unlimited')"
                    />

                    <!-- Speed Streak -->
                    <template v-if="showSpeed">
                        <button
                            class="sidebar-item w-full"
                            :class="{
                                active: currentMode === 'speed',
                                'show-sub-panel': subPanelMode === 'speed',
                            }"
                            @click="
                                toggleSubPanel(
                                    'speed',
                                    `/${langCode}/speed`,
                                    `/${langCode}/speed?play=unlimited`
                                )
                            "
                        >
                            <span class="item-icon w-5 flex items-center justify-center">
                                <component
                                    v-if="speedMode?.icon"
                                    :is="speedMode.icon"
                                    :size="18"
                                    class="text-current"
                                />
                            </span>
                            <span class="flex-1 text-sm">{{
                                speedMode?.label || 'Speed Streak'
                            }}</span>
                            <span v-if="speedMode?.badge" class="sidebar-badge">{{
                                speedMode.badge
                            }}</span>
                        </button>
                    </template>

                    <!-- Multi-Board (expandable → modes, each shows sub-panel) -->
                    <button
                        class="sidebar-item w-full"
                        :class="{ active: isMultiBoardMode }"
                        @click="
                            expandedSection =
                                expandedSection === 'multiboard' ? null : 'multiboard';
                            subPanelMode = null;
                        "
                    >
                        <span class="item-icon w-5 flex items-center justify-center">
                            <Grid2x2 :size="18" class="text-current" />
                        </span>
                        <span class="flex-1 text-sm">Multi-Board</span>
                        <ChevronDown
                            :size="14"
                            class="text-muted transition-transform duration-200"
                            :class="{ 'rotate-180': expandedSection === 'multiboard' }"
                        />
                    </button>
                    <div v-if="expandedSection === 'multiboard'" class="sidebar-expand">
                        <button
                            v-for="mb in multiboardModes"
                            :key="mb.id"
                            class="sidebar-sub"
                            :class="{
                                active: currentMode === mb.id,
                                'show-sub-panel': subPanelMode === mb.id,
                            }"
                            @click="
                                toggleSubPanel(
                                    mb.id,
                                    `/${langCode}/${mb.id}`,
                                    `/${langCode}/${mb.id}?play=unlimited`
                                )
                            "
                        >
                            <component :is="mb.icon" :size="14" class="flex-shrink-0" />
                            {{ mb.label }}
                            <span class="text-muted" style="font-size: 11px">{{ mb.boards }}</span>
                        </button>
                    </div>

                    <!-- Semantic Explorer -->
                    <template v-if="showSemantic">
                        <button
                            class="sidebar-item w-full"
                            :class="{
                                active: currentMode === 'semantic',
                                'show-sub-panel': subPanelMode === 'semantic',
                            }"
                            @click="
                                toggleSubPanel(
                                    'semantic',
                                    `/${langCode}/semantic`,
                                    `/${langCode}/semantic?play=unlimited`
                                )
                            "
                        >
                            <span class="item-icon w-5 flex items-center justify-center">
                                <component
                                    v-if="semanticMode?.icon"
                                    :is="semanticMode.icon"
                                    :size="18"
                                    class="text-current"
                                />
                            </span>
                            <span class="flex-1 text-sm">{{
                                semanticMode?.label || 'Semantic Explorer'
                            }}</span>
                            <span v-if="semanticMode?.badge" class="sidebar-badge">{{
                                semanticMode.badge
                            }}</span>
                        </button>
                    </template>

                    <!-- Disabled future modes -->
                    <SidebarItem
                        v-for="mode in disabledModes"
                        :key="mode.id"
                        :icon="mode.icon"
                        :label="mode.label"
                        :badge="mode.badge"
                        disabled
                    />
                </nav>

                <!-- Sub-panel: slides out from right edge when a mode is clicked.
                     Two icon-only buttons: daily (calendar) and unlimited (infinity). -->
                <Transition name="sub-panel-slide">
                    <div v-if="subPanelMode" class="sub-panel">
                        <NuxtLink
                            :to="subPanelDailyRoute!"
                            class="sub-panel-btn sub-panel-daily"
                            :class="{
                                active: subPanelMode === currentMode && currentPlayType === 'daily',
                            }"
                            :aria-label="`Daily #${dayIdx}`"
                            :title="`Daily #${dayIdx}`"
                            @click="close()"
                        >
                            <CalendarDays :size="20" />
                            <span class="sub-panel-label">#{{ dayIdx }}</span>
                        </NuxtLink>
                        <NuxtLink
                            :to="subPanelUnlimitedRoute!"
                            class="sub-panel-btn sub-panel-unlimited"
                            :class="{
                                active:
                                    subPanelMode === currentMode && currentPlayType === 'unlimited',
                            }"
                            aria-label="Unlimited"
                            title="Unlimited"
                            @click="close()"
                        >
                            <InfinityIcon :size="20" />
                        </NuxtLink>
                    </div>
                </Transition>

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
                                @error="flagFailed = true"
                            />
                            <Globe v-else :size="18" class="text-muted" />
                        </span>
                        <span class="flex-1 text-sm text-ink">{{ languageName }}</span>
                        <ChevronRight :size="14" class="text-muted" />
                    </button>
                </div>

                <!-- You section -->
                <div class="py-4 editorial-rule">
                    <div class="mono-label px-6 pb-2">You</div>
                    <SidebarItem
                        icon="ChartNoAxesCombined"
                        label="Statistics"
                        href="/profile#statistics"
                    />
                    <SidebarItem icon="Award" label="Badges" href="/profile#badges" />
                    <SidebarItem icon="Calendar" label="Archive" :href="`/${langCode}/archive`" />
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

                <!-- Account — pinned to bottom -->
                <!-- Account — always visible, pinned to bottom -->
                <div class="mt-auto px-6 py-4 editorial-rule">
                    <!-- Logged in — click to go to profile -->
                    <NuxtLink
                        v-if="loggedIn"
                        to="/profile"
                        class="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        @click="close()"
                    >
                        <img
                            :src="authAvatarUrl || ''"
                            :alt="user?.displayName ?? 'Profile'"
                            class="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            referrerpolicy="no-referrer"
                        />
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-semibold text-ink truncate">
                                {{ user?.displayName ?? 'Player' }}
                            </div>
                            <div class="mono-label truncate text-muted">
                                {{
                                    user?.email ||
                                    '@' +
                                        (user?.displayName ?? 'player')
                                            .toLowerCase()
                                            .replace(/\s+/g, '_')
                                }}
                            </div>
                        </div>
                    </NuxtLink>

                    <!-- Logged out -->
                    <template v-else>
                        <div class="flex items-center gap-3">
                            <div
                                class="w-9 h-9 rounded-full bg-rule text-muted flex items-center justify-center heading-body text-sm flex-shrink-0"
                            >
                                ?
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-semibold text-ink">Guest</div>
                                <div class="mono-label">Sync stats, earn badges</div>
                            </div>
                        </div>
                        <button
                            class="w-full mt-3 px-4 py-2 bg-ink text-paper text-sm font-semibold rounded-md hover:opacity-90 transition-opacity"
                            @click="
                                $emit('close');
                                openLoginModal();
                            "
                        >
                            Sign in
                        </button>
                    </template>
                </div>
            </div>
        </aside>
    </Transition>
</template>

<script setup lang="ts">
import {
    Globe,
    ChevronRight,
    ChevronDown,
    Bug,
    Grid2x2,
    CalendarDays,
    Infinity as InfinityIcon,
    LogOut,
} from 'lucide-vue-next';
import { useFlag } from '~/composables/useFlag';
import { GAME_MODES_UI, getModeLabel } from '~/composables/useGameModes';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import SidebarItem from './SidebarItem.vue';
import { useAutoHeight } from '~/composables/useAutoHeight';

const props = withDefaults(
    defineProps<{
        isOpen: boolean;
        /** Auto-show sub-panel for current mode on open (triggered by subtitle click) */
        showSubPanel?: boolean;
        currentMode?: string;
        currentPlayType?: string;
        langCode?: string;
        languageName?: string;
        isRtl?: boolean;
        ui?: Record<string, any>;
    }>(),
    {
        showSubPanel: false,
        currentMode: '',
        currentPlayType: '',
        langCode: 'en',
        languageName: 'English',
        isRtl: false,
        ui: undefined,
    }
);

const emit = defineEmits<{
    close: [];
    selectMode: [mode: string];
    selectLanguage: [];
    settings: [];
}>();

const { loggedIn, user, avatarUrl: authAvatarUrl, loginWithGoogle, logout } = useAuth();
const { openLoginModal } = useLoginModal();
const route = useRoute();

const sidebarEl = ref<HTMLElement | null>(null);

// Smooth height animation when sections expand/collapse
const { elRef: playNavRef } = useAutoHeight({ duration: 200 });

const flagFailed = ref(false);
const flagSrc = computed(() => (flagFailed.value ? null : useFlag(props.langCode)));

function close() {
    emit('close');
}

// Close on Escape anywhere (not just when sidebar is focused)
function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && props.isOpen) close();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

function selectMode(mode: string) {
    // Close sidebar first so the blur backdrop is gone BEFORE the View
    // Transition captures the old page snapshot. The sidebar CSS transition
    // is 300ms; we wait for it to finish so the VT snapshot is clean.
    if (!props.isOpen) {
        // Already closed (rapid double-click) — navigate immediately
        emit('selectMode', mode);
        return;
    }
    close();
    setTimeout(() => emit('selectMode', mode), 300);
}

// On game pages, useLanguageStore() is initialized via useGamePage() and we
// read mode labels from its config.ui. On non-game pages, the store is empty
// (CLAUDE.md: "Don't use langStore outside game pages") so the page passes
// `ui` as a prop sourced from its own API response.
const langStore = useLanguageStore();

// Expand/collapse state for sidebar sections
const expandedSection = ref<'classic' | 'speed' | 'multiboard' | 'semantic' | null>(null);
const dayIdx = computed(() => langStore.todaysIdx ?? '');

// Sub-panel state: which mode's daily/unlimited panel is showing
const subPanelMode = ref<string | null>(null);
const subPanelDailyRoute = ref<string | null>(null);
const subPanelUnlimitedRoute = ref<string | null>(null);

function toggleSubPanel(mode: string, dailyRoute: string, unlimitedRoute: string) {
    if (subPanelMode.value === mode) {
        subPanelMode.value = null;
    } else {
        subPanelMode.value = mode;
        subPanelDailyRoute.value = dailyRoute;
        subPanelUnlimitedRoute.value = unlimitedRoute;
    }
}

// On sidebar open: expand the section for the current mode.
// Only show sub-panel if showSubPanel prop is true (subtitle click).
// Normal hamburger open does NOT show sub-panel.
watch(
    () => props.isOpen,
    (open) => {
        if (!open) {
            subPanelMode.value = null;
            return;
        }
        const mode = props.currentMode;
        const lc = props.langCode;

        // Always expand the relevant section so the current mode is visible
        if (MULTIBOARD_IDS.includes(mode as any)) {
            expandedSection.value = 'multiboard';
        }

        // Only show sub-panel if triggered by subtitle click (showSubPanel prop)
        if (props.showSubPanel) {
            if (MULTIBOARD_IDS.includes(mode as any)) {
                toggleSubPanel(mode, `/${lc}/${mode}`, `/${lc}/${mode}?play=unlimited`);
            } else if (mode === 'speed') {
                toggleSubPanel('speed', `/${lc}/speed`, `/${lc}/speed?play=unlimited`);
            } else if (mode === 'semantic') {
                toggleSubPanel('semantic', `/${lc}/semantic`, `/${lc}/semantic?play=unlimited`);
            }
        } else {
            subPanelMode.value = null;
        }
    }
);

const MULTIBOARD_IDS = ['dordle', 'quordle', 'octordle', 'sedecordle', 'duotrigordle'] as const;

const isMultiBoardMode = computed(() => MULTIBOARD_IDS.includes(props.currentMode as any));

const ui = computed(() => props.ui ?? langStore.config?.ui);

// Individual mode lookups for icons/labels
const speedMode = computed(() => GAME_MODES_UI.find((m) => m.id === 'speed'));
const semanticMode = computed(() => GAME_MODES_UI.find((m) => m.id === 'semantic'));

const showSpeed = computed(() => {
    const mode = speedMode.value;
    return mode?.enabled && (!mode.languages || mode.languages.includes(props.langCode));
});
const showSemantic = computed(() => {
    const mode = semanticMode.value;
    return mode?.enabled && (!mode.languages || mode.languages.includes(props.langCode));
});

// Multi-board modes with labels
const multiboardModes = computed(
    () =>
        MULTIBOARD_IDS.map((id) => {
            const mode = GAME_MODES_UI.find((m) => m.id === id);
            if (!mode || !mode.enabled) return null;
            const def = GAME_MODE_CONFIG[id];
            return {
                id,
                label: getModeLabel(mode, ui.value),
                boards: `${def.boardCount} boards`,
                icon: mode.icon,
            };
        }).filter(Boolean) as Array<{ id: string; label: string; boards: string; icon: any }>
);
// Disabled future modes (custom, party)
const disabledModes = computed(() =>
    GAME_MODES_UI.filter((m) => !m.enabled && m.id !== 'unlimited')
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
.sidebar-item.active {
    background: var(--color-paper-warm);
    border-left-color: var(--color-ink);
    font-weight: 600;
}
.sidebar-badge {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--color-accent);
    color: white;
    padding: 1px 6px;
    border-radius: 2px;
}

/* Expandable sub-items */
.sidebar-expand {
    padding-left: 47px;
}
.sidebar-sub {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 24px 7px 0;
    font-size: 13px;
    color: var(--color-ink);
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
}
.sidebar-sub:hover {
    color: var(--color-ink);
    background: var(--color-paper-warm);
}
.sidebar-sub.active {
    color: var(--color-ink);
    font-weight: 600;
    border-left: 3px solid var(--color-ink);
    padding-left: 0;
    margin-left: -3px;
}
/* Sub-panel trigger highlight — warm bg, no left bar (distinct from active) */
.sidebar-item.show-sub-panel,
.sidebar-sub.show-sub-panel {
    background: var(--color-paper-warm);
}

/* ── Sub-panel: icon-only daily/unlimited picker ──────────────────────
   Slides out from the sidebar's right edge. Two tall tap targets
   stacked vertically — calendar icon (daily) and infinity (unlimited).
   No text labels, just icons + color differentiation. */
.sub-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    right: -52px;
    width: 52px;
    display: flex;
    flex-direction: column;
    z-index: 10;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.08);
}
[dir='rtl'] .sub-panel {
    right: auto;
    left: -52px;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08);
}
.sub-panel-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-decoration: none;
    transition: all 0.15s;
    cursor: pointer;
    border: none;
}
.sub-panel-daily {
    background: var(--color-paper-warm);
    color: var(--color-muted);
}
.sub-panel-daily:hover,
.sub-panel-daily:active,
.sub-panel-daily.active {
    background: var(--color-ink);
    color: var(--color-paper);
}
.sub-panel-unlimited {
    background: var(--color-accent-soft);
    color: var(--color-accent);
}
.sub-panel-unlimited:hover,
.sub-panel-unlimited.active {
    background: var(--color-accent);
    color: white;
}
.sub-panel-label {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.06em;
    opacity: 0.6;
}

/* Sub-panel slide transition */
.sub-panel-slide-enter-active {
    transition:
        transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
        opacity 0.2s ease;
}
.sub-panel-slide-leave-active {
    transition:
        transform 0.15s ease,
        opacity 0.15s ease;
}
.sub-panel-slide-enter-from,
.sub-panel-slide-leave-to {
    transform: translateX(-12px);
    opacity: 0;
}
[dir='rtl'] .sub-panel-slide-enter-from,
[dir='rtl'] .sub-panel-slide-leave-to {
    transform: translateX(12px);
}

/* Transitions */
.sidebar-backdrop-enter-active,
.sidebar-backdrop-leave-active {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
