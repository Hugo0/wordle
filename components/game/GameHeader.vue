<template>
    <header
        class="relative flex flex-row items-center h-[50px] px-3 lg:px-2 bg-paper dark:bg-paper editorial-rule"
    >
        <!-- Left: Menu toggle + Info -->
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
                class="p-2 text-muted hover:text-ink transition-colors"
                aria-label="How to play"
                @click="$emit('help')"
            >
                <Info :size="20" aria-hidden="true" />
            </button>
        </div>

        <!-- Center: Game title -->
        <div class="absolute inset-x-0 text-center pointer-events-none">
            <h1
                class="text-ink font-display text-[20px] font-extrabold"
                style="font-variation-settings: 'opsz' 72"
            >
                <NuxtLink to="/" class="pointer-events-auto hover:opacity-80 transition-opacity">
                    {{ title }}
                </NuxtLink>
            </h1>
            <p
                v-if="subtitle"
                class="font-mono text-muted"
                style="font-size: 10px; letter-spacing: 0.08em"
            >
                {{ subtitle }}
            </p>
        </div>

        <!-- Right: Stats + Settings -->
        <div class="flex items-center gap-1 z-30 ml-auto">
            <button
                class="p-2 text-muted hover:text-ink transition-colors"
                aria-label="Statistics"
                @click="$emit('stats')"
            >
                <BarChart2 :size="20" aria-hidden="true" />
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
import { Info, Menu, BarChart2, Settings } from 'lucide-vue-next';

withDefaults(
    defineProps<{
        title?: string;
        subtitle?: string;
        sidebarOpen?: boolean;
    }>(),
    {
        title: 'Wordle',
        subtitle: undefined,
        sidebarOpen: false,
    }
);

defineEmits<{
    help: [];
    stats: [];
    settings: [];
    toggleSidebar: [];
}>();
</script>
