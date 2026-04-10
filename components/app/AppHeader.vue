<template>
    <header
        class="relative flex flex-row items-center h-[50px] px-3 lg:px-2 bg-paper dark:bg-paper editorial-rule"
        :style="{ viewTransitionName: logoMode ? 'landing-header' : 'header' }"
    >
        <!-- Left: Menu toggle + Info (game pages only) -->
        <div class="flex items-center gap-1 z-30">
            <button
                class="p-2 text-muted hover:text-ink transition-colors"
                :aria-label="sidebarOpen ? 'Close menu' : 'Open menu'"
                :aria-expanded="sidebarOpen"
                aria-controls="app-sidebar"
                @click="$emit('toggleSidebar')"
            >
                <Menu :size="20" aria-hidden="true" />
            </button>
            <button
                v-if="showHelp"
                class="p-2 text-muted hover:text-ink transition-colors"
                aria-label="How to play"
                @click="$emit('help')"
            >
                <Info :size="20" aria-hidden="true" />
            </button>
        </div>

        <!-- Center: title or logo -->
        <div class="absolute inset-x-0 text-center pointer-events-none">
            <h1
                class="text-ink font-display text-[20px] font-extrabold"
                style="font-variation-settings: 'opsz' 72"
            >
                <NuxtLink
                    :to="homeHref"
                    class="pointer-events-auto hover:opacity-80 transition-opacity"
                >
                    <template v-if="logoMode">
                        Wordle<span class="text-accent">.</span>Global
                    </template>
                    <template v-else>{{ title }}</template>
                </NuxtLink>
            </h1>
            <button
                v-if="subtitle"
                class="font-mono text-muted pointer-events-auto cursor-pointer hover:text-ink transition-colors inline-flex items-center gap-1"
                style="font-size: 10px; letter-spacing: 0.08em; background: none; border: none; padding: 0;"
                @click="$emit('openPlayType')"
            >
                <img
                    v-if="flagSrc"
                    :src="flagSrc"
                    alt=""
                    class="flag-icon"
                    style="width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1);"
                />
                {{ subtitle }}
            </button>
        </div>

        <!-- Right: Streak (game only) + Profile + Settings -->
        <div class="flex items-center gap-0.5 z-30 ms-auto">
            <GameStreakBadge
                v-if="showStreak"
                :streak="streakCount"
                :just-won="justWon"
                @click="$emit('streak')"
            />
            <button
                class="p-2 text-muted hover:text-ink transition-colors"
                :aria-label="loggedIn ? 'Profile' : 'Sign in'"
                @click="$emit('profile')"
            >
                <img
                    v-if="loggedIn && avatarUrl"
                    :src="avatarUrl"
                    alt="Profile"
                    class="w-5 h-5 rounded-full object-cover"
                    referrerpolicy="no-referrer"
                />
                <User v-else :size="20" aria-hidden="true" />
            </button>
            <button
                class="p-2 text-muted hover:text-ink transition-colors"
                aria-label="Settings"
                @click="$emit('settings')"
            >
                <Settings :size="20" aria-hidden="true" />
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
import { Info, Menu, Settings, User } from 'lucide-vue-next';

const { loggedIn, user } = useAuth();
const avatarUrl = computed(() => user.value?.avatarUrl);

withDefaults(
    defineProps<{
        title?: string;
        subtitle?: string;
        /** Flag image URL for the subtitle (shown before subtitle text). */
        flagSrc?: string;
        sidebarOpen?: boolean;
        streakCount?: number;
        justWon?: boolean;
        /** Show "Wordle.Global" logo instead of title text. */
        logoMode?: boolean;
        /** Where the center title/logo links. Defaults to /. */
        homeHref?: string;
        /** Show the help (?) button. Game pages only. */
        showHelp?: boolean;
        /** Show the streak badge. Game pages only. */
        showStreak?: boolean;
    }>(),
    {
        title: 'Wordle',
        subtitle: undefined,
        sidebarOpen: false,
        streakCount: 0,
        justWon: false,
        logoMode: false,
        homeHref: '/',
        showHelp: true,
        showStreak: true,
    }
);

defineEmits<{
    help: [];
    settings: [];
    streak: [];
    toggleSidebar: [];
    profile: [];
    /** Subtitle clicked — open sidebar with sub-panel for current mode's play type */
    openPlayType: [];
}>();
</script>
