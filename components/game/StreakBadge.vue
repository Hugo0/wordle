<template>
    <button
        v-if="streak > 0 || justWon"
        class="flex items-start gap-0 p-1.5 rounded-full transition-colors hover:bg-flame-soft"
        aria-label="Streak"
        @click="$emit('click')"
    >
        <!-- Wrapper for flame + spark pseudo-elements -->
        <span
            class="flame-wrap"
            :class="{
                'flame-sparks': streak >= 7 && !igniting,
                'flame-sparks-intense': igniting,
            }"
        >
            <Flame
                :size="18"
                class="text-flame relative"
                :class="{
                    'flame-flicker': streak >= 7 && !igniting,
                    'flame-ignite': igniting,
                }"
                @animationend="onIgniteEnd"
            />
        </span>
        <span
            v-if="streak > 0"
            class="font-mono font-semibold text-flame tabular-nums -ms-0.5"
            style="font-size: 10px; line-height: 1; margin-top: 1px"
        >
            {{ streak }}
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

watch(
    () => props.justWon,
    (won) => {
        if (won) {
            igniting.value = false;
            nextTick(() => {
                igniting.value = true;
            });
        }
    }
);

function onIgniteEnd() {
    igniting.value = false;
}
</script>
