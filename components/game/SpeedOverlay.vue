<template>
    <!-- Arcade feedback overlay — renders float-up events over the game board -->
    <div class="fixed inset-0 z-30 pointer-events-none overflow-hidden">
        <TransitionGroup name="arcade-event">
            <div
                v-for="event in events"
                :key="event.id"
                class="absolute left-1/2 -translate-x-1/2 text-center"
                :class="eventPositionClass(event)"
            >
                <!-- Solve: word + reaction + bonus -->
                <template v-if="event.type === 'solve'">
                    <div class="arcade-solve">
                        <span class="font-display font-bold text-lg uppercase text-ink">
                            {{ event.word }}
                        </span>
                        <span class="text-sm ml-2">{{ event.emoji }}</span>
                    </div>
                    <div class="flex items-center justify-center gap-3 mt-1">
                        <span class="font-mono text-xs font-bold text-correct">
                            +{{ (event.bonus || 0) / 1000 }}s
                        </span>
                        <span class="font-mono text-xs font-bold text-ink">
                            +{{ event.points }}
                        </span>
                        <span
                            v-if="(event.combo || 0) > 1"
                            class="font-mono text-[10px] font-bold text-accent"
                        >
                            {{ event.combo }}x
                        </span>
                    </div>
                </template>

                <!-- Fail: word reveal + penalty -->
                <template v-else-if="event.type === 'fail'">
                    <div class="arcade-fail">
                        <span class="font-display font-bold text-lg uppercase text-accent">
                            {{ event.word }}
                        </span>
                        <span class="text-sm ml-2">{{ event.emoji }}</span>
                    </div>
                    <div class="font-mono text-xs font-bold text-accent mt-1">
                        -{{ (event.penalty || 0) / 1000 }}s
                    </div>
                </template>

                <!-- Milestone -->
                <template v-else-if="event.type === 'milestone'">
                    <div class="arcade-milestone">
                        <span class="text-lg">{{ event.emoji }}</span>
                        <span class="font-mono font-bold text-sm text-correct tracking-wider">
                            {{ event.label }}
                        </span>
                    </div>
                </template>

                <!-- Combo -->
                <template v-else-if="event.type === 'combo'">
                    <div class="arcade-combo">
                        <span class="text-lg">{{ event.emoji }}</span>
                        <span class="font-mono font-bold text-sm text-accent tracking-wider">
                            {{ event.label }}
                        </span>
                    </div>
                </template>
            </div>
        </TransitionGroup>

        <!-- Screen flash on solve/fail -->
        <Transition name="screen-flash">
            <div
                v-if="flashType"
                :key="flashKey"
                class="absolute inset-0"
                :class="
                    flashType === 'solve'
                        ? 'bg-correct/8'
                        : flashType === 'fail'
                          ? 'bg-accent/10'
                          : 'bg-correct/12'
                "
            />
        </Transition>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    events: Array<{
        id: number;
        type: string;
        word?: string;
        guesses?: number;
        points?: number;
        bonus?: number;
        penalty?: number;
        combo?: number;
        milestone?: number;
        label?: string;
        emoji?: string;
    }>;
    lastEvent: string;
}>();

const flashType = ref<string | null>(null);
const flashKey = ref(0);

watch(
    () => props.lastEvent,
    (event) => {
        if (event === 'none') return;
        flashType.value = event;
        flashKey.value++;
        setTimeout(() => {
            flashType.value = null;
        }, 400);
    }
);

function eventPositionClass(event: (typeof props.events)[number]): string {
    if (event.type === 'milestone' || event.type === 'combo') {
        return 'top-[35%]'; // center of screen
    }
    return 'top-[15%]'; // above the board
}
</script>

<style scoped>
.arcade-event-enter-active {
    transition: all 0.3s ease-out;
}
.arcade-event-leave-active {
    transition: all 0.8s ease-in;
}
.arcade-event-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px) scale(0.8);
}
.arcade-event-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-40px);
}

.screen-flash-enter-active {
    transition: opacity 0.1s ease-out;
}
.screen-flash-leave-active {
    transition: opacity 0.4s ease-in;
}
.screen-flash-enter-from,
.screen-flash-leave-to {
    opacity: 0;
}

.arcade-solve,
.arcade-fail {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 16px;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.arcade-milestone,
.arcade-combo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 24px;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
</style>
