<template>
    <button
        v-if="streak > 0 || justWon || frozen"
        class="flex items-start gap-0 p-1.5 rounded-full transition-colors"
        :class="frozen ? 'hover:bg-blue-50 dark:hover:bg-blue-950/30' : 'hover:bg-flame-soft'"
        aria-label="Streak"
        @click="$emit('click')"
    >
        <!-- Wrapper for flame + spark pseudo-elements -->
        <span
            class="flame-wrap"
            :class="{
                'flame-sparks': streak >= 7 && !igniting && !frozen,
                'flame-sparks-intense': igniting,
            }"
        >
            <Flame
                :size="18"
                class="relative transition-colors duration-500"
                :class="{
                    'text-flame': !frozen,
                    'flame-flicker': streak >= 7 && !igniting && !frozen,
                    'flame-ignite': igniting,
                    'text-blue-400': frozen,
                    'flame-frozen': frozen,
                }"
                @animationend="onAnimEnd"
            />
        </span>
        <span
            v-if="streak > 0 || frozen"
            class="font-mono font-semibold tabular-nums -ms-0.5 transition-colors duration-500"
            :class="frozen ? 'text-blue-400' : 'text-flame'"
            style="font-size: 10px; line-height: 1; margin-top: 1px"
        >
            {{ frozen ? prevStreak : streak }}
        </span>
    </button>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Flame } from 'lucide-vue-next';

const props = defineProps<{
    streak: number;
    justWon: boolean;
}>();

defineEmits<{ click: [] }>();

const igniting = ref(false);
const frozen = ref(false);
const prevStreak = ref(0);

// When streak drops to 0 from a positive value, show frozen state briefly
watch(
    () => props.streak,
    (newVal, oldVal) => {
        if (oldVal > 0 && newVal === 0) {
            prevStreak.value = oldVal;
            frozen.value = true;
            // Clear frozen state after 5 seconds
            setTimeout(() => {
                frozen.value = false;
            }, 5000);
        }
    }
);

watch(
    () => props.justWon,
    (won) => {
        if (won) {
            frozen.value = false; // clear frozen if they won again
            igniting.value = false;
            nextTick(() => {
                igniting.value = true;
            });
        }
    }
);

function onAnimEnd(e: AnimationEvent) {
    // Only handle the ignite animation end, not flicker
    if (e.animationName === 'flame-ignite') {
        igniting.value = false;
    }
}
</script>

<style scoped>
.flame-frozen {
    filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.4));
    animation: flame-freeze 2s ease-in-out infinite;
}

@keyframes flame-freeze {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.3)); }
    50% { filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.5)); }
}
</style>
