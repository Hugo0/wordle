<template>
    <BaseModal :visible="visible" size="sm" @close="$emit('close')">
        <div class="flex flex-col gap-0">
            <!-- Hero -->
            <div class="text-center mb-4">
                <Flame :size="36" class="text-flame mx-auto mb-2" />
                <div
                    class="font-display font-extrabold text-flame"
                    style="font-size: 48px; font-variation-settings: 'opsz' 144; line-height: 1"
                >
                    {{ currentStreak }}
                </div>
                <div class="mono-label mt-1">Day Streak</div>
                <p
                    class="text-xs text-muted italic mt-1.5"
                    style="font-family: var(--font-display)"
                >
                    Any daily mode, any language
                </p>
            </div>

            <div class="editorial-rule" />

            <!-- Calendar heatmap (shared component) -->
            <div class="py-3">
                <StreakCalendar
                    :game-results="statsStore.gameResults as Record<string, GameResult[]>"
                />
            </div>

            <div class="editorial-rule" />

            <!-- Stats row -->
            <div class="grid grid-cols-2 gap-px bg-rule">
                <div class="bg-paper text-center py-3">
                    <div
                        class="font-display font-bold text-ink"
                        style="font-size: 22px; font-variation-settings: 'opsz' 72"
                    >
                        {{ currentStreak }}
                    </div>
                    <div class="mono-label mt-0.5">Current</div>
                </div>
                <div class="bg-paper text-center py-3">
                    <div
                        class="font-display font-bold text-ink"
                        style="font-size: 22px; font-variation-settings: 'opsz' 72"
                    >
                        {{ longestStreak }}
                    </div>
                    <div class="mono-label mt-0.5">Longest</div>
                </div>
            </div>

            <!-- Sign-in CTA (logged out only) -->
            <ClientOnly>
                <button
                    v-if="!loggedIn"
                    class="w-full mt-3 px-4 py-2.5 bg-ink text-paper text-sm font-semibold rounded-md hover:opacity-90 transition-opacity"
                    @click="
                        $emit('close');
                        openLoginModal();
                    "
                >
                    Sign in to protect your streak
                </button>
            </ClientOnly>
        </div>
    </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Flame } from 'lucide-vue-next';
import type { GameResult } from '~/utils/types';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const { loggedIn } = useAuth();
const { openLoginModal } = useLoginModal();
const game = useGameStore();
const statsStore = useStatsStore();

const currentStreak = computed(() => game.effectiveStreak);
const longestStreak = computed(() => statsStore.totalStats.longest_overall_streak);

const motivationalText = computed(() => {
    const s = currentStreak.value;
    if (s === 0) return 'Win a daily puzzle to start your streak!';
    if (s === 1) return 'Great start! Come back tomorrow.';
    if (s < 7) return 'Building momentum — keep it going!';
    if (s < 30) return "You're on fire!";
    if (s < 100) return 'Incredible dedication.';
    return 'Legendary.';
});
</script>
