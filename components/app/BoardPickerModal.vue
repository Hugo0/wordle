<!--
    BoardPickerModal — multi-board mode picker with daily/unlimited per mode.

    Opens when clicking "Multi-Board" in the sidebar. Shows Dordle through
    Duotrigordle with board count and daily/unlimited links per mode.
-->

<template>
    <SharedBaseModal
        :visible="visible"
        size="lg"
        align="top"
        no-padding
        no-close-button
        aria-label="Choose a multi-board mode"
        @close="$emit('close')"
    >
        <div class="px-6 pt-6 pb-3">
            <h2 class="heading-section text-xl text-ink">Multi-Board</h2>
            <p class="text-sm text-muted mt-1">
                Same rules, more boards. Pick your challenge.
            </p>
        </div>

        <div class="border-t border-rule">
            <div
                v-for="mode in modes"
                :key="mode.id"
                class="flex items-center gap-4 px-6 py-4 border-b border-rule"
            >
                <!-- Icon -->
                <div class="w-10 h-10 flex items-center justify-center border border-rule bg-paper-warm flex-shrink-0">
                    <component :is="mode.icon" :size="20" class="text-ink" />
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                    <div class="heading-section text-base text-ink">{{ mode.label }}</div>
                    <div class="text-xs text-muted mt-0.5">{{ mode.boards }} boards &middot; {{ mode.maxGuesses }} guesses</div>
                </div>

                <!-- Daily / Unlimited links -->
                <div class="flex gap-2 flex-shrink-0">
                    <NuxtLink
                        :to="`/${langCode}/${mode.id}`"
                        class="text-btn text-xs"
                        @click.native="$emit('close')"
                    >
                        Daily
                    </NuxtLink>
                    <span class="text-rule">&middot;</span>
                    <NuxtLink
                        :to="`/${langCode}/${mode.id}?play=unlimited`"
                        class="text-btn text-xs text-accent"
                        @click.native="$emit('close')"
                    >
                        Unlimited
                    </NuxtLink>
                </div>
            </div>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GAME_MODES_UI, getModeLabel } from '~/composables/useGameModes';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

const props = defineProps<{
    visible: boolean;
    langCode: string;
    ui?: Record<string, any>;
}>();

defineEmits<{ close: [] }>();

const MULTIBOARD_IDS = ['dordle', 'quordle', 'octordle', 'sedecordle', 'duotrigordle'] as const;

const modes = computed(() =>
    MULTIBOARD_IDS
        .map((id) => {
            const uiMode = GAME_MODES_UI.find((m) => m.id === id);
            if (!uiMode?.enabled) return null;
            const def = GAME_MODE_CONFIG[id];
            return {
                id,
                label: getModeLabel(uiMode, props.ui),
                boards: def.boardCount,
                maxGuesses: def.maxGuesses,
                icon: uiMode.icon,
            };
        })
        .filter(Boolean) as Array<{ id: string; label: string; boards: number; maxGuesses: number; icon: any }>
);
</script>
